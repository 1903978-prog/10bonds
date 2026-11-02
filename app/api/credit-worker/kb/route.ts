import { NextResponse } from "next/server";
import { kbGet, kbPut } from "@/lib/creditResearchDb";
import { workerGate } from "@/lib/creditWorkerAuth";

export const dynamic = "force-dynamic";

/** The workers' shared memory. { op: "get", keys: [...] } reads, { op: "put", entries: { key: object } } writes. Keys are domain:<issuer>, dead:<host>, fin:<issuer>. */
export async function POST(req: Request) {
  const g = await workerGate(req);
  if (g instanceof NextResponse) return g;
  const { body } = g;
  if (body.op === "get" && Array.isArray(body.keys)) return NextResponse.json({ values: await kbGet(body.keys.filter((k): k is string => typeof k === "string")) });
  if (body.op === "put" && body.entries && typeof body.entries === "object" && !Array.isArray(body.entries)) return NextResponse.json(await kbPut(body.entries as Record<string, unknown>));
  return NextResponse.json({ error: "op" }, { status: 400 });
}
