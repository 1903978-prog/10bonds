import { NextResponse } from "next/server";
import { allow, clientIp } from "@/lib/rateLimit";
import { currentOutlierSd, loadBondsFor, loadOutliers } from "@/lib/bonds";
import { cleanSd } from "@/lib/outliers";
import { parseFilter } from "@/lib/bondFilter";
import { shapeForTier, tierFeatures } from "@/lib/tiers";
import { alternativesFor } from "@/lib/alternatives";
import { simulateCached } from "@/lib/monteCarlo";
import { bondRisk } from "@/lib/ratings";
import type { Tier } from "@/lib/types";
import { LIMITS } from "@/lib/limits";
import { currentUser } from "@/lib/currentUser";
import { publicQuota, consumeSearch } from "@/lib/searchQuota";
import { parseShifts, parseWeight } from "@/lib/riskPremium/bands";
import { pickRanking } from "@/lib/pickRanking";
import { featuresFor } from "@/lib/planFeatures";
import { exclusionsOrNone, excludedBy } from "@/lib/blacklist";

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

  // The tier comes from the signed-in account (server side). Other views can be previewed on sample data only.
  // An account whose e-mail is still unconfirmed after the grace period searches like a visitor.
  const signedIn = await currentUser();
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

  // Weekly allowance per plan (Free: limited unless the table says unlimited; see SEARCH_LIMITS). Visitors keep their short preview.
  const usage = own ? await consumeSearch(user!, "portfolio", has("unlimited_portfolio")) : null;
  if (usage && !usage.allowed)
    return NextResponse.json({ error: "Weekly search limit reached.", limitReached: publicQuota(usage), tier }, { status: 402, headers: { "Cache-Control": "no-store" } });
  const tryW = user?.isAdmin ? parseWeight(url.searchParams.get("rw")) : null;
  // The bonds and issuers this customer excluded never enter the list.
  const skip = own && has("blacklist") ? excludedBy(await exclusionsOrNone(user!.id)) : null;
  const { results, band, engine } = await pickRanking(data.bonds, data.asOf, duration, ytm, risk, tryW, tryW !== null ? parseShifts(url.searchParams.get("rp")) : null, skip);
  const outliers = user?.isAdmin
    ? { sd, liveSd, count: (await loadOutliers(sd)).length, liveCount: (await loadOutliers(liveSd)).length }
    : undefined;
  // A real Monte Carlo run of defaults on this top 10 over the chosen horizon. Its averages come with "portfolio_sim".
  const sim = simulateCached(`${data.asOf}|${duration}|${results.map((b) => `${b.isin}:${b.grossYtm}`).join(",")}`, results.map((b) => ({ ytm: b.grossYtm!, risk: bondRisk(b) })), duration);
  // Every bond searched numbered 1..N in alphabetical order (issuer, then name, then ISIN); the show on the page counts up to each pick's number.
  const abc = [...data.bonds].sort((a, b) => (a.issuer ?? a.name).localeCompare(b.issuer ?? b.name, "en") || a.name.localeCompare(b.name, "en") || a.isin.localeCompare(b.isin));
  const place = new Map(abc.map((b, i) => [b.isin, i + 1]));
  const found = results.slice(0, 10).map((b) => place.get(b.isin) ?? 0);
  const paid = has("portfolio_sim");
  // Others see the drawn paths relative to the best one at each step (drops from defaults, not the growth, which would give away the average yield).
  const best = sim.samples.length ? sim.samples[0].map((_, k) => Math.max(...sim.samples.map((s) => s[k]))) : [];
  const monteCarlo = paid ? sim : { ...sim, expYield: null, p5: null, samples: sim.samples.map((s) => s.map((v, k) => Math.round((v / best[k]) * 1000) / 10)) };
  // With "swap": the bonds left out, to swap into the list; with "why_table" also why each one is out.
  const pool = skip ? data.bonds.filter((b) => !skip(b)) : data.bonds;
  const alternatives = has("swap") || has("add_left_out") ? alternativesFor(pool, results, duration, risk, has("why_table")) : undefined;
  return NextResponse.json(
    { ...shapeForTier(results, tier, features), features, excluded: skip !== null, alternatives, monteCarlo, found, quota: usage ? publicQuota(usage) : null, source: data.source, scanned: data.bonds.length, issuers: new Set(data.bonds.map((b) => b.issuer ?? b.name)).size, asOf: data.asOf, durationBand: band, inputs: { duration, ytm, risk }, engine, outliers },
    { headers: { "Cache-Control": "no-store" } },
  );
}
