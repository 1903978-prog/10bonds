import { NextResponse } from "next/server";
import { allow, clientIp } from "@/lib/rateLimit";
import { loadBondsFor } from "@/lib/bonds";
import { parseFilter } from "@/lib/bondFilter";
import { currentUser } from "@/lib/currentUser";
import { featuresFor } from "@/lib/planFeatures";
import { LIMITS } from "@/lib/limits";
import { lossCurve, type CurvePoint } from "@/lib/lossCurve";
import { frontierFor } from "@/lib/frontierCache";
import { efficientPoints, pickEven } from "@/lib/frontierPoints";
import { targetOf } from "@/lib/exactFrontier";

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
  const feats = await featuresFor(user);
  if (!feats.includes("loss_chart")) return NextResponse.json({ error: "Paid plans only." }, { status: 403, headers: { "Cache-Control": "no-store" } });
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
  // Admin only: the exact efficient frontier (lib/exactFrontier.ts, as the slider) per horizon from 2 to 10 years, for
  // comparing them. Fast (well under a second each) and kept in memory; 60 evenly spread points per curve.
  if (url.searchParams.get("all") === "1" && (user?.isAdmin || feats.includes("multi_chart"))) {
    const curves = Array.from({ length: 9 }, (_, i) => {
      const pts = pickEven(efficientPoints(frontierFor(data, filter, i + 2).points), 60);
      // target = what the search needs to give back exactly this list (the multi-year chart's click on a point); dur = the list's average duration.
      const points = pts.map((p) => ({ ytm: Math.round(p.ytm * 100) / 100, loss: Math.round(p.el * 1000) / 1000, target: targetOf(p), dur: Math.round((p.rows.reduce((s, r) => s + (r.modifiedDuration ?? 0), 0) / Math.max(1, p.rows.length)) * 10) / 10 }));
      return { duration: i + 2, points, max: points.length ? points[points.length - 1].ytm : LIMITS.ytm.min };
    }).filter((c) => c.points.length > 1);
    return NextResponse.json({ curves, risk }, { headers: { "Cache-Control": "private, no-store" } });
  }
  return NextResponse.json({ ...curveFor(duration), duration, risk }, { headers: { "Cache-Control": "private, no-store" } });
}
