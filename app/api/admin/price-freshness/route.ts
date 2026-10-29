import { NextResponse } from "next/server";
import { notRefreshedBonds, priceFreshnessReport } from "@/lib/bonds";
import { bondsCsv } from "@/lib/priceFreshness";
import { currentUser } from "@/lib/currentUser";

export const dynamic = "force-dynamic";

/** Admin only (404 for everyone else). No query: the summary. ?bonds=1&cur=EUR&reason=...: the bonds of one group. ?csv=1: every bond older than 3 trading days. */
export async function GET(req: Request) {
  const u = await currentUser();
  if (!u?.isAdmin) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const p = new URL(req.url).searchParams;
  const headers = { "Cache-Control": "no-store" };
  if (p.get("csv")) {
    const bonds = await notRefreshedBonds().catch(() => null);
    if (!bonds) return NextResponse.json({ error: "Bond data is not connected." }, { status: 503, headers });
    return new NextResponse(bondsCsv(bonds), { headers: { ...headers, "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="not-refreshed-${new Date().toISOString().slice(0, 10)}.csv"` } });
  }
  if (p.get("bonds")) {
    const cur = p.get("cur") === "USD" ? "USD" : p.get("cur") === "EUR" ? "EUR" : undefined;
    const data = await notRefreshedBonds({ cur, reason: p.get("reason") ?? undefined, limit: 300 }).catch(() => null);
    return NextResponse.json({ data }, { headers });
  }
  const data = await priceFreshnessReport().catch(() => null);
  return NextResponse.json({ data }, { headers });
}
