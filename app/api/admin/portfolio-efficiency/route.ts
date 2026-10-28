import { NextResponse } from "next/server";
import { currentUser } from "@/lib/currentUser";
import { accountsConfigured } from "@/lib/accounts";
import { publishedRun, recentRuns, requestRecalc, runPositions } from "@/lib/netSpread/store";
import { REFERENCE_POLICY } from "@/lib/netSpread/reference";

export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "no-store" };

async function admin() {
  const u = await currentUser();
  return u?.isAdmin && u.adminState === "ok" ? u : null;
}

/** Admin only. Dashboard = the published run, its 90 stored portfolios (with the old-versus-new comparison inside) and the run history. Read-only: nothing is solved here. */
export async function GET() {
  if (!(await admin())) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!accountsConfigured()) return NextResponse.json({ run: null, runs: [], positions: [] }, { headers: NO_STORE });
  const [run, runs] = await Promise.all([publishedRun(), recentRuns(8)]);
  const positions = run ? await runPositions(Number(run.id)) : [];
  return NextResponse.json({ run, runs, positions, policy: REFERENCE_POLICY }, { headers: NO_STORE });
}

/** Admin only: asks for a recalculation of all 90 (the background job picks it up within about 3 hours). */
export async function POST() {
  const u = await admin();
  if (!u) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const r = await requestRecalc(u.email ?? "admin");
  return NextResponse.json({ message: r.message }, { status: r.ok ? 200 : 409, headers: NO_STORE });
}
