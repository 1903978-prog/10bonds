import { NextResponse } from "next/server";
import { accountsConfigured, hasConsent, recordConsent } from "@/lib/accounts";
import { CONSENT_TEXT, CONSENT_VERSION, type ConsentLang } from "@/lib/consentText";
import { currentUser } from "@/lib/currentUser";
import { allow, clientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";
const KIND = "portfolio_builder";
const NO_STORE = { "Cache-Control": "no-store" };

/** For a signed-in account: has it already agreed to the current wording? Visitors keep their answer in their own browser. */
export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ signedIn: false, accepted: false }, { headers: NO_STORE });
  const accepted = await hasConsent(user.id, KIND, CONSENT_VERSION).catch(() => false);
  return NextResponse.json({ signedIn: true, accepted }, { headers: NO_STORE });
}

/** Stores the agreement with the wording shown (the server takes the text from its own copy, never from the browser). */
export async function POST(req: Request) {
  if (!accountsConfigured() || !allow(`consent:${clientIp(req)}`, 20, 60 * 60_000)) return NextResponse.json({ ok: false }, { status: 429 });
  const b = await req.json().catch(() => null);
  const lang: ConsentLang = b?.lang === "it" || b?.lang === "fr" || b?.lang === "de" ? b.lang : "en";
  const vid = typeof b?.visitorId === "string" && /^[\w-]{8,64}$/.test(b.visitorId) ? b.visitorId : null;
  const user = await currentUser();
  const t = CONSENT_TEXT[lang];
  const text = [t.title, ...t.points, t.agree].join(" | ");
  try {
    await recordConsent({ userId: user?.id ?? null, visitorId: vid, kind: KIND, version: CONSENT_VERSION, lang, text });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  return NextResponse.json({ ok: true }, { headers: NO_STORE });
}
