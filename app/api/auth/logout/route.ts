import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

// Sign-out buttons are plain forms posting here, so they work even before the page's scripts have loaded.
// The cookie is cleared with the same attributes it was set with, then the browser goes to the home page.
export async function POST() {
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
