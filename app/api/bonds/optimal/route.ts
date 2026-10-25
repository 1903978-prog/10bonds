import { NextResponse } from "next/server";
import { loadBonds, loadBondsFor } from "@/lib/bonds";
import { parseFilter } from "@/lib/bondFilter";
import { currentUser } from "@/lib/currentUser";
import { bundCurve } from "@/lib/riskPremium/benchmark";
import { optimalFor } from "@/lib/optimalBuild";

export const dynamic = "force-dynamic";

/** Admin only: "Find Optimal Portfolio" for the Multi-year chart (lib/optimalBuild.ts). { pending: true } while it is built in the background. */
export async function GET(req: Request) {
  const user = await currentUser();
  if (!user?.isAdmin) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const filter = parseFilter(new URL(req.url).searchParams);
  let src, all;
  try {
    [src, all] = await Promise.all([loadBondsFor(filter), loadBonds()]);
  } catch {
    return NextResponse.json({ error: "Bond data is not available right now. Please try again later." }, { status: 503 });
  }
  const res = optimalFor(src, filter, bundCurve(all.bonds, all.asOf));
  return NextResponse.json(res ?? { pending: true }, { headers: { "Cache-Control": "private, no-store" } });
}
