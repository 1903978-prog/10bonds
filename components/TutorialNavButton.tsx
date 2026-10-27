"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { LOCALES } from "@/lib/seo/locales";

const LABEL = { en: "Tutorial", it: "Tutorial", fr: "Tutoriel", de: "Tutorial" } as const;

/** Small "?" icon in the header: replays the page's tips tour. The slot is always there (invisible without a tour) so the menu never shifts. */
export default function TutorialNavButton() {
  const pathname = usePathname() ?? "/";
  const l = LOCALES.find((x) => pathname === `/${x}` || pathname.startsWith(`/${x}/`)) ?? "en";
  const [has, setHas] = useState(false);
  useEffect(() => {
    const check = () => setHas(document.documentElement.hasAttribute("data-tips-available"));
    check();
    const mo = new MutationObserver(check);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-tips-available"] });
    return () => mo.disconnect();
  }, [pathname]);
  return (
    <button
      type="button"
      aria-label={LABEL[l]}
      title={LABEL[l]}
      data-testid="nav-tutorial"
      tabIndex={has ? 0 : -1}
      onClick={() => window.dispatchEvent(new Event("tb:tutorial"))}
      className={`flex h-5 w-5 items-center justify-center hover:text-ink ${has ? "" : "invisible"}`}
    >
      <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="10" cy="10" r="7.5" /><path d="M7.9 7.8a2.2 2.2 0 1 1 3.1 2c-.7.4-1 .8-1 1.5M10 14h.01" /></svg>
    </button>
  );
}
