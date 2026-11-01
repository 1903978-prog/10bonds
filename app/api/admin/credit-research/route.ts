import { NextResponse } from "next/server";
import { currentUser } from "@/lib/currentUser";
import { createWorkerToken, enqueueIsins, overview, retryFailed, revokeWorkerTokens, setPaused } from "@/lib/creditResearchDb";
import { isIsin } from "@/lib/creditResearchSchema";

export const dynamic = "force-dynamic";

async function admin() {
  const u = await currentUser();
  return u?.isAdmin && u.adminState === "ok" ? u : null;
}

export async function GET() {
  if (!(await admin())) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(await overview(), { headers: { "Cache-Control": "no-store" } });
}

/** Admin controls: pause / resume, analyse an ISIN now, retry failed jobs, create or revoke the worker token (shown once). */
export async function POST(req: Request) {
  if (!(await admin())) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const b = (await req.json().catch(() => null)) as { action?: string; isin?: string } | null;
  switch (b?.action) {
    case "pause": await setPaused(true); return NextResponse.json({ ok: true });
    case "resume": await setPaused(false); return NextResponse.json({ ok: true });
    case "retry": return NextResponse.json({ ok: true, retried: await retryFailed() });
    case "analyze": {
      const isin = String(b.isin ?? "").trim().toUpperCase();
      if (!isIsin(isin)) return NextResponse.json({ error: "Not a valid ISIN" }, { status: 400 });
      return NextResponse.json({ ok: true, queued: await enqueueIsins([isin], true, 0) });
    }
    case "token": return NextResponse.json({ ok: true, token: await createWorkerToken("Lenovo worker") });
    case "revoke": await revokeWorkerTokens(); return NextResponse.json({ ok: true });
    default: return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}
