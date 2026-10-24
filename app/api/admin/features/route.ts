import { NextResponse } from "next/server";
import { currentUser } from "@/lib/currentUser";
import { loadMatrix, saveMatrix } from "@/lib/planFeatures";

export const dynamic = "force-dynamic";

async function admin() {
  const u = await currentUser();
  return u?.isAdmin && u.adminState === "ok" ? u : null;
}

/** The feature table: which plan includes what (lib/features.ts). Admin only. */
export async function GET() {
  if (!(await admin())) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ matrix: await loadMatrix() }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  if (!(await admin())) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const b = await req.json().catch(() => null);
  if (!b?.matrix) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  return NextResponse.json({ ok: true, matrix: await saveMatrix(b.matrix) });
}
