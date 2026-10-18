import { NextResponse } from "next/server";
import { accountsConfigured, createUser, normaliseEmail } from "@/lib/accounts";
import { readCredentials, withSession } from "@/lib/authResponse";
import { hashPassword } from "@/lib/password";
import { allow, clientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!accountsConfigured()) return NextResponse.json({ error: "Free accounts open very soon." }, { status: 503 });
  if (!allow(`signup:${clientIp(req)}`, 5)) return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
  const { email, password } = await readCredentials(req);
  const e = normaliseEmail(email);
  if (!e) return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  if (typeof password !== "string" || password.length < 8 || password.length > 200)
    return NextResponse.json({ error: "Please choose a password of at least 8 characters." }, { status: 400 });
  try {
    const user = await createUser(e, await hashPassword(password));
    if (user === "exists") return NextResponse.json({ error: "An account with this email already exists. Please sign in." }, { status: 409 });
    return withSession(user.id, { ok: true, plan: user.plan });
  } catch {
    return NextResponse.json({ error: "Sign-up is not available right now. Please try again later." }, { status: 503 });
  }
}
