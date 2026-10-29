"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { countOpposed, flushNow, getCategories, getConsent, reopenCookieBanner, setCategories, setCountOpposed, track, type Categories } from "@/lib/track";
import { COOKIE_TEXT, cookieLang, type CookieLang } from "@/lib/cookieText";

function browserZone(): string | null {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone ?? null; } catch { return null; }
}

/** Cookie banner (by category) plus page-view and named-click tracking, which run only with Statistics allowed. */
export default function UsageStats() {
  const pathname = usePathname();
  const [consent, setC] = useState<string | null | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState<Categories>({ preferences: false, statistics: false, marketing: false });
  const [lang, setLang] = useState<CookieLang>("en");
  const [opposed, setOpposed] = useState(false);
  const bonusDone = useRef(false);
  const [settings, setSettings] = useState(false); // Details: the purposes and the opt-out; the first view is a short notice

  useEffect(() => {
    const read = () => {
      const c = getCategories();
      setC(getConsent());
      if (c) setSel(c);
      setOpen(c === null);
    };
    read();
    setLang(cookieLang());
    setOpposed(countOpposed());
    const reopen = () => {
      const c = getCategories();
      if (c) setSel(c);
      setSettings(true);
      setOpen(true);
    };
    window.addEventListener("tb-consent", read);
    window.addEventListener("tb-cookie-open", reopen);
    const onHide = () => flushNow();
    window.addEventListener("pagehide", onHide);
    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement | null)?.closest<HTMLElement>("a,button");
      if (!el || el.closest("[data-cookie-banner]")) return;
      const label = (el.dataset.track ?? el.textContent ?? "").trim().slice(0, 60);
      const href = el instanceof HTMLAnchorElement ? el.getAttribute("href") : null;
      if (label) track("click", { label, href });
    };
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("tb-consent", read);
      window.removeEventListener("tb-cookie-open", reopen);
      window.removeEventListener("pagehide", onHide);
      document.removeEventListener("click", onClick, true);
    };
  }, []);

  useEffect(() => {
    // Statistics refused: a plain count per day, page and country is still added, with no identifier and nothing stored in the browser.
    if (consent === "no") {
      if (countOpposed()) return;
      const body = JSON.stringify({ path: window.location.pathname, tz: browserZone() });
      fetch("/api/count", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => {});
      return;
    }
    if (consent !== "yes") return;
    // Allowing Statistics earns one free week of Premium, once per account (the server decides).
    if (!bonusDone.current) {
      fetch("/api/account/stats-bonus", { method: "POST" }).then((r) => { if (r.ok) bonusDone.current = true; }).catch(() => {});
    }
    track("page_view", { referrer: document.referrer ? new URL(document.referrer).host : null, tz: browserZone(), lang: navigator.language?.slice(0, 12) ?? null });
  }, [pathname, consent]);

  if (!open) return null;
  const t = COOKIE_TEXT[lang];
  const choose = (c: Categories) => {
    setCategories(c);
    setOpen(false);
    setSettings(false);
  };
  // "I understand" keeps the anonymous basics only; visitor statistics need the switch (or Accept) inside Details.
  const understand = () => choose(settings ? sel : { preferences: false, statistics: false, marketing: false });
  const oppose = () => {
    const v = !opposed;
    setCountOpposed(v);
    setOpposed(v);
    if (v) choose({ preferences: false, statistics: false, marketing: false });
  };
  const policy = lang === "en" ? "/cookies" : `/cookies?lang=${lang}`;
  const btn = "rounded-full px-4 py-2 font-medium";
  return (
    <div
      data-cookie-banner
      data-testid="cookie-banner"
      role="dialog"
      aria-label={t.label}
      className="fixed inset-x-2 bottom-2 z-40 mx-auto max-h-[85vh] max-w-5xl overflow-y-auto rounded-lg border border-line bg-white px-4 py-3 text-[12px] shadow-[0_8px_40px_rgba(0,0,0,0.18)] sm:inset-x-4 sm:bottom-4 sm:text-[13px]"
    >
      {!settings ? (
        <>
        {/* Phones: one line and two buttons, under 15% of the screen. Reject opposes the audience count and stores nothing. */}
        <div className="flex flex-col gap-2 sm:hidden" data-testid="cookie-compact">
          <p className="leading-snug text-mute">{t.short} <button onClick={() => setSettings(true)} className="text-accent underline">{t.details}</button></p>
          <div className="flex gap-2">
            <button onClick={() => { setCountOpposed(true); setOpposed(true); choose({ preferences: false, statistics: false, marketing: false }); }} data-testid="cookie-reject" className={`${btn} flex-1 border border-line !py-1.5`}>{t.reject}</button>
            <button onClick={understand} data-testid="cookie-accept-compact" className={`${btn} flex-1 bg-accent text-white !py-1.5`}>{t.accept}</button>
          </div>
        </div>
        <div className="hidden flex-col gap-3 sm:flex sm:flex-row sm:items-center sm:gap-6">
          <p className="leading-snug text-mute">
            {t.notice} <Link href={policy} className="text-accent">{t.learn}</Link>
          </p>
          <div className="flex shrink-0 gap-2">
            <button onClick={() => setSettings(true)} data-testid="cookie-settings" className={`${btn} flex-1 border border-line hover:bg-canvas`}>{t.details}</button>
            <button onClick={understand} data-testid="cookie-accept" className={`${btn} flex-1 whitespace-nowrap bg-accent text-white hover:bg-[#0077ed]`}>{t.understand}</button>
          </div>
        </div>
        </>
      ) : (
        <>
          <p className="text-[15px] font-semibold">{t.title}</p>
          <ul className="mt-3 space-y-2">
            <li className="flex items-start justify-between gap-3 rounded-xl border border-line px-3 py-2.5">
              <span><span className="font-medium">{t.functional}</span><br /><span className="text-mute">{t.functionalText}</span></span>
              <label className="flex shrink-0 items-center gap-2 text-mute">{t.required}
                <input type="checkbox" role="switch" data-testid="cookie-necessary" checked disabled readOnly className="h-5 w-9 shrink-0 appearance-none rounded-full bg-accent opacity-70 before:block before:h-4 before:w-4 before:translate-x-[18px] before:translate-y-0.5 before:rounded-full before:bg-white" />
              </label>
            </li>
            <li className="flex items-start justify-between gap-3 rounded-xl border border-line px-3 py-2.5">
              <span><span className="font-medium">{t.audience}</span><br /><span className="text-mute">{opposed ? t.opposed : t.audienceText}</span></span>
              <button onClick={oppose} data-testid="cookie-oppose" className="shrink-0 text-accent hover:underline">{opposed ? t.allowAgain : t.oppose}</button>
            </li>
            <li className="flex items-start justify-between gap-3 rounded-xl border border-line px-3 py-2.5">
              <span><span className="font-medium">{t.visitor}</span><br /><span className="text-mute">{t.visitorText}</span></span>
              <input
                type="checkbox"
                role="switch"
                data-testid="cookie-statistics"
                aria-label={t.visitor}
                checked={sel.statistics}
                onChange={(e) => setSel({ ...sel, statistics: e.target.checked, preferences: e.target.checked })}
                className="h-5 w-9 shrink-0 cursor-pointer appearance-none rounded-full bg-line transition before:block before:h-4 before:w-4 before:translate-x-0.5 before:translate-y-0.5 before:rounded-full before:bg-white before:shadow before:transition checked:bg-accent checked:before:translate-x-[18px]"
              />
            </li>
          </ul>
          <div className="mt-3 flex items-center justify-between gap-3">
            <Link href={policy} className="text-accent">{t.policy}</Link>
            <button onClick={understand} data-testid="cookie-accept" className={`${btn} bg-accent text-white hover:bg-[#0077ed]`}>{t.understand}</button>
          </div>
        </>
      )}
    </div>
  );
}

export function UsageStatsSetting({ label = "Cookie settings", className = "underline hover:text-ink" }: { label?: string; className?: string }) {
  return (
    <button onClick={reopenCookieBanner} className={className}>
      {label}
    </button>
  );
}
