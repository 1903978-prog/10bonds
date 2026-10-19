import { NextResponse } from "next/server";
import { accountsConfigured, findUserById, touchLogin } from "@/lib/accounts";
import { withSession } from "@/lib/authResponse";
import { allow, clientIp } from "@/lib/rateLimit";
import { readTicket, setMfaCookie, verifySecondFactor } from "@/lib/twoFactor";

export const dynamic = "force-dynamic";

/** Second login step for the admin account: the ticket from the password step plus an app or backup code. */
export async function POST(req: Request) {
  if (!accountsConfigured()) return NextResponse.json({ error: "Sign-in opens very soon." }, { status: 503 });
  const b = await req.json().catch(() => ({}));
  const userId = readTicket(b?.ticket);
  if (userId === null) return NextResponse.json({ error: "This sign-in has expired. Please enter your password again.", expired: true }, { status: 401 });
  if (!allow(`2fa:${clientIp(req)}`, 10) || !allow(`2fa:${userId}`, 10))
    return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
  const code = typeof b?.code === "string" ? b.code.slice(0, 40) : "";
  try {
    const user = await findUserById(userId);
    if (!user || !(await verifySecondFactor(userId, code))) return NextResponse.json({ error: "That code is not correct." }, { status: 401 });
    await touchLogin(userId);
    const res = withSession(userId, { ok: true, plan: user.plan });
    if (res.ok) setMfaCookie(res, userId);
    return res;
  } catch (err) {
    console.error("[2fa] failed:", (err as Error).message);
    return NextResponse.json({ error: "Sign-in is not available right now. Please try again later." }, { status: 503 });
  }
}
