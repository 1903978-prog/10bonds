import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

// Sign-out buttons are plain forms (components/SignOutButton.tsx): the browser posts here and follows the redirect home,
// so signing out works even when a script fails. Scripts that call it with fetch still get JSON.
export async function POST(req: Request) {
  const form = (req.headers.get("content-type") ?? "").includes("application/x-www-form-urlencoded");
  const res = form ? NextResponse.redirect(new URL("/", req.url), 303) : NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
  res.headers.set("Cache-Control", "no-store");
  return res;
}
