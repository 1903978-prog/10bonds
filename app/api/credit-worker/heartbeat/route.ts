import { NextResponse } from "next/server";
import { heartbeat, touchWorker } from "@/lib/creditResearchDb";
import { workerGate } from "@/lib/creditWorkerAuth";
import { isIsin } from "@/lib/creditResearchSchema";

export const dynamic = "force-dynamic";

/** Keeps the lease on a job during a long step and records the stage. 409: the lease was lost, the worker drops the job. */
export async function POST(req: Request) {
  const g = await workerGate(req);
  if (g instanceof NextResponse) return g;
  const { workerId, body } = g;
  const isin = body.isin;
  if (!isIsin(isin)) return NextResponse.json({ error: "isin" }, { status: 400 });
  const stage = typeof body.stage === "string" ? body.stage : "working";
  await touchWorker(workerId, { model: body.model, host: body.host, isin, stage });
  const ok = await heartbeat(workerId, isin, stage);
  return NextResponse.json({ ok }, { status: ok ? 200 : 409 });
}
