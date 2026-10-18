import { NextResponse } from "next/server";
import { currentUser } from "@/lib/currentUser";
import { decidePro, listProRequests } from "@/lib/pro";

export const dynamic = "force-dynamic";

async function admin() {
  const u = await currentUser();
  return u?.isAdmin ? u : null;
}

export async function GET() {
  if (!(await admin())) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ requests: await listProRequests() }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  if (!(await admin())) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const b = await req.json().catch(() => ({}));
  const userId = Math.floor(Number(b?.userId));
  const status = b?.status;
  if (!Number.isFinite(userId) || !["approved", "rejected", "pending"].includes(status)) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  const ok = await decidePro(userId, status);
  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Request not found" }, { status: 404 });
}
