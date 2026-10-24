import { NextResponse } from "next/server";
import { capsFor } from "@/lib/bestTable";
import { loadBondsFor } from "@/lib/bonds";
import { parseFilter } from "@/lib/bondFilter";
import { maxRiskByDuration } from "@/lib/riskRange";
import { sliderFor } from "@/lib/sliderCache";
import { warmFrontiers } from "@/lib/frontierCache";
import { TERMS } from "@/lib/limits";

export const dynamic = "force-dynamic";

/** Highest target yield per risk level and duration step for the chosen filters, the highest risk level with bonds per duration step, plus whether minimum sizes are known yet. */
export async function GET(req: Request) {
  try {
    const f = parseFilter(new URL(req.url).searchParams);
    // Start working out the 30 slider positions for every term of this filter, so they are ready when asked for.
    for (const t of TERMS) void sliderFor(f, t.duration).catch(() => {});
    const [caps, all, src] = await Promise.all([capsFor(f), loadBondsFor({ currency: f.currency, size: "100k" }), loadBondsFor(f)]);
    const minKnown = all.bonds.some((b) => b.minInvestment != null);
    // And the admin's "See all curves" frontiers (2 to 10 years), in the background, so they show at once.
    warmFrontiers(src, f, [2, 3, 4, 5, 6, 7, 8, 9, 10]);
    return NextResponse.json({ caps, maxRisk: maxRiskByDuration(src.bonds), minKnown }, { headers: { "Cache-Control": "public, max-age=600" } });
  } catch {
    return NextResponse.json({ caps: null }, { status: 503 });
  }
}
