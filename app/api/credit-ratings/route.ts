import { NextResponse } from "next/server";
import { pendingIsins, publicRatings } from "@/lib/creditResearchDb";
import { allow, clientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

/** IR and BR of up to 50 ISINs for everyone (owner, 1/11/2026), plus the ISINs still being researched. The lists poll this while some are pending. */
export async function GET(req: Request) {
  if (!allow(`credit-ratings:${clientIp(req)}`, 120, 60_000)) return NextResponse.json({ error: "slow down" }, { status: 429, headers: { "Retry-After": "10" } });
  const isins = (new URL(req.url).searchParams.get("isins") ?? "").split(",").map((s) => s.trim().toUpperCase());
  try {
    if (!isins.some(Boolean)) return NextResponse.json({ ratings: {}, pending: await pendingIsins() }, { headers: { "Cache-Control": "no-store" } });
    return NextResponse.json(await publicRatings(isins), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ ratings: {}, pending: [] });
  }
}
