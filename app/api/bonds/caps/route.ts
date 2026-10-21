import { NextResponse } from "next/server";
import { capsFor } from "@/lib/bestTable";
import { loadBondsFor } from "@/lib/bonds";
import { parseFilter } from "@/lib/bondFilter";
import { maxRiskByDuration } from "@/lib/riskRange";

export const dynamic = "force-dynamic";

/** Highest target yield per risk level and duration step for the chosen filters, the highest risk level with bonds per duration step, plus whether minimum sizes are known yet. */
export async function GET(req: Request) {
  try {
    const f = parseFilter(new URL(req.url).searchParams);
    const [caps, all, src] = await Promise.all([capsFor(f), loadBondsFor({ currency: f.currency, size: "100k" }), loadBondsFor(f)]);
    const minKnown = all.bonds.some((b) => b.minInvestment != null);
    return NextResponse.json({ caps, maxRisk: maxRiskByDuration(src.bonds), minKnown }, { headers: { "Cache-Control": "public, max-age=600" } });
  } catch {
    return NextResponse.json({ caps: null }, { status: 503 });
  }
}
