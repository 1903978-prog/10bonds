import { NextResponse } from "next/server";
import { claimJob, isPaused, touchWorker } from "@/lib/creditResearchDb";
import { workerGate } from "@/lib/creditWorkerAuth";
import { loadBondsByIsin } from "@/lib/bonds";

export const dynamic = "force-dynamic";

/** The worker asks for its next job (this call is also its heartbeat). Paused: it gets no job and waits. */
export async function POST(req: Request) {
  const g = await workerGate(req);
  if (g instanceof NextResponse) return g;
  const { workerId, body } = g;
  await touchWorker(workerId, { model: body.model, host: body.host, isin: null, stage: "idle" });
  if (await isPaused()) return NextResponse.json({ paused: true, job: null });
  const job = await claimJob(workerId);
  if (!job) return NextResponse.json({ paused: false, job: null });
  await touchWorker(workerId, { model: body.model, host: body.host, isin: job.isin, stage: "claimed" });
  // What the site already knows about the bond: the worker researches the rest.
  const found = (await loadBondsByIsin([job.isin]).catch(() => []))[0]?.bond;
  const known = found ? { name: found.name, issuer: found.issuer, country: found.country, currency: found.currency, coupon: found.coupon, maturity: found.maturity, seniority: found.seniority ?? null, couponType: found.couponType ?? null, ratingSp: found.ratingSp, ratingMoodys: found.ratingMoodys, ratingFitch: found.ratingFitch } : null;
  return NextResponse.json({ paused: false, job: { ...job, known } });
}
