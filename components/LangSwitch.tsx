"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LANG_COOKIE, LOCALE, LOCALES, type Locale } from "@/lib/seo/locales";

// Language switcher in the header. The page shown is always in the language the visitor picked here; nothing
// redirects and no other language is ever suggested.

const remember = (l: Locale | "en") => {
  document.cookie = `${LANG_COOKIE}=${l}; Path=/; Max-Age=31536000; SameSite=Lax`;
};

/** The English (international) version: the page's x-default alternate when it has one, the home page otherwise. */
function englishTarget(): string {
  const link = document.querySelector<HTMLLinkElement>('link[rel="alternate"][hreflang="x-default"]');
  try {
    return link?.href ? new URL(link.href).pathname : "/";
  } catch {
    return "/";
  }
}

/** The same page in another language, read from the page's hreflang links; the language home otherwise. */
function targetFor(l: Locale): string {
  const link = document.querySelector<HTMLLinkElement>(`link[rel="alternate"][hreflang="${LOCALE[l].hreflang}"]`);
  if (link?.href) {
    try {
      return new URL(link.href).pathname;
    } catch {}
  }
  return `/${l}`;
}

export default function LangSwitch() {
  const pathname = usePathname();
  const current = LOCALES.find((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`)) ?? null;
  const [hrefs, setHrefs] = useState<Record<Locale, string>>({ it: "/it", fr: "/fr", de: "/de" });
  const [enHref, setEnHref] = useState("/");

  useEffect(() => {
    setHrefs({ it: targetFor("it"), fr: targetFor("fr"), de: targetFor("de") });
    setEnHref(current ? englishTarget() : pathname);
    remember(current ?? "en");
  }, [pathname, current]);

  return (
    <>
      <span className="hidden items-center gap-1.5 text-xs sm:flex" aria-label="Language">
        <Link href={enHref} hrefLang="en" onClick={() => remember("en")} className={current === null ? "font-semibold text-ink" : "hover:text-ink"} title="English" data-testid="lang-en">
          EN
        </Link>
        {LOCALES.map((l) => (
          <Link key={l} href={hrefs[l]} hrefLang={LOCALE[l].hreflang} onClick={() => remember(l)} className={l === current ? "font-semibold text-ink" : "hover:text-ink"} title={LOCALE[l].name}>
            {l.toUpperCase()}
          </Link>
        ))}
      </span>
    </>
  );
}

