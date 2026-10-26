import { NextResponse } from "next/server";
import { currentUser } from "@/lib/currentUser";
import { loadMatrix, saveMatrix } from "@/lib/planFeatures";
import { loadFreeLimits, saveFreeLimits } from "@/lib/searchLimits";

export const dynamic = "force-dynamic";

async function admin() {
  const u = await currentUser();
  return u?.isAdmin && u.adminState === "ok" ? u : null;
}

/** The feature table: which plan includes what (lib/features.ts). Admin only. */
export async function GET() {
  if (!(await admin())) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ matrix: await loadMatrix(), limits: await loadFreeLimits() }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  if (!(await admin())) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const b = await req.json().catch(() => null);
  if (!b?.matrix && !b?.limits) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  const matrix = b.matrix ? await saveMatrix(b.matrix) : await loadMatrix();
  const limits = b.limits ? await saveFreeLimits(b.limits) : await loadFreeLimits();
  return NextResponse.json({ ok: true, matrix, limits });
}
