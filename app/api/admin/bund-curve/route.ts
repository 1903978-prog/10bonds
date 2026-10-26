import { NextResponse } from "next/server";
import { currentUser } from "@/lib/currentUser";
import { loadBonds } from "@/lib/bonds";
import { bundCurve } from "@/lib/riskPremium/benchmark";

export const dynamic = "force-dynamic";

/** The German Bund curve the Risk Premium model uses (years, yield %) and its date, for the admin "Spread" column. Admin only. */
export async function GET() {
  const u = await currentUser();
  if (!u?.isAdmin) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const data = await loadBonds();
  const c = bundCurve(data.bonds, data.asOf);
  return NextResponse.json({ asOf: c.asOf, points: c.points.map((p) => ({ years: Math.round(p.years * 100) / 100, ytm: p.ytm })) }, { headers: { "Cache-Control": "no-store" } });
}
