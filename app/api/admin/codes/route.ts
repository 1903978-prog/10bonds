import { NextResponse } from "next/server";
import { adminStats, createTrialCodes, listTrialCodes } from "@/lib/accounts";
import { makeCode } from "@/lib/codes";
import { currentUser } from "@/lib/currentUser";

export const dynamic = "force-dynamic";

async function admin() {
  const u = await currentUser();
  return u?.isAdmin ? u : null;
}

export async function GET() {
  if (!(await admin())) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const [codes, stats] = await Promise.all([listTrialCodes(), adminStats()]);
  return NextResponse.json({ codes, stats }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  const u = await admin();
  if (!u) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const b = await req.json().catch(() => ({}));
  const count = Math.min(50, Math.max(1, Math.floor(Number(b?.count) || 1)));
  const days = Math.min(365, Math.max(1, Math.floor(Number(b?.days) || 30)));
  const note = typeof b?.note === "string" && b.note.trim() ? b.note.trim().slice(0, 120) : null;
  const codes = await createTrialCodes(u.id, count, days, note, makeCode);
  return NextResponse.json({ codes });
}
