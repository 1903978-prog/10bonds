import { NextResponse } from "next/server";
import { currentUser } from "@/lib/currentUser";
import { getEtf, parseEtf, setEtf } from "@/lib/etfBenchmark";
import { benchmarkPortfolio } from "@/lib/benchmarkPortfolio";

export const dynamic = "force-dynamic";

/** The ETF benchmark for the results box. Public without source and methodology; the admin saves a new one with POST. */
export async function GET() {
  // Source and methodology stay with the admin.
  const { source: _s, methodology: _m, ...pub } = await getEtf();
  // The home page card's 10bonds side, live; null while the slider lists are still being worked out.
  const portfolio = await benchmarkPortfolio(pub.position).catch(() => null);
  const portfolioCache = portfolio ? "public, max-age=300" : "no-store";
  return NextResponse.json({ ...pub, portfolio }, { headers: { "Cache-Control": portfolioCache } });
}

export async function POST(req: Request) {
  const u = await currentUser();
  if (!u?.isAdmin) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const b = parseEtf(await req.json().catch(() => null));
  if (!b) return NextResponse.json({ error: "Check the numbers and the date (YYYY-MM-DD)." }, { status: 400 });
  await setEtf(b);
  return NextResponse.json(b);
}
