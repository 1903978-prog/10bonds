import { NextResponse } from "next/server";
import { accountsConfigured, findUserByLogin, touchLogin } from "@/lib/accounts";
import { readCredentials, withSession } from "@/lib/authResponse";
import { verifyPassword } from "@/lib/password";
import { loginTicket, needsCodeAtLogin } from "@/lib/twoFactor";
import { allow, blocked, clearHits, clientIp, record } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

const WRONG = "Email, username or password is not correct.";

export async function POST(req: Request) {
  if (!accountsConfigured()) return NextResponse.json({ error: "Sign-in opens very soon." }, { status: 503 });
  const { email, password } = await readCredentials(req);
  const e = typeof email === "string" ? email.trim().slice(0, 254) : "";
  // Only FAILED passwords count against an account, and per browser address: a stranger guessing from one address cannot lock the
  // owner out from another. A wide cap (20) over all addresses still stops a spread-out guessing run; a password reset by e-mail unlocks it.
  const who = e.toLowerCase();
  const failKey = `loginfail:${who}:${clientIp(req)}`;
  if (!allow(`login:${clientIp(req)}`, 30) || (e && (blocked(failKey, 10) || blocked(`loginfail:${who}`, 20))))
    return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
  if (!e || typeof password !== "string") return NextResponse.json({ error: WRONG }, { status: 401 });
  try {
    const user = await findUserByLogin(e);
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      if (e) { record(failKey); record(`loginfail:${who}`); }
      return NextResponse.json({ error: WRONG }, { status: 401 });
    }
    clearHits(failKey);
    // The admin account with two-factor on: every new sign-in asks for a code, so the 30-day session and the 30-day two-factor
    // mark start together and the code is never asked again in the middle of a valid session (T-10B auth, 21 Nov 2026).
    if (needsCodeAtLogin(user))
      return NextResponse.json({ twoFactor: true, ticket: loginTicket(user.id) });
    await touchLogin(user.id);
    return withSession(user.id, { ok: true, plan: user.plan });
  } catch (err) {
    console.error("[login] failed:", (err as { code?: string }).code ?? "", (err as Error).message);
    return NextResponse.json({ error: "Sign-in is not available right now. Please try again later." }, { status: 503 });
  }
}
