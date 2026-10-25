import { NextResponse } from "next/server";
import { addCorrection } from "@/lib/assessments";
import { allow, clientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

/** An issuer asks to correct a factual error on a report page. Stored for the admin; nothing is published automatically. */
export async function POST(req: Request) {
  if (!allow(`correction:${clientIp(req)}`, 5, 60 * 60_000)) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  const b = await req.json().catch(() => null);
  if (b?.website) return NextResponse.json({ ok: true }); // hidden field: bots fill it
  const ok = await addCorrection(b ?? {}).catch(() => null);
  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Please give your name, a valid e-mail and a short description." }, { status: 400 });
}
