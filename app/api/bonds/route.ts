import { NextResponse } from "next/server";
import { loadBonds } from "@/lib/bonds";
import { rankBonds } from "@/lib/ranking";
import { shapeForTier } from "@/lib/tiers";
import type { Tier } from "@/lib/types";
import { LIMITS } from "@/lib/limits";
import { currentUser } from "@/lib/currentUser";

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
  const risk = Math.round(clampParam(url.searchParams.get("risk"), LIMITS.risk));

  let data;
  try {
    data = await loadBonds();
  } catch {
    return NextResponse.json({ error: "Bond data is not available right now. Please try again later." }, { status: 503 });
  }

  // The tier comes from the signed-in account (server side). Other views can be previewed on sample data only.
  const user = await currentUser();
  let tier: Tier = user ? user.plan : "visitor";
  const preview = url.searchParams.get("preview");
  if (data.source === "sample" && (preview === "free" || preview === "plus")) tier = preview;

  const { results, band } = rankBonds(data.bonds, duration, ytm, undefined, risk);
  return NextResponse.json(
    { ...shapeForTier(results, tier), source: data.source, asOf: data.asOf, durationBand: band, inputs: { duration, ytm, risk } },
    { headers: { "Cache-Control": "no-store" } },
  );
}
