import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { findUserById } from "@/lib/accounts";
import { AS_USER_COOKIE } from "@/lib/currentUser";
import { readSession, SESSION_COOKIE } from "@/lib/session";
import { adminStateOf, MFA_COOKIE } from "@/lib/twoFactor";

export const dynamic = "force-dynamic";

/** The yellow "Admin yes/no" switch. The server sets or clears the cookie (a browser can keep a cookie it cannot clear from the page). Only a signed-in admin who passed two-factor can use it, and it only ever takes admin powers away. */
export async function POST(req: Request) {
  const jar = await cookies();
  const id = readSession(jar.get(SESSION_COOKIE)?.value);
  const user = id === null ? null : await findUserById(id).catch(() => null);
  if (!user || adminStateOf(user, jar.get(MFA_COOKIE)?.value) !== "ok") return new NextResponse(null, { status: 404 });
  const body = (await req.json().catch(() => ({}))) as { asUser?: unknown };
  const res = NextResponse.json({ asUser: body.asUser === true }, { headers: { "Cache-Control": "no-store" } });
  if (body.asUser === true) res.cookies.set(AS_USER_COOKIE, "1", { path: "/", maxAge: 31536000, sameSite: "lax", secure: true });
  else res.cookies.set(AS_USER_COOKIE, "", { path: "/", maxAge: 0, sameSite: "lax", secure: true });
  return res;
}
