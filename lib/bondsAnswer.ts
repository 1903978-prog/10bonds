import { NextResponse } from "next/server";
import { allow, clientIp } from "@/lib/rateLimit";
import { currentOutlierSd, loadBondsFor, loadOutliers } from "@/lib/bonds";
import { cleanSd } from "@/lib/outliers";
import { parseFilter } from "@/lib/bondFilter";
import { shapeForTier, tierFeatures } from "@/lib/tiers";
import { alternativesFor } from "@/lib/alternatives";
import { lgdOf } from "@/lib/seniority";
import { bondNotch } from "@/lib/ratings";
import type { PublicBond, RankedBond, Tier } from "@/lib/types";
import { LIMITS } from "@/lib/limits";
import { currentUser } from "@/lib/currentUser";
import { publicQuota, consumeSearch, refundSearch } from "@/lib/searchQuota";
import { parseShifts, parseWeight } from "@/lib/riskPremium/bands";
import { pickRanking } from "@/lib/pickRanking";
import { featuresFor } from "@/lib/planFeatures";
import { exclusionsOrNone, excludedBy } from "@/lib/blacklist";
import { coherentBuild, frontierFor, FrontierPending, gapOf } from "@/lib/frontierCache";
import { bandTableOf, engineOf, methodologyFor, usesBands } from "@/lib/methodologyChoice";
import { activeFallback } from "@/lib/enginePolicy";
import { buildManifest } from "@/lib/runManifest";
import { listLifeLoss } from "@/lib/expectedLoss";
import { pdOf } from "@/lib/tiers";
import { bundCurve } from "@/lib/riskPremium/benchmark";
import { spreadDiagnostic } from "@/lib/spreadDiagnostics";
import { lifeYears } from "@/lib/lifeYears";
import { END_POLICY, checkList, creditProfile, withoutListEdits, factsOf, activePolicy } from "@/lib/coherence";
import type { CoherentFrontier } from "@/lib/coherentFrontier";
import { exactFrontier } from "@/lib/exactFrontier";
import { portfolioPool, withinRisk } from "@/lib/ranking";
import { bandLiveOnce, bandHorizon, bandNumber, bandStored, bandTerm, liveKey, lowMemory, metaOfSel, RowSlots, type BandMeta } from "@/lib/riskBandsAnswer";
import { isSpecConfig } from "@/lib/riskBandsServe";
import { liveBand, rememberLive } from "@/lib/riskBandsLive";
import type { BondFilter } from "@/lib/bondFilter";
import type { BondSource } from "@/lib/bonds";
import type { BandConfig as RiskBandsConfig, RiskBand } from "@/lib/riskBands";

function clampParam(raw: string | null, { min, max, initial }: { min: number; max: number; initial: number }) {
  const n = raw === null ? NaN : Number(raw);
  if (!Number.isFinite(n)) return initial;
  return Math.min(max, Math.max(min, n));
}

/** The two ends of the slider follow the end rules (lib/coherentFrontier.ts END_POLICY), not the rating window. */
// The alphabetical numbering is the same for every request on the same bonds: worked out once per copy of the table.
const collator = new Intl.Collator("en");
const places = new WeakMap<object, Map<string, number>>();
function alphabeticalPlaces(bonds: PublicBond[]): Map<string, number> {
  let hit = places.get(bonds);
  if (!hit) {
    const abc = [...bonds].sort((a, b) => collator.compare(a.issuer ?? a.name, b.issuer ?? b.name) || collator.compare(a.name, b.name) || collator.compare(a.isin, b.isin));
    hit = new Map(abc.map((b, i) => [b.isin, i + 1]));
    places.set(bonds, hit);
  }
  return hit;
}

const isEnd = (pts: { end?: string; isins: string[] }[], rows: RankedBond[]) => {
  const k = rows.map((r) => r.isin).sort().join();
  return pts.some((p) => p.end && p.isins.join() === k);
};

/** A step of the progressive band search (app/api/bonds/band-live): the list and figures to answer with instead of looking one up. */
export type BandStep = { results: RankedBond[]; meta: BandMeta | null; /** No list exists for this band. */ none?: RiskBand; /** Steps after the first do not use up another search. */ skipQuota?: boolean };

