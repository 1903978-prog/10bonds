import { NextResponse } from "next/server";
import { allow, clientIp } from "@/lib/rateLimit";
import { currentOutlierSd, loadBondsFor, loadOutliers } from "@/lib/bonds";
import { cleanSd } from "@/lib/outliers";
import { parseFilter } from "@/lib/bondFilter";
import { shapeForTier } from "@/lib/tiers";
import { alternativesFor } from "@/lib/alternatives";
import { simulateCached } from "@/lib/monteCarlo";
import { bondRisk } from "@/lib/ratings";
import type { Tier } from "@/lib/types";
import { LIMITS } from "@/lib/limits";
import { currentUser } from "@/lib/currentUser";
import { publicQuota, consumeSearch } from "@/lib/searchQuota";
import { parseShifts, parseWeight } from "@/lib/riskPremium/bands";
import { pickRanking } from "@/lib/pickRanking";

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

  // Weekly allowance per plan (Free: limited; Plus and Premium: see SEARCH_LIMITS). Visitors keep their short preview.
  const usage = user && tier === user.plan ? await consumeSearch(user, "portfolio") : null;
  if (usage && !usage.allowed)
    return NextResponse.json({ error: "Weekly search limit reached.", limitReached: publicQuota(usage), tier }, { status: 402, headers: { "Cache-Control": "no-store" } });
  const tryW = user?.isAdmin ? parseWeight(url.searchParams.get("rw")) : null;
  const { results, band, engine } = await pickRanking(data.bonds, data.asOf, duration, ytm, risk, tryW, tryW !== null ? parseShifts(url.searchParams.get("rp")) : null);
  const outliers = user?.isAdmin
    ? { sd, liveSd, count: (await loadOutliers(sd)).length, liveCount: (await loadOutliers(liveSd)).length }
    : undefined;
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
    { ...shapeForTier(results, tier), alternatives, monteCarlo, found, quota: usage ? publicQuota(usage) : null, source: data.source, scanned: data.bonds.length, asOf: data.asOf, durationBand: band, inputs: { duration, ytm, risk }, engine, outliers },
    { headers: { "Cache-Control": "no-store" } },
  );
}
