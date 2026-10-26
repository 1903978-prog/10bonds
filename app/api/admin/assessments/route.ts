import { NextResponse } from "next/server";
import { currentUser } from "@/lib/currentUser";
import { setCorrectionStatus, setVerdictsOn, verdictsOn } from "@/lib/assessments";

export const dynamic = "force-dynamic";

async function admin() {
  const u = await currentUser();
  return u?.isAdmin && u.adminState === "ok" ? u : null;
}

export async function GET() {
  if (!(await admin())) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ verdicts: await verdictsOn() }, { headers: { "Cache-Control": "no-store" } });
}

// {verdicts: boolean} switches BUY/WATCH/AVOID for customers; {correction: id, status} closes a correction request.
export async function POST(req: Request) {
  if (!(await admin())) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const b = await req.json().catch(() => ({}));
  if (typeof b?.verdicts === "boolean") {
    await setVerdictsOn(b.verdicts);
    return NextResponse.json({ ok: true, verdicts: b.verdicts });
  }
  if (Number.isInteger(b?.correction) && typeof b?.status === "string") {
    return (await setCorrectionStatus(b.correction, b.status)) ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Bad status" }, { status: 400 });
  }
  return NextResponse.json({ error: "Bad request" }, { status: 400 });
}
