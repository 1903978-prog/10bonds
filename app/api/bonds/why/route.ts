import { NextResponse } from "next/server";
import { allow, clientIp } from "@/lib/rateLimit";
import { currentOutlierSd, loadBondsFor, loadOutliers } from "@/lib/bonds";
import { parseFilter } from "@/lib/bondFilter";
import { LIMITS } from "@/lib/limits";
import { cleanSd } from "@/lib/outliers";
import { currentUser } from "@/lib/currentUser";
import { canSeeRationale } from "@/lib/rationaleAccess";
import { pickRanking } from "@/lib/pickRanking";
import { parseShifts, parseWeight } from "@/lib/riskPremium/bands";
import { explainCurrent, explainRiskAdjusted } from "@/lib/whyList";
import { featuresFor } from "@/lib/planFeatures";
import { exclusionsOrNone, excludedBy } from "@/lib/blacklist";

export const dynamic = "force-dynamic";

const clamp = (raw: string | null, { min, max, initial }: { min: number; max: number; initial: number }) => {
  const n = raw === null ? NaN : Number(raw);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : initial;
};

/** Every bond of one search's window with why it is in the top 10 or not. Premium, Pro and admin only. Not a search. */
export async function GET(req: Request) {
  if (!allow(`bonds:${clientIp(req)}`, 240, 60_000)) return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
  const url = new URL(req.url);
  const user = await currentUser();
  let data;
  const admin = !!user?.isAdmin;
  const sd = admin && url.searchParams.get("os") ? cleanSd(url.searchParams.get("os")) : await currentOutlierSd();
  try {
    data = await loadBondsFor(parseFilter(url.searchParams), sd);
  } catch {
    return NextResponse.json({ error: "Bond data is not available right now. Please try again later." }, { status: 503 });
  }
  // On sample data (local checks only) the table can be previewed without an account.
  const sampleOk = data.source === "sample" && url.searchParams.get("preview") === "premium";
  if (!sampleOk && !(await canSeeRationale(user))) return NextResponse.json({ error: "Premium feature", upgrade: true }, { status: 402, headers: { "Cache-Control": "no-store" } });

  const sc = {
    duration: clamp(url.searchParams.get("duration"), LIMITS.duration),
    ytm: clamp(url.searchParams.get("ytm"), LIMITS.ytm),
    risk: Math.round(clamp(url.searchParams.get("risk"), LIMITS.risk)),
  };
  const tryW = admin ? parseWeight(url.searchParams.get("rw")) : null;
  // The same list the customer sees: their excluded bonds and issuers are left out here too.
  const skip = user && !sampleOk && (await featuresFor(user)).includes("blacklist") ? excludedBy(await exclusionsOrNone(user.id)) : null;
  const picked = await pickRanking(data.bonds, data.asOf, sc.duration, sc.ytm, sc.risk, tryW, tryW !== null ? parseShifts(url.searchParams.get("rp")) : null, skip);
  const bonds = skip ? data.bonds.filter((b) => !skip(b)) : data.bonds;
  const outliers = await loadOutliers(sd);
  const rows = picked.risky
    ? explainRiskAdjusted(bonds, outliers, sc, picked.risky.ranking, picked.risky.ctx)
    : explainCurrent(bonds, outliers, sc, picked.results, picked.band);
  if (user?.isAdmin) {
    // The admin also sees each bond's S&P grade next to the risk score (never sent to customers).
    const sp = new Map(data.bonds.map((b) => [b.isin, b.ratingSp?.trim() || null]));
    for (const r of rows) r.sp = sp.get(r.isin) ?? null;
  }
  return NextResponse.json({ method: picked.engine.method, band: picked.band, rows }, { headers: { "Cache-Control": "no-store" } });
}
