"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LANG_COOKIE, localeFromAcceptLanguage, LOCALES, pathOf, T, type Locale } from "@/lib/seo/locales";

/**
 * "Knowledge" in the header opens the Knowledge Center in the visitor's language, with no picker: the language of
 * the page being read; on English pages the language the visitor chose (EN/IT/FR/DE), then the browser's language;
 * English otherwise.
 */
export default function KnowledgeNavLink() {
  const pathname = usePathname();
  const onPage = LOCALES.find((x) => pathname === `/${x}` || pathname.startsWith(`/${x}/`)) ?? null;
  const [l, setL] = useState<Locale | null>(onPage);

  useEffect(() => {
    if (onPage) return setL(onPage);
    const saved = document.cookie.match(new RegExp(`(?:^|; )${LANG_COOKIE}=([a-z]{2})`))?.[1] ?? null;
    if (saved === "en") return setL(null);
    if (saved && (LOCALES as readonly string[]).includes(saved)) return setL(saved as Locale);
    setL(localeFromAcceptLanguage(navigator.languages?.join(",") ?? navigator.language));
  }, [onPage]);

  return (
    <Link href={l ? pathOf(l, "knowledge") : "/knowledge"} className="hover:text-ink" data-testid="nav-knowledge">
      {l ? T[l].knowledge : "Knowledge"}
    </Link>
  );
}
