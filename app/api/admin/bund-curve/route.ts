import { NextResponse } from "next/server";
import { currentUser } from "@/lib/currentUser";
import { loadBonds } from "@/lib/bonds";
import { bundCurve } from "@/lib/riskPremium/benchmark";
import { getBundBenchmarkPoints } from "@/lib/bundCurve/store";

export const dynamic = "force-dynamic";

/** The German Bund curve the Risk Premium model uses (years, yield %) and its date, for the admin "Spread" column. Admin only. */
export async function GET() {
  const u = await currentUser();
  if (!u?.isAdmin) return NextResponse.json({ error: "Not found" }, { status: 404 });
  // Official Bundesbank curve (annual-coupon yields, 1-30y) first; the older curve built from Bunds in the daily copy only if no official import exists yet.
  const official = await getBundBenchmarkPoints().catch(() => null);
  if (official) return NextResponse.json({ asOf: official.asOf, source: "Deutsche Bundesbank", points: official.points }, { headers: { "Cache-Control": "no-store" } });
  const data = await loadBonds();
  const c = bundCurve(data.bonds, data.asOf);
  return NextResponse.json({ asOf: c.asOf, source: "fallback: Bunds in the daily copy (no official import yet)", points: c.points.map((p) => ({ years: Math.round(p.years * 100) / 100, ytm: p.ytm })) }, { headers: { "Cache-Control": "no-store" } });
}
