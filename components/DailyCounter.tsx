"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { FINDER_TEXT } from "@/lib/finderText";
import { LOCALES } from "@/lib/seo/locales";
import { flushNow, track } from "@/lib/track";
import { QUOTA_EVENT, type Quota } from "./SearchQuota";

/**
 * Strip under the header menu on the finder pages: how many searches are left today (one counter for one-bond and
 * portfolio searches, reset at midnight Rome time). Fixed height, so the page never moves while it loads.
 */
export default function DailyCounter() {
  const pathname = usePathname() ?? "/";
  const lang = LOCALES.find((x) => pathname === `/${x}` || pathname.startsWith(`/${x}/`)) ?? "en";
  const t = FINDER_TEXT[lang];
  const [q, setQ] = useState<Quota | null | undefined>(undefined);
  useEffect(() => {
    fetch("/api/search-quota", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((j) => setQ(j?.portfolio ?? null)).catch(() => setQ(null));
    const on = (e: Event) => setQ((e as CustomEvent<Quota>).detail);
    window.addEventListener(QUOTA_EVENT, on);
    return () => window.removeEventListener(QUOTA_EVENT, on);
  }, []);
  const left = q && q.limit !== null ? Math.max(0, q.limit - q.used) : null;
  return (
    <div className="mx-auto flex h-6 max-w-6xl items-center justify-center gap-1.5 px-4 text-xs text-mute sm:px-6" data-tip="quota" data-testid="daily-counter">
      {q && (left !== null ? (
        <>
          <span className={left === 0 ? "text-red-700" : ""} data-testid="daily-left">{t.quotaLeft(left)}</span>
          <span aria-hidden="true">·</span>
          <Link href="/pricing" className="text-accent" onClick={() => { track("upgrade_click", { from: "quota_note", left }); flushNow(); }}>Plus</Link>
        </>
      ) : (
        <span data-testid="daily-left">{t.quotaUnlimited}</span>
      ))}
    </div>
  );
}
