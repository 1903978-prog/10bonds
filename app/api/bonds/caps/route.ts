import { NextResponse } from "next/server";
import { bestTableFor } from "@/lib/bestTable";
import { loadBondsFor } from "@/lib/bonds";
import { parseFilter } from "@/lib/bondFilter";

export const dynamic = "force-dynamic";

/** Highest target yield per risk level and duration step for the chosen filters, plus whether minimum sizes are known yet. */
export async function GET(req: Request) {
  try {
    const f = parseFilter(new URL(req.url).searchParams);
    const [table, all] = await Promise.all([bestTableFor(f), loadBondsFor({ currency: f.currency, size: "100k" })]);
    const minKnown = all.bonds.some((b) => b.minInvestment != null);
    return NextResponse.json({ caps: table.caps, minKnown }, { headers: { "Cache-Control": "public, max-age=600" } });
  } catch {
    return NextResponse.json({ caps: null }, { status: 503 });
  }
}
