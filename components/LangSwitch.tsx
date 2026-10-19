"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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
    // Only a language site is remembered on its own: opening a shared English page (sign-up, pricing) keeps the
    // visitor's language, so e-mails go out in it. Choosing EN is remembered by its click.
    if (current) remember(current);
    else if (pathname === "/") remember("en");
  }, [pathname, current]);

  const [open, setOpen] = useState(false);
  const box = useRef<HTMLSpanElement>(null);

  // Closes the menu on a click elsewhere, on Escape and on navigation.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  useEffect(() => setOpen(false), [pathname]);

  const others = [
    ...(current === null ? [] : [{ code: "en" as const, href: enHref, hreflang: "en", name: "English" }]),
    ...LOCALES.filter((l) => l !== current).map((l) => ({ code: l, href: hrefs[l], hreflang: LOCALE[l].hreflang, name: LOCALE[l].name })),
  ];

  return (
    <span ref={box} className="relative hidden text-xs sm:inline-block" aria-label="Language">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        title={current ? LOCALE[current].name : "English"}
        className="flex items-center gap-0.5 font-semibold text-ink"
        data-testid="lang-current"
      >
        {(current ?? "en").toUpperCase()}
        <svg viewBox="0 0 10 6" className={`h-1.5 w-2.5 text-mute transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true">
          <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <span role="menu" className="absolute left-1/2 top-full z-30 mt-2 flex -translate-x-1/2 flex-col rounded-lg border border-line bg-white py-1 shadow-lg">
          {others.map((o) => (
            <Link
              key={o.code}
              role="menuitem"
              href={o.href}
              hrefLang={o.hreflang}
              onClick={() => remember(o.code)}
              title={o.name}
              className="px-3 py-1.5 text-center hover:bg-line/40 hover:text-ink"
              data-testid={`lang-${o.code}`}
            >
              {o.code.toUpperCase()}
            </Link>
          ))}
        </span>
      )}
    </span>
  );
}
