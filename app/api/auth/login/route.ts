import { NextResponse } from "next/server";
import { accountsConfigured, findUserByLogin, touchLogin } from "@/lib/accounts";
import { readCredentials, withSession } from "@/lib/authResponse";
import { verifyPassword } from "@/lib/password";
import { loginTicket, MFA_COOKIE, mfaCookieOk } from "@/lib/twoFactor";
import { allow, clientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

const WRONG = "Email, username or password is not correct.";

export async function POST(req: Request) {
  if (!accountsConfigured()) return NextResponse.json({ error: "Sign-in opens very soon." }, { status: 503 });
  const { email, password } = await readCredentials(req);
  const e = typeof email === "string" ? email.trim().slice(0, 254) : "";
  if (!allow(`login:${clientIp(req)}`, 10) || (e && !allow(`login:${e.toLowerCase()}`, 10)))
    return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
  if (!e || typeof password !== "string") return NextResponse.json({ error: WRONG }, { status: 401 });
  try {
    const user = await findUserByLogin(e);
    if (!user || !(await verifyPassword(password, user.passwordHash))) return NextResponse.json({ error: WRONG }, { status: 401 });
    // The admin account with two-factor on: a code is asked next, unless this browser passed it recently.
    if (user.isAdmin && user.twoFactorOn && !mfaCookieOk(user.id, req.headers.get("cookie")?.match(new RegExp(`(?:^|; )${MFA_COOKIE}=([^;]+)`))?.[1]))
      return NextResponse.json({ twoFactor: true, ticket: loginTicket(user.id) });
    await touchLogin(user.id);
    return withSession(user.id, { ok: true, plan: user.plan });
  } catch (err) {
    console.error("[login] failed:", (err as { code?: string }).code ?? "", (err as Error).message);
    return NextResponse.json({ error: "Sign-in is not available right now. Please try again later." }, { status: 503 });
  }
}
