"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { NEWSLETTER_TEXT, type NewsletterLang } from "@/lib/newsletterText";

/**
 * "Subscribe to the weekly bond selection newsletter" (the owner, 26/10/2026). Signed out: opens the sign-up page, where the
 * newsletter box stays unticked (opt-in is always explicit). Signed in: one click switches the newsletter on. Already
 * subscribed: a small confirmation. Fixed height, so nothing moves while the account is looked up.
 */
export default function NewsletterCta({ lang = "en", className = "" }: { lang?: NewsletterLang; className?: string }) {
  const t = NEWSLETTER_TEXT[lang];
  const [state, setState] = useState<"out" | "in" | "on">("out");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" }).then((r) => r.json()).then((u) => setState(u ? (u.newsletter ? "on" : "in") : "out")).catch(() => {});
  }, []);
  const look = `text-[13px] font-medium ${className}`;
  if (state === "on") return <span className={`${look} text-[#127052]`} data-testid="newsletter-cta">{t.done}</span>;
  if (state === "in") {
    return (
      <button type="button" disabled={busy} data-testid="newsletter-cta" className={`${look} text-left text-[#127052] underline underline-offset-2 hover:opacity-80 disabled:opacity-60`}
        onClick={async () => {
          setBusy(true);
          const r = await fetch("/api/account/newsletter", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ on: true }) }).catch(() => null);
          setBusy(false);
          if (r?.ok) setState("on");
        }}>
        {t.cta} →
      </button>
    );
  }
  return <Link href="/signup" data-testid="newsletter-cta" className={`${look} text-[#127052] underline underline-offset-2 hover:opacity-80`}>{t.cta} →</Link>;
}
