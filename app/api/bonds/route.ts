import { NextResponse } from "next/server";
import { allow, clientIp } from "@/lib/rateLimit";
import { loadBondsFor } from "@/lib/bonds";
import { parseFilter } from "@/lib/bondFilter";
import { rankBonds } from "@/lib/ranking";
import { shapeForTier } from "@/lib/tiers";
import type { Tier } from "@/lib/types";
import { LIMITS } from "@/lib/limits";
import { currentUser } from "@/lib/currentUser";
import { publicQuota, consumeSearch } from "@/lib/searchQuota";

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
  if (data.source === "sample" && (preview === "free" || preview === "plus")) tier = preview;

  // Weekly allowance per plan (Free: limited; Plus and Premium: see SEARCH_LIMITS). Visitors keep their short preview.
  const usage = user && tier === user.plan ? await consumeSearch(user, "portfolio") : null;
  if (usage && !usage.allowed)
    return NextResponse.json({ error: "Weekly search limit reached.", limitReached: publicQuota(usage), tier }, { status: 402, headers: { "Cache-Control": "no-store" } });
  const { results, band } = rankBonds(data.bonds, duration, ytm, undefined, risk);
  return NextResponse.json(
    { ...shapeForTier(results, tier), quota: usage ? publicQuota(usage) : null, source: data.source, asOf: data.asOf, durationBand: band, inputs: { duration, ytm, risk } },
    { headers: { "Cache-Control": "no-store" } },
  );
}
