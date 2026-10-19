import { NextResponse } from "next/server";
import { accountsConfigured, findUserByLogin } from "@/lib/accounts";
import { emailConfigured } from "@/lib/email";
import { resetLang, sendReset } from "@/lib/passwordReset";
import { allow, clientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

/** Sends a reset link. The answer is the same whether the account exists or not, so it cannot be used to test addresses. */
export async function POST(req: Request) {
  if (!accountsConfigured()) return NextResponse.json({ error: "Sign-in opens very soon." }, { status: 503 });
  const b = await req.json().catch(() => ({}));
  const login = typeof b?.login === "string" ? b.login.trim().slice(0, 254) : "";
  const lang = resetLang(b?.lang);
  if (!login) return NextResponse.json({ error: "Please enter your e-mail or username." }, { status: 400 });
  if (!emailConfigured()) return NextResponse.json({ ok: false, off: true });
  if (!allow(`forgot:${clientIp(req)}`, 5) || !allow(`forgot:${login.toLowerCase()}`, 3))
    return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
  try {
    const user = await findUserByLogin(login);
    if (user) await sendReset(user.id, user.email, user.username ?? user.email, user.passwordHash, lang);
  } catch (err) {
    console.error("[forgot] failed:", (err as Error).message);
  }
  return NextResponse.json({ ok: true });
}
