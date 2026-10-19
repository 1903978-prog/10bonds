import { NextResponse } from "next/server";
import { findUserById, markEmailVerified, usedPromoCode } from "@/lib/accounts";
import { emailTag, readConfirm } from "@/lib/confirm";
import { siteUrl } from "@/lib/email";
import { accessDaysLeft, requestLang, sendWelcome, welcomeLang } from "@/lib/welcomeEmail";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const c = readConfirm(q.get("t"));
  const back = (r: string) => NextResponse.redirect(`${siteUrl()}/?${r}`, 303);
  if (!c) return back("confirmed=invalid");
  try {
    const user = await findUserById(c.userId);
    if (!user || emailTag(user.email) !== c.tag) return back("confirmed=invalid");
    const first = !user.emailVerified;
    await markEmailVerified(user.id, user.email);
    // Welcome e-mail only on the first confirmation; it never holds up the redirect.
    // Free full access is mentioned only to accounts that used a promo code.
    const lang = q.get("lang") ? welcomeLang(q.get("lang")) : requestLang(req);
    if (first)
      void usedPromoCode(user.id)
        .then((code) => sendWelcome(user.email, user.username ?? user.email, lang, code ? accessDaysLeft(user.premiumUntil) : null))
        .then((r) => console.log("[confirm] welcome e-mail:", r))
        .catch(() => {});
    return back("confirmed=1");
  } catch {
    return back("confirmed=error");
  }
}
