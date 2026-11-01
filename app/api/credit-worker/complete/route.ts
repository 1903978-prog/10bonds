import { NextResponse } from "next/server";
import { completeJob } from "@/lib/creditResearchDb";
import { parseResult, isIsin } from "@/lib/creditResearchSchema";
import { workerGate } from "@/lib/creditWorkerAuth";

export const dynamic = "force-dynamic";

/** The worker sends the facts the local model extracted plus their sources. The SERVER validates them, calculates IR and BR and publishes one atomic version. */
export async function POST(req: Request) {
  const g = await workerGate(req);
  if (g instanceof NextResponse) return g;
  const { workerId, body } = g;
  if (!isIsin(body.isin)) return NextResponse.json({ error: "isin" }, { status: 400 });
  const p = parseResult(body.isin, body.result);
  if (!p.ok) return NextResponse.json({ error: p.error }, { status: 400 });
  const r = await completeJob(workerId, p.facts, p.usage);
  return r.ok ? NextResponse.json(r) : NextResponse.json({ error: r.error }, { status: r.code });
}
