"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LANG_COOKIE, LOCALE, LOCALES, suggestLocale, type Locale } from "@/lib/seo/locales";

// Language switcher in the header, plus a one-time suggestion on the international home page.
// Nothing ever redirects: the visitor chooses, and the choice is remembered in a small necessary cookie.

const remember = (l: Locale) => {
  document.cookie = `${LANG_COOKIE}=${l}; Path=/; Max-Age=31536000; SameSite=Lax`;
};
const saved = () => document.cookie.match(new RegExp(`(?:^|; )${LANG_COOKIE}=([a-z]{2})`))?.[1] ?? null;

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
  const [suggest, setSuggest] = useState<Locale | null>(null);

  useEffect(() => {
    setHrefs({ it: targetFor("it"), fr: targetFor("fr"), de: targetFor("de") });
    if (current) remember(current);
    if (pathname === "/" && !sessionStorageGet("tb_lang_dismissed")) setSuggest(suggestLocale(saved(), navigator.languages?.join(",") ?? navigator.language, null));
    else setSuggest(null);
  }, [pathname, current]);

  return (
    <>
      <span className="hidden items-center gap-1.5 text-xs sm:flex" aria-label="Language">
        {LOCALES.map((l) => (
          <Link key={l} href={hrefs[l]} hrefLang={LOCALE[l].hreflang} onClick={() => remember(l)} className={l === current ? "font-semibold text-ink" : "hover:text-ink"} title={LOCALE[l].name}>
            {l.toUpperCase()}
          </Link>
        ))}
      </span>
      {suggest && (
        <div className="fixed inset-x-3 top-16 z-30 mx-auto flex max-w-md items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 text-sm text-ink shadow-[0_8px_30px_rgba(0,0,0,0.12)]" data-testid="lang-suggest">
          <span>{{ it: "Questo sito è disponibile in italiano.", fr: "Ce site est disponible en français.", de: "Diese Seite gibt es auch auf Deutsch." }[suggest]}</span>
          <span className="flex shrink-0 gap-2">
            <Link href={`/${suggest}`} onClick={() => remember(suggest)} className="rounded-full bg-accent px-3 py-1.5 text-white">{LOCALE[suggest].name}</Link>
            <button onClick={() => { sessionStorageSet("tb_lang_dismissed", "1"); setSuggest(null); }} className="px-1 text-mute" aria-label="Close">✕</button>
          </span>
        </div>
      )}
    </>
  );
}

function sessionStorageGet(k: string) {
  try {
    return window.sessionStorage.getItem(k);
  } catch {
    return null;
  }
}
function sessionStorageSet(k: string, v: string) {
  try {
    window.sessionStorage.setItem(k, v);
  } catch {}
}
