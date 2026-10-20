import { NextResponse } from "next/server";
import { loadBondsFor } from "@/lib/bonds";
import { parseFilter } from "@/lib/bondFilter";
import { frontierOf } from "@/lib/frontier";

export const dynamic = "force-dynamic";

/** The landing chart: every bond of the visitor's currency (any size) as [risk, yield] and the bonds of the 5-year, risk-5 search. No names, so no search is counted. */
export async function GET(req: Request) {
  try {
    const f = parseFilter(new URL(req.url).searchParams);
    const data = await loadBondsFor({ currency: f.currency, size: "100k" });
    return NextResponse.json({ ...frontierOf(data.bonds), source: data.source }, { headers: { "Cache-Control": "public, max-age=600" } });
  } catch {
    return NextResponse.json({ dots: [], picks: [] }, { status: 503 });
  }
}
