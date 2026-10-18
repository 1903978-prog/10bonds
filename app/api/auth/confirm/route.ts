import { NextResponse } from "next/server";
import { findUserById, markEmailVerified } from "@/lib/accounts";
import { emailTag, readConfirm } from "@/lib/confirm";
import { siteUrl } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const c = readConfirm(new URL(req.url).searchParams.get("t"));
  const back = (q: string) => NextResponse.redirect(`${siteUrl()}/?${q}`, 303);
  if (!c) return back("confirmed=invalid");
  try {
    const user = await findUserById(c.userId);
    if (!user || emailTag(user.email) !== c.tag) return back("confirmed=invalid");
    await markEmailVerified(user.id, user.email);
    return back("confirmed=1");
  } catch {
    return back("confirmed=error");
  }
}
