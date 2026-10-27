import { NextResponse } from "next/server";
import { loadBondsFor } from "@/lib/bonds";
import { parseFilter } from "@/lib/bondFilter";
import { frontierOf } from "@/lib/frontier";

export const dynamic = "force-dynamic";

// Last good answer per currency: served at once if the data copy is slow to reload or fails, so the chart is never empty.
const last = new Map<string, { dots: unknown; picks: unknown; source: unknown }>();

/** The landing chart: every bond of the visitor's currency (any size) as [risk, yield] and the bonds of the 5-year, risk-5 search. No names, so no search is counted. */
export async function GET(req: Request) {
  try {
    const f = parseFilter(new URL(req.url).searchParams);
    const data = await loadBondsFor({ currency: f.currency, size: "100k" });
    const out = { ...frontierOf(data.bonds), source: data.source };
    last.set(f.currency, out);
    return NextResponse.json(out, { headers: { "Cache-Control": "public, max-age=600, stale-while-revalidate=86400" } });
  } catch {
    const f = parseFilter(new URL(req.url).searchParams);
    const old = last.get(f.currency);
    if (old) return NextResponse.json(old, { headers: { "Cache-Control": "no-store" } });
    return NextResponse.json({ dots: [], picks: [] }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
