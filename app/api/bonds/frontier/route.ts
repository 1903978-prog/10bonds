import { NextResponse } from "next/server";
import { loadBondsFor } from "@/lib/bonds";
import { parseFilter } from "@/lib/bondFilter";
import { frontierOf } from "@/lib/frontier";

export const dynamic = "force-dynamic";

/**
 * The landing chart: every bond the site shows, in every currency and size, as [risk, yield] (Livio, 19/10/2026:
 * "analyse all bonds available"); the red 5-year frontier is drawn for the visitor's currency. No bond names, so no search is used.
 */
export async function GET(req: Request) {
  try {
    const f = parseFilter(new URL(req.url).searchParams);
    const [eur, usd] = await Promise.all([loadBondsFor({ currency: "EUR", size: "100k" }), loadBondsFor({ currency: "USD", size: "100k" })]);
    const all = frontierOf([...eur.bonds, ...usd.bonds]);
    const { line } = frontierOf((f.currency === "USD" ? usd : eur).bonds);
    return NextResponse.json({ dots: all.dots, line, source: eur.source }, { headers: { "Cache-Control": "public, max-age=600" } });
  } catch {
    return NextResponse.json({ dots: [], line: [] }, { status: 503 });
  }
}
