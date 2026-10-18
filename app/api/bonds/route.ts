import { NextResponse } from "next/server";
import { loadBonds } from "@/lib/bonds";
import { rankBonds } from "@/lib/ranking";
import { shapeForTier } from "@/lib/tiers";
import type { Tier } from "@/lib/types";
import { LIMITS } from "@/lib/limits";

export const dynamic = "force-dynamic";

function clampParam(raw: string | null, { min, max, initial }: { min: number; max: number; initial: number }) {
  const n = raw === null ? NaN : Number(raw);
  if (!Number.isFinite(n)) return initial;
  return Math.min(max, Math.max(min, n));
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const duration = clampParam(url.searchParams.get("duration"), LIMITS.duration);
  const ytm = clampParam(url.searchParams.get("ytm"), LIMITS.ytm);

  let data;
  try {
    data = await loadBonds();
  } catch {
    return NextResponse.json({ error: "Bond data is not available right now. Please try again later." }, { status: 503 });
  }

  // Until accounts exist everyone is on Free. The paid view can be previewed on sample data only.
  const previewPlus = url.searchParams.get("preview") === "plus" && data.source === "sample";
  const tier: Tier = previewPlus ? "plus" : "free";

  const { results, band } = rankBonds(data.bonds, duration, ytm);
  return NextResponse.json(
    { ...shapeForTier(results, tier), source: data.source, asOf: data.asOf, durationBand: band, inputs: { duration, ytm } },
    { headers: { "Cache-Control": "no-store" } },
  );
}
