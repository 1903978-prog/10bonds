import { NextResponse } from "next/server";
import { SESSION_COOKIE, SESSION_DAYS, signSession } from "./session";

export function withSession(userId: number, body: unknown) {
  const token = signSession(userId);
  if (!token) return NextResponse.json({ error: "Sign-in is not available right now." }, { status: 503 });
  const res = NextResponse.json(body);
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 86400,
  });
  return res;
}

export async function readCredentials(req: Request): Promise<Record<"email" | "password" | "username" | "acceptTerms" | "challenge" | "nonce" | "website" | "code" | "newsletter" | "tz", unknown>> {
  try {
    const b = await req.json();
    return { email: b?.email, password: b?.password, username: b?.username, acceptTerms: b?.acceptTerms, challenge: b?.challenge, nonce: b?.nonce, website: b?.website, code: b?.code, newsletter: b?.newsletter, tz: b?.tz };
  } catch {
    return { email: null, password: null, username: null, acceptTerms: null, challenge: null, nonce: null, website: null, code: null, newsletter: null, tz: null };
  }
}
