import { NextResponse } from "next/server";
import { accountsConfigured, findUserByEmail, normaliseEmail, touchLogin } from "@/lib/accounts";
import { readCredentials, withSession } from "@/lib/authResponse";
import { verifyPassword } from "@/lib/password";
import { allow, clientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

const WRONG = "Email or password is not correct.";

export async function POST(req: Request) {
  if (!accountsConfigured()) return NextResponse.json({ error: "Sign-in opens very soon." }, { status: 503 });
  const { email, password } = await readCredentials(req);
  const e = normaliseEmail(email);
  if (!allow(`login:${clientIp(req)}`, 10) || (e && !allow(`login:${e}`, 10)))
    return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
  if (!e || typeof password !== "string") return NextResponse.json({ error: WRONG }, { status: 401 });
  try {
    const user = await findUserByEmail(e);
    if (!user || !(await verifyPassword(password, user.passwordHash))) return NextResponse.json({ error: WRONG }, { status: 401 });
    await touchLogin(user.id);
    return withSession(user.id, { ok: true, plan: user.plan });
  } catch {
    return NextResponse.json({ error: "Sign-in is not available right now. Please try again later." }, { status: 503 });
  }
}
