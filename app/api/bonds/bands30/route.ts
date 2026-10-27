import { NextResponse } from "next/server";
import { allow, clientIp } from "@/lib/rateLimit";
import { parseFilter } from "@/lib/bondFilter";
import { currentUser } from "@/lib/currentUser";
import { TERMS } from "@/lib/limits";
import { loadBondsFor } from "@/lib/bonds";
import { bandsPositions } from "@/lib/bands30";

export const dynamic = "force-dynamic";

/** The positions of the "30 risk bands" slider for a horizon and bond filter, in the same shape as /api/bonds/slider. `positions: null` = no lists saved for this filter. */
export async function GET(req: Request) {
  if (!allow(`slider:${clientIp(req)}`, 60, 60_000))
    return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
  const url = new URL(req.url);
  const duration = Number(url.searchParams.get("duration"));
  if (!TERMS.some((t) => t.duration === duration)) return NextResponse.json({ error: "Unknown horizon." }, { status: 400 });
  const user = await currentUser().catch(() => null);
  const f = parseFilter(url.searchParams);
  let positions;
  try {
    positions = await bandsPositions(await loadBondsFor(f), f, duration);
  } catch {
    return NextResponse.json({ error: "Bond data is not available right now. Please try again later." }, { status: 503 });
  }
  if (!positions) return NextResponse.json({ positions: null }, { headers: { "Cache-Control": "no-store" } });
  // The return and loss of each position feed the two boxes and the chart, which every plan and visitors see (as for the standard slider).
  const out = user?.isAdmin ? positions : positions.map((p) => ({ position: p.position, query: p.query, sameAs: p.sameAs, unavailable: p.unavailable, worstRisk: p.worstRisk, ytm: p.ytm, expectedLoss: p.expectedLoss }));
  return NextResponse.json({ positions: out }, { headers: { "Cache-Control": "private, max-age=300" } });
}
