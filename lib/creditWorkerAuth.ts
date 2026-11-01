import { NextResponse } from "next/server";
import { tokenValid } from "./creditResearchDb";
import { allow, clientIp } from "./rateLimit";

/** Shared door of the /api/credit-worker routes: a scoped bearer token (stored hashed, revocable) and a request limit per address. */
export async function workerGate(req: Request): Promise<{ workerId: string; body: Record<string, unknown> } | NextResponse> {
  if (!allow(`credit-worker:${clientIp(req)}`, 120, 60_000)) return NextResponse.json({ error: "slow down" }, { status: 429, headers: { "Retry-After": "10" } });
  if (!(await tokenValid(req.headers.get("authorization")).catch(() => false))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const id = typeof body?.workerId === "string" && /^[A-Za-z0-9._-]{3,60}$/.test(body.workerId) ? body.workerId : null;
  if (!body || !id) return NextResponse.json({ error: "workerId missing" }, { status: 400 });
  return { workerId: id, body };
}
