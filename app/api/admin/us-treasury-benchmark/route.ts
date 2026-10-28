import { NextResponse } from "next/server";
import { currentUser } from "@/lib/currentUser";
import { usDashboard, ingestAll } from "@/lib/usTreasury/store";
import { fetchFed, fetchTreasury } from "@/lib/usTreasury/fetch";
import { getBundCurve } from "@/lib/bundCurve/store";

export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "no-store" };
async function admin() { const u = await currentUser(); return u?.isAdmin && u.adminState === "ok" ? u : null; }
const err = (e: unknown) => (e instanceof Error ? e : new Error(String(e)));

/** Admin only: status, the saved US Treasury curves, the Treasury cross-check and the Bund curve for the side-by-side chart. */
export async function GET() {
  if (!(await admin())) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const [d, bund] = await Promise.all([usDashboard(), getBundCurve("ZAR").catch(() => null)]);
  return NextResponse.json({ ...d, bund }, { headers: NO_STORE });
}

/** Admin only. {action:"refresh"} downloads from the Federal Reserve and the Treasury now, with the same validation as the weekly job. */
export async function POST(req: Request) {
  const u = await admin();
  if (!u) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = (await req.json().catch(() => ({}))) as { action?: string };
  if (body.action !== "refresh") return NextResponse.json({ ok: false, message: "Unknown action." }, { status: 400 });
  const [fed, tsy] = await Promise.all([fetchFed().catch(err), fetchTreasury().catch(err)]);
  return NextResponse.json(await ingestAll(fed, tsy, `refresh-now:${u.email}`), { headers: NO_STORE });
}
