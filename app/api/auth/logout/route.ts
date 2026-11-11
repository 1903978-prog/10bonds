import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { accountsConfigured, revokeSessions } from "@/lib/accounts";
import { readSession, SESSION_COOKIE } from "@/lib/session";

// Sign-out buttons are plain forms posting here, so they work even before the page's scripts have loaded.
// The cookie is cleared with the same attributes it was set with, then the browser goes to the home page.
export async function POST() {
  // Signing out ends every session of the account, so a copied cookie stops working too. Failure must not block the sign-out.
  try {
    const id = readSession((await cookies()).get(SESSION_COOKIE)?.value);
    if (id !== null && accountsConfigured()) await revokeSessions(id);
  } catch (e) {
    console.error("[logout] revoke failed:", (e as Error).message);
  }
  // A relative Location: behind the proxy the request URL names the internal host, not 10bonds.com.
  const res = new NextResponse(null, { status: 303, headers: { Location: "/" } });
  res.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  res.headers.set("Cache-Control", "no-store");
  return res;
}
