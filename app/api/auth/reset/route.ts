import { NextResponse } from "next/server";
import { accountsConfigured, replacePassword } from "@/lib/accounts";
import { hashPassword } from "@/lib/password";
import { passwordTag, readReset } from "@/lib/passwordReset";
import { allow, clientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!accountsConfigured()) return NextResponse.json({ error: "Sign-in opens very soon." }, { status: 503 });
  if (!allow(`reset:${clientIp(req)}`, 10)) return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
  const b = await req.json().catch(() => ({}));
  const t = readReset(typeof b?.t === "string" ? b.t : null);
  if (!t) return NextResponse.json({ error: "bad" }, { status: 400 });
  const pw = b?.password;
  if (typeof pw !== "string" || pw.length < 8 || pw.length > 200)
    return NextResponse.json({ error: "Please choose a password of at least 8 characters." }, { status: 400 });
  try {
    const ok = await replacePassword(t.userId, (hash) => passwordTag(hash) === t.tag, await hashPassword(pw));
    return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "bad" }, { status: 400 });
  } catch (err) {
    console.error("[reset] failed:", (err as Error).message);
    return NextResponse.json({ error: "Please try again later." }, { status: 503 });
  }
}
