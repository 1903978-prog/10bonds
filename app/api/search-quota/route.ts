import { NextResponse } from "next/server";
import { currentUser } from "@/lib/currentUser";
import { featuresFor } from "@/lib/planFeatures";
import { peekSearch } from "@/lib/searchQuota";

export const dynamic = "force-dynamic";

/** Searches left today (one counter for both kinds) for the signed-in account (nothing is counted). Empty for visitors. */
export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ single: null, portfolio: null }, { headers: { "Cache-Control": "no-store" } });
  const features = await featuresFor(user);
  const [single, portfolio] = await Promise.all([
    peekSearch(user, "single", features.includes("unlimited_single")),
    peekSearch(user, "portfolio", features.includes("unlimited_portfolio")),
  ]);
  return NextResponse.json({ single, portfolio }, { headers: { "Cache-Control": "no-store" } });
}