export async function answer(req: Request, step?: BandStep): Promise<Response> {
  // Sliders send one request per move and a waiting search asks again every few seconds: signed-in accounts (which have
  // their own search allowance) are not limited here, visitors get 600 a minute per address.
  const signedIn = await currentUser();
  if (!step && !signedIn && !allow(`bonds:${clientIp(req)}`, 600, 60_000))
    return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429, headers: { "Retry-After": "5" } });
  const url = new URL(req.url);
  const duration = clampParam(url.searchParams.get("duration"), LIMITS.duration);
  const ytm = clampParam(url.searchParams.get("ytm"), LIMITS.ytm);
  const risk = Math.round(clampParam(url.searchParams.get("risk"), LIMITS.risk));

  // The tier comes from the signed-in account (server side). Other views can be previewed on sample data only.
  // An account whose e-mail is still unconfirmed after the grace period searches like a visitor.
  const user = signedIn?.confirmBlocked ? null : signedIn;
  // Outlier rule (lib/outliers.ts): users get the saved number of standard deviations; the admin can try another (os).
  const liveSd = await currentOutlierSd();
  const trySd = user?.isAdmin && url.searchParams.get("os") ? cleanSd(url.searchParams.get("os")) : null;
  const sd = trySd ?? liveSd;
  let data;
  try {
    data = await loadBondsFor(parseFilter(url.searchParams), sd);
  } catch {
    return NextResponse.json({ error: "Bond data is not available right now. Please try again later." }, { status: 503 });
  }
  let tier: Tier = user ? user.plan : "visitor";
  const preview = url.searchParams.get("preview");
  if (data.source === "sample" && (preview === "free" || preview === "plus" || preview === "premium")) tier = preview;

  // What this plan includes: the admin's feature table (/admin/features). A sample preview uses the default ticks.
  const own = !!user && tier === user.plan;
  const features = own ? await featuresFor(user) : tierFeatures(tier);
  const has = (k: (typeof features)[number]) => features.includes(k);

  // Daily allowance per plan (Free: limited unless the table says unlimited; see SEARCH_LIMITS). Visitors keep their short preview.
  const usage = own && !step?.skipQuota ? await consumeSearch(user!, "portfolio", has("unlimited_portfolio")) : null;
  if (usage && !usage.allowed)
    return NextResponse.json({ error: "Daily search limit reached.", limitReached: publicQuota(usage), tier }, { status: 402, headers: { "Cache-Control": "no-store" } });
  const tryW = user?.isAdmin ? parseWeight(url.searchParams.get("rw")) : null;
  // The bonds and issuers this customer excluded never enter the list.
  const excl = own && has("blacklist") && !(user?.isAdmin && url.searchParams.get("bl") === "0") ? await exclusionsOrNone(user!.id) : [];
  const skip = excludedBy(excl);
  // A slider position (guard=1): the exact frontier's list for this target (lib/exactFrontier.ts), the one on the chart.
  const filter = parseFilter(url.searchParams);
  const exclusionKey = skip ? `u${user!.id}:${excl.map((e) => `${e.kind}:${e.value}`).sort().join(",")}` : "";
  // Everyone searches the methodology chosen at /admin/methodology; the admin can add m=1..5 to compare.
  const meth = await methodologyFor(url.searchParams.get("m"), user?.isAdmin === true);
  const method = engineOf(meth);
  const bandCfg = usesBands(meth) ? await bandTableOf(meth) : null;
  // The spread-rules methodology is the coherent optimiser (lib/coherentFrontier.ts): built in the background, 202 until ready.
  // A customer's exclusions get their own coherent frontier (built in the background, keyed by the excluded set).
  let coherent: CoherentFrontier | null = null;
  let frontierResults: RankedBond[] | null = null;
  let nearest = false;
  // Risk-band position (owner, 27/10/2026): the stored portfolio of band n, or the progressive search when none applies (lib/riskBandsAnswer.ts).
  const bandN = bandCfg ? bandNumber(url.searchParams.get("band")) : null;
  let bandMeta: BandMeta | null = null;
  let bandNone: RiskBand | null = null;
  // An exact year outside the three terms is a Plus feature ("exact_year"); its lists are only read from storage.
  const exactYear = !!bandN && !step && !bandTerm(duration) && bandHorizon(duration);
  if (exactYear && !has("exact_year")) {
    if (usage) await refundSearch(user!, usage);
    return NextResponse.json({ error: "Picking an exact year is included in Plus.", upgrade: true, tier }, { status: 403, headers: { "Cache-Control": "no-store" } });
  }
  if (bandN && (step || bandTerm(duration) || exactYear)) {
    if (step) { frontierResults = step.results; bandMeta = step.meta; bandNone = step.none ?? null; } else {
      try {
        const found = await bandStored(data, filter, duration, bandN, skip, exclusionKey, bandCfg!);
        // No public interaction solves: a list that is not stored yet (exact years, and the spec's standard lists on live data) is answered "being prepared". Only a customer's own exclusions are solved.
        if (!found && !skip && (exactYear || (isSpecConfig(bandCfg!) && data.source === "live"))) {
          if (usage) await refundSearch(user!, usage);
          return NextResponse.json({ error: "This portfolio is being prepared. Please try again in a few minutes." }, { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "60" } });
        }
        if (!found && url.searchParams.get("stream") === "1") return bandStream(req, data, filter, duration, bandN, skip, exclusionKey, usage, user, bandCfg!);
        const b = found ?? (await bandLiveOnce(data, filter, duration, bandN, skip, exclusionKey, bandCfg!));
        if (b.kind === "list") { frontierResults = b.results; bandMeta = b.meta; } else bandNone = b.band;
      } catch (e) {
        console.error("[bands] answer failed:", (e as Error).message);
        if (usage) await refundSearch(user!, usage);
        return NextResponse.json({ error: "This portfolio could not be loaded. Please try again." }, { status: 503, headers: { "Cache-Control": "no-store" } });
      }
    }
  }
  const bandMode = bandMeta !== null || bandNone !== null;
  // Spread rules always use the coherent frontier, never the plain ranking below (which knows none of the rules), whether or not the page asked for guard=1.
  if (!bandMode && (url.searchParams.get("guard") === "1" || method === "spread")) {
    // A list still being read back from the database is waited for (up to 2.5 s) instead of answered "pending", which would make the page wait 3 s before asking again.
    if (method === "spread" && !skip) await Promise.race([coherentBuild(data, filter, duration).catch(() => {}), new Promise((r) => setTimeout(r, 2500))]);
    try {
      const fr = method === "spread" ? frontierFor(data, filter, duration, "spread", skip ? { key: exclusionKey, fn: skip } : null) : skip ? exactFrontier(data.bonds.filter((b) => !skip(b)), duration, gapOf(method)) : frontierFor(data, filter, duration, method);
      if (method === "spread") coherent = fr as CoherentFrontier;
      frontierResults = fr.at(ytm)?.rows ?? [];
      // Never empty: if the exact point is missing or fails the check below, use the nearest frontier point that passes.
      if (method === "spread") {
        const pts = (fr as CoherentFrontier).points.filter((p) => p.rows.length > 0);
        const ok = (rows: RankedBond[]) => checkList(rows.map((r) => factsOf(r)), isEnd(pts, rows) ? END_POLICY : (coherent?.policy ?? activePolicy()), LIMITS.risk.max).every((c) => c.ok);
        if (!frontierResults.length || !ok(frontierResults)) {
          const near = [...pts].sort((a, b) => Math.abs(a.ytm - ytm) - Math.abs(b.ytm - ytm)).find((p) => ok(p.rows));
          if (near) { frontierResults = near.rows; nearest = true; }
        }
      }
    } catch (e) {
      if (e instanceof FrontierPending) return NextResponse.json({ pending: true, status: "PENDING" }, { status: 202, headers: { "Cache-Control": "no-store" } });
      throw e;
    }
  }
  // Mandatory last check: a list that breaks any rule is never returned (the page, chart data and Excel all come from this list).
  // No relaxing to reach ten bonds: it is reported as unavailable.
  if (coherent && frontierResults?.length) {
    const bad = checkList(frontierResults.map((r) => factsOf(r)), isEnd(coherent.points, frontierResults) ? END_POLICY : coherent.policy, LIMITS.risk.max).filter((c) => !c.ok);
    if (bad.length) {
      console.error("coherent list refused", bad.map((c) => `${c.rule}: ${c.detail}`).join("; "));
      frontierResults = [];
    }
  }
  if (bandMode && !frontierResults?.length) {
    // No list of 10 exists for this band: say so, and do not use up a search.
    const quota = usage ? await refundSearch(user!, usage) : null;
    return NextResponse.json(
      { ...shapeForTier([], tier, features, user?.isAdmin === true), features: withoutListEdits(features), excluded: false, quota: quota ? publicQuota(quota) : null, source: data.source, scanned: data.bonds.length, asOf: data.asOf, durationBand: portfolioPool(withinRisk(data.bonds, LIMITS.risk.max), duration).band, inputs: { duration, ytm, risk }, nearest: false, status: "INFEASIBLE", band: bandNone ? { k: bandN, min: bandNone.min, max: bandNone.max, none: true } : undefined },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
  if (coherent && !frontierResults?.length && activeFallback() === "none") {
    // Paper 7.1: no optimised list means no list. Same payload shape as a normal answer, with no rows, so the page shows its "not available" state.
    // Such an answer does not use up a search (owner decision 27/10/2026).
    const quota = usage ? await refundSearch(user!, usage) : null;
    return NextResponse.json(
      { ...shapeForTier([], tier, features, user?.isAdmin === true), features: withoutListEdits(features), excluded: false, quota: quota ? publicQuota(quota) : null, source: data.source, scanned: data.bonds.length, asOf: data.asOf, durationBand: portfolioPool(withinRisk(data.bonds, LIMITS.risk.max), duration).band, inputs: { duration, ytm, risk }, nearest: false, status: "INFEASIBLE" },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
  const { results, band, engine } = frontierResults?.length
    ? {
        results: frontierResults,
        band: portfolioPool(withinRisk(data.bonds, LIMITS.risk.max), duration).band,
        engine: { method: "current" as const, version: null, weight: 0, liveWeight: 0 },
      }
    : await pickRanking(data.bonds, data.asOf, duration, ytm, risk, tryW, tryW !== null ? parseShifts(url.searchParams.get("rp")) : null, skip);
  // Honest state of the answer (quant correction, brief section 11): READY = exact optimised list; UPDATING = optimised list saved for slightly
  // older prices; NEAREST_POINT = the asked position had no list, the nearest optimised one is shown; FALLBACK_RANKING = no optimised list at
  // all, the plain ranker (which knows none of the optimiser's rules) filled in; INFEASIBLE = nothing (only when the fallback is switched off).
  const status = bandMeta ? (bandMeta.source === "live" ? (bandMeta.optimal ? "OPTIMAL" : bandMeta.phase === "done" ? "READY" : "IMPROVING") : bandMeta.stale ? "UPDATING" : "READY") : coherent ? (frontierResults?.length ? (nearest ? "NEAREST_POINT" : coherent.stale ? "UPDATING" : "READY") : "FALLBACK_RANKING") : undefined;
  const outliers = user?.isAdmin
    ? { sd, liveSd, count: (await loadOutliers(sd)).length, liveCount: (await loadOutliers(liveSd)).length }
    : undefined;
  // Every bond searched numbered 1..N in alphabetical order (issuer, then name, then ISIN); the show on the page counts up to each pick's number.
  const place = alphabeticalPlaces(data.bonds);
  const found = results.slice(0, 10).map((b) => place.get(b.isin) ?? 0);
  // Admin only (internal audit): complete record of this run.
  const manifest = user?.isAdmin
    ? (() => {
        const avg = (f: (b: RankedBond) => number | null | undefined) => (results.length ? results.reduce((s, b) => s + (f(b) ?? 0), 0) / results.length : null);
        const bund = bundCurve(data.bonds, data.asOf).points;
        return buildManifest({
          spreadDiagnostics: Object.fromEntries(results.map((b) => [b.isin, spreadDiagnostic({ notch: bondNotch(b), currency: b.currency, years: lifeYears(b), ytm: b.grossYtm }, bund)])),
          src: data, inputs: { duration, ytm, risk, filter }, status, isins: results.map((b) => b.isin), cert: coherent?.cert,
          outputs: { ytm: avg((b) => b.grossYtm), duration: avg((b) => b.modifiedDuration), expectedLossPct: listLifeLoss(results.map(pdOf), results.map(lgdOf)) },
        });
      })()
    : undefined;
  // With "swap": the bonds left out, to swap into the list; with "why_table" also why each one is out.
  const pool = skip ? data.bonds.filter((b) => !skip(b)) : data.bonds;
  // Under the coherence rules a swap or an added bond could break them, so neither is offered there (admin only anyway).
  const alternatives = coherent || bandMode ? undefined : has("swap") || has("add_left_out") ? alternativesFor(pool, results, duration, risk, has("why_table"), undefined, user?.isAdmin === true) : undefined;
  return NextResponse.json(
    { ...shapeForTier(results, tier, features, user?.isAdmin === true), features: coherent || bandMode ? withoutListEdits(features) : features, excluded: skip !== null && !coherent && !bandMode, band: bandMeta ?? undefined, coherence: coherent && user?.isAdmin ? { ...creditProfile(results.map((r) => factsOf(r))), checks: checkList(results.map((r) => factsOf(r)), coherent.policy).map((c) => ({ rule: c.rule, ok: c.ok, detail: c.detail })), policy: coherent.cert.policy, cert: coherent.cert } : undefined, alternatives, manifest, found: bandMode ? undefined : found, quota: usage ? publicQuota(usage) : null, source: data.source, scanned: data.bonds.length, issuers: new Set(data.bonds.map((b) => b.issuer ?? b.name)).size, asOf: data.asOf, durationBand: band, inputs: { duration, ytm, risk }, nearest, status, engine, outliers, ...(user?.isAdmin ? { methodology: meth } : {}) },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/**
 * The progressive band search as a stream of answers (one JSON object per line, application/x-ndjson): each line is a complete normal answer
 * for the list at that moment, plus `step` (what changed), so the page replaces rows in place. Yield never drops and expected loss never rises
 * from one line to the next; the last line is "exact" (labelled optimal when proven) or "done". The search is counted once, by the first call.
 */
function bandStream(req: Request, data: BondSource, filter: BondFilter, duration: number, n: number, skip: ((b: PublicBond) => boolean) | null, exclusionKey: string, usage: Awaited<ReturnType<typeof consumeSearch>> | null, user: Awaited<ReturnType<typeof currentUser>>, cfg: RiskBandsConfig): Response {
  const enc = new TextEncoder();
  let cancelled = false;
  const body = new ReadableStream<Uint8Array>({
    async start(ctl) {
      const send = async (st: BandStep, step: Record<string, unknown>, left: typeof usage = usage) => {
        const res = await answer(req, st);
        const json = await res.json();
        ctl.enqueue(enc.encode(JSON.stringify({ ...json, ...(left ? { quota: publicQuota(left) } : {}), step }) + "\n"));
      };
      try {
        const band = cfg.bands[n - 1];
        const pool = skip ? data.bonds.filter((b) => !skip(b)) : data.bonds;
        let any = false;
        const slots = new RowSlots();
        for await (const st of liveBand(pool, duration, band, cfg, { exact: lowMemory() })) {
          if (cancelled) return;
          any = true;
          const { rows, changed } = slots.next(st.sel);
          await send({ results: rows, meta: metaOfSel(band, st.sel, st.optimal, { phase: st.phase }), skipQuota: true }, { phase: st.phase, out: st.out, in: st.in, changed });
          if (st.phase === "exact" || st.phase === "done") rememberLive(liveKey(data, filter, duration, n, exclusionKey, cfg), { sel: st.sel, stat: st.stat, optimal: st.optimal });
        }
        if (!any) {
          const after = usage && user ? await refundSearch(user, usage) : usage;
          await send({ results: [], meta: null, none: band, skipQuota: true }, { phase: "none" }, after);
        }
      } catch (e) {
        console.error("[bands] stream failed:", (e as Error).message);
        ctl.enqueue(enc.encode(JSON.stringify({ error: "This portfolio could not be loaded. Please try again." }) + "\n"));
      } finally {
        try { ctl.close(); } catch {}
      }
    },
    cancel() { cancelled = true; },
  });
  return new Response(body, { headers: { "Content-Type": "application/x-ndjson", "Cache-Control": "no-store", "X-Accel-Buffering": "no" } });
}
