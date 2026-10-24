import { NextResponse } from "next/server";
import { allow, clientIp } from "@/lib/rateLimit";
import { loadBondsFor } from "@/lib/bonds";
import { parseFilter } from "@/lib/bondFilter";
import { currentUser } from "@/lib/currentUser";
import { featuresFor } from "@/lib/planFeatures";
import { LIMITS } from "@/lib/limits";
import { lossCurve, type CurvePoint } from "@/lib/lossCurve";

export const dynamic = "force-dynamic";

// The curve depends only on the horizon, risk limit and bond filter (and the data copy), so it is remembered per key.
const cache = new Map<string, { points: CurvePoint[]; max: number }>();

function clampParam(raw: string | null, { min, max, initial }: { min: number; max: number; initial: number }) {
  const n = raw === null ? NaN : Number(raw);
  if (!Number.isFinite(n)) return initial;
  return Math.min(max, Math.max(min, n));
}

/** Expected loss on your money against target yield, for plans with "loss_chart" (/admin/features) only (the same figure as the results box). */
export async function GET(req: Request) {
  if (!allow(`curve:${clientIp(req)}`, 60, 60_000))
    return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
  const user = await currentUser();
  if (!(await featuresFor(user)).includes("loss_chart")) return NextResponse.json({ error: "Paid plans only." }, { status: 403, headers: { "Cache-Control": "no-store" } });
  const url = new URL(req.url);
  const duration = clampParam(url.searchParams.get("duration"), LIMITS.duration);
  const risk = Math.round(clampParam(url.searchParams.get("risk"), LIMITS.risk));
  const filter = parseFilter(url.searchParams);
  let data;
  try {
    data = await loadBondsFor(filter);
  } catch {
    return NextResponse.json({ error: "Bond data is not available right now. Please try again later." }, { status: 503 });
  }
  const curveFor = (d: number) => {
    const key = `${data.asOf}|${filter.currency}|${filter.size}|${d}|${risk}`;
    let hit = cache.get(key);
    if (!hit) {
      hit = lossCurve(data.bonds, d, risk);
      if (cache.size >= 200) cache.delete(cache.keys().next().value!);
      cache.set(key, hit);
    }
    return hit;
  };
  // Admin only: one curve per horizon from 2 to 10 years, for comparing them.
  if (url.searchParams.get("all") === "1" && user?.isAdmin) {
    const curves = Array.from({ length: 9 }, (_, i) => ({ duration: i + 2, ...curveFor(i + 2) }));
    return NextResponse.json({ curves, risk }, { headers: { "Cache-Control": "private, no-store" } });
  }
  return NextResponse.json({ ...curveFor(duration), duration, risk }, { headers: { "Cache-Control": "private, no-store" } });
}
