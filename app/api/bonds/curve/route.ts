import { NextResponse } from "next/server";
import { allow, clientIp } from "@/lib/rateLimit";
import { loadBondsFor } from "@/lib/bonds";
import { parseFilter } from "@/lib/bondFilter";
import { currentUser } from "@/lib/currentUser";
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

/** Expected loss on your money against target yield, for paid plans only (the same figure as the results box). */
export async function GET(req: Request) {
  if (!allow(`curve:${clientIp(req)}`, 60, 60_000))
    return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
  const user = await currentUser();
  if (!user || user.confirmBlocked || user.plan === "free") return NextResponse.json({ error: "Paid plans only." }, { status: 403, headers: { "Cache-Control": "no-store" } });
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
  const key = `${data.asOf}|${filter.currency}|${filter.size}|${duration}|${risk}`;
  let hit = cache.get(key);
  if (!hit) {
    hit = lossCurve(data.bonds, duration, risk);
    if (cache.size >= 200) cache.delete(cache.keys().next().value!);
    cache.set(key, hit);
  }
  return NextResponse.json({ ...hit, duration, risk }, { headers: { "Cache-Control": "private, no-store" } });
}
