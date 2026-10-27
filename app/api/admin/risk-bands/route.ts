import { NextResponse } from "next/server";
import { currentUser } from "@/lib/currentUser";
import { loadBandConfig, saveBandConfig } from "@/lib/riskBandsStore";

export const dynamic = "force-dynamic";

async function admin() {
  const u = await currentUser();
  return u?.isAdmin && u.adminState === "ok" ? u : null;
}

/** The 30 average-risk bands behind the "Return & risk" slider and the candidates kept per cell (lib/riskBands.ts). Admin only. */
export async function GET() {
  if (!(await admin())) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(await loadBandConfig(), { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  if (!(await admin())) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const b = await req.json().catch(() => null);
  const saved = b ? await saveBandConfig(b) : null;
  if (!saved) return NextResponse.json({ error: "Each band needs a minimum and a maximum between 1 and 10 (minimum not above maximum), 30 bands in all, and 10 to 200 candidates per cell." }, { status: 400 });
  return NextResponse.json({ ok: true, ...saved });
}
