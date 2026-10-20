import { NextResponse } from "next/server";
import { allow, clientIp } from "@/lib/rateLimit";
import { loadBondsFor } from "@/lib/bonds";
import { parseFilter } from "@/lib/bondFilter";
import { rankBonds } from "@/lib/ranking";
import { shapeForTier } from "@/lib/tiers";
import { alternativesFor } from "@/lib/alternatives";
import { simulateCached } from "@/lib/monteCarlo";
import { bondRisk } from "@/lib/ratings";
import type { Tier } from "@/lib/types";
import { LIMITS } from "@/lib/limits";
import { currentUser } from "@/lib/currentUser";
import { publicQuota, consumeSearch } from "@/lib/searchQuota";
import { liveRiskConfig } from "@/lib/riskPremium/store";
import { rankRiskAdjusted } from "@/lib/riskPremium/rank";
import { contextFor } from "@/lib/riskPremium/shadow";

export const dynamic = "force-dynamic";

function clampParam(raw: string | null, { min, max, initial }: { min: number; max: number; initial: number }) {
  const n = raw === null ? NaN : Number(raw);
  if (!Number.isFinite(n)) return initial;
  return Math.min(max, Math.max(min, n));
}

export async function GET(req: Request) {
  // Sliders send one request per move; 240 a minute per address (both bond routes together) is far above normal use.
  if (!allow(`bonds:${clientIp(req)}`, 240, 60_000))
    return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
  const url = new URL(req.url);
  const duration = clampParam(url.searchParams.get("duration"), LIMITS.duration);
  const ytm = clampParam(url.searchParams.get("ytm"), LIMITS.ytm);
  const risk = Math.round(clampParam(url.searchParams.get("risk"), LIMITS.risk));

  let data;
  try {
    data = await loadBondsFor(parseFilter(url.searchParams));
  } catch {
    return NextResponse.json({ error: "Bond data is not available right now. Please try again later." }, { status: 503 });
  }

  // The tier comes from the signed-in account (server side). Other views can be previewed on sample data only.
  const user = await currentUser();
  if (user?.confirmBlocked) return NextResponse.json({ error: "Please confirm your e-mail address first.", confirmBlocked: true }, { status: 403, headers: { "Cache-Control": "no-store" } });
  let tier: Tier = user ? user.plan : "visitor";
  const preview = url.searchParams.get("preview");
  if (data.source === "sample" && (preview === "free" || preview === "plus" || preview === "premium")) tier = preview;

  // Weekly allowance per plan (Free: limited; Plus and Premium: see SEARCH_LIMITS). Visitors keep their short preview.
  const usage = user && tier === user.plan ? await consumeSearch(user, "portfolio") : null;
  if (usage && !usage.allowed)
    return NextResponse.json({ error: "Weekly search limit reached.", limitReached: publicQuota(usage), tier }, { status: 402, headers: { "Cache-Control": "no-store" } });
  // Risk-adjusted ranking (lib/riskPremium) only when the admin has switched it on; otherwise, and wherever its curve
  // does not apply (no eligible bond at this horizon), the current ranking. Every answer names the method it used.
  let ranked = rankBonds(data.bonds, duration, ytm, undefined, risk);
  let engine: { method: "current" | "risk-adjusted"; version: string | null } = { method: "current", version: null };
  const live = await liveRiskConfig().catch(() => null);
  if (live?.mode === "on" && live.curve) {
    const r = rankRiskAdjusted(data.bonds, duration, ytm, contextFor(data.bonds, data.asOf, live.curve, live.reviews), undefined, risk);
    if (r.results.length) {
      ranked = { results: r.results, band: r.band };
      engine = { method: "risk-adjusted", version: r.version };
    }
  }
  const { results, band } = ranked;
  // A real Monte Carlo run of defaults on this top 10 over the chosen horizon. Its averages are a paid feature like the others.
  const sim = simulateCached(`${data.asOf}|${duration}|${results.map((b) => `${b.isin}:${b.grossYtm}`).join(",")}`, results.map((b) => ({ ytm: b.grossYtm!, risk: bondRisk(b) })), duration);
  // Every bond searched numbered 1..N in alphabetical order (issuer, then name, then ISIN); the show on the page counts up to each pick's number.
  const abc = [...data.bonds].sort((a, b) => (a.issuer ?? a.name).localeCompare(b.issuer ?? b.name, "en") || a.name.localeCompare(b.name, "en") || a.isin.localeCompare(b.isin));
  const place = new Map(abc.map((b, i) => [b.isin, i + 1]));
  const found = results.slice(0, 10).map((b) => place.get(b.isin) ?? 0);
  const paid = tier === "plus" || tier === "premium";
  // Others see the drawn paths relative to the best one at each step (drops from defaults, not the growth, which would give away the average yield).
  const best = sim.samples.length ? sim.samples[0].map((_, k) => Math.max(...sim.samples.map((s) => s[k]))) : [];
  const monteCarlo = paid ? sim : { ...sim, expYield: null, p5: null, samples: sim.samples.map((s) => s.map((v, k) => Math.round((v / best[k]) * 1000) / 10)) };
  // Plus and up: the bonds left out, to swap into the list; Premium (and Pro) also see why each one is out.
  const alternatives = paid ? alternativesFor(data.bonds, results, duration, risk, tier === "premium") : undefined;
  return NextResponse.json(
    { ...shapeForTier(results, tier), alternatives, monteCarlo, found, quota: usage ? publicQuota(usage) : null, source: data.source, scanned: data.bonds.length, asOf: data.asOf, durationBand: band, inputs: { duration, ytm, risk }, engine },
    { headers: { "Cache-Control": "no-store" } },
  );
}
