import { NextResponse } from "next/server";
import { failJob } from "@/lib/creditResearchDb";
import { workerGate } from "@/lib/creditWorkerAuth";
import { isIsin } from "@/lib/creditResearchSchema";

export const dynamic = "force-dynamic";

/** The worker gives a job back with a reason; it is retried later with growing waits (5, 10, 20 ... minutes, five tries). */
export async function POST(req: Request) {
  const g = await workerGate(req);
  if (g instanceof NextResponse) return g;
  const { workerId, body } = g;
  if (!isIsin(body.isin)) return NextResponse.json({ error: "isin" }, { status: 400 });
  const ok = await failJob(workerId, body.isin, String(body.error ?? "unknown error"), { model: typeof body.model === "string" ? body.model : undefined, ms: typeof body.ms === "number" ? body.ms : undefined });
  return NextResponse.json({ ok }, { status: ok ? 200 : 409 });
}
