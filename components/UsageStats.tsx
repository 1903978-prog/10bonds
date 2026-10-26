"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { flushNow, getCategories, getConsent, reopenCookieBanner, setCategories, track, type Categories } from "@/lib/track";

const ROWS: { key: keyof Categories | "necessary"; name: string; text: string }[] = [
  { key: "necessary", name: "Necessary", text: "Keep you signed in and remember this choice. The site does not work without them." },
  { key: "preferences", name: "Preferences", text: "Remember settings such as your last slider values." },
  { key: "statistics", name: "Statistics", text: "Count pages visited, time on each page, searches and buttons clicked, with an anonymous visitor number and your country, only to improve your experience on the site. Your data is never sold or shared with third parties. If you refuse, we only add one to a daily page count, with no identifier. Signed-in members who allow it get one free week of Premium." },
  { key: "marketing", name: "Marketing", text: "We use no marketing or advertising cookies today. If that changes we will ask again." },
];

function browserZone(): string | null {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone ?? null; } catch { return null; }
}

/** Cookie banner (by category) plus page-view and named-click tracking, which run only with Statistics allowed. */
export default function UsageStats() {
  const pathname = usePathname();
  const [consent, setC] = useState<string | null | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState<Categories>({ preferences: false, statistics: false, marketing: false });
  const [details, setDetails] = useState(false);
  const bonusDone = useRef(false);
  const [settings, setSettings] = useState(false); // the switches live in a second view; the first one is a short notice

  useEffect(() => {
    const read = () => {
      const c = getCategories();
      setC(getConsent());
      if (c) setSel(c);
      setOpen(c === null);
    };
    read();
    const reopen = () => {
      const c = getCategories();
      if (c) setSel(c);
      setDetails(true);
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
  const choose = (c: Categories) => {
    setCategories(c);
    setOpen(false);
    setSettings(false);
  };
  return (
    <div
      data-cookie-banner
      data-testid="cookie-banner"
      role="dialog"
      aria-label="Cookie settings"
      className="fixed inset-x-3 bottom-3 z-40 mx-auto max-h-[85vh] max-w-2xl overflow-y-auto rounded-2xl bg-white px-3 py-2.5 text-[12px] sm:text-[13px] shadow-[0_8px_40px_rgba(0,0,0,0.18)] sm:p-6"
    >
      <p className="hidden text-[15px] font-semibold sm:block">This website uses cookies</p>
      {/* Phones get one short line so the banner stays a slim bar at the bottom. */}
      <p className="leading-snug text-mute sm:hidden">
        We use a sign-in cookie and, if you allow it, count visits. We sell no data and use no advertising cookies.{" "}
        <Link href="/terms#privacy" className="text-accent">Privacy</Link>
      </p>
      <p className="mt-2 hidden leading-relaxed text-mute sm:block">
        We use a cookie to keep you signed in and, if you allow it, count how the site is used, only to improve your experience. We never sell your data to third parties and use no advertising cookies. Accept statistics, or open Customize to choose exactly what you allow.
        You can change your choice at any time with “Cookie settings” at the bottom of every page.{" "}
        <Link href="/terms#privacy" className="text-accent">Privacy details</Link>
      </p>
      {!settings ? (
        <div className="mt-2 grid grid-cols-2 gap-2 sm:mt-4">
          <button onClick={() => setSettings(true)} data-testid="cookie-settings" className="rounded-full border border-line px-2 py-1.5 font-medium hover:bg-canvas sm:px-4 sm:py-2.5">
            Customize
          </button>
          <button onClick={() => choose({ preferences: true, statistics: true, marketing: false })} data-testid="cookie-accept" className="rounded-full bg-accent px-2 py-1.5 font-medium text-white sm:px-4 sm:py-2.5 hover:bg-[#0077ed]">
            Accept statistics
          </button>
        </div>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {ROWS.map((r) => {
              const on = r.key === "necessary" ? true : sel[r.key];
              return (
                <label key={r.key} className="flex items-center justify-between gap-2 rounded-xl border border-line px-3 py-2.5">
                  <span className="font-medium">{r.name}</span>
                  <input
                    type="checkbox"
                    role="switch"
                    data-testid={`cookie-${r.key}`}
                    checked={on}
                    disabled={r.key === "necessary"}
                    onChange={(e) => r.key !== "necessary" && setSel({ ...sel, [r.key]: e.target.checked })}
                    className="h-5 w-9 shrink-0 cursor-pointer appearance-none rounded-full bg-line transition before:block before:h-4 before:w-4 before:translate-x-0.5 before:rounded-full before:bg-white before:shadow before:transition checked:bg-accent checked:before:translate-x-[18px] disabled:cursor-not-allowed disabled:opacity-70"
                  />
                </label>
              );
            })}
          </div>
          <button onClick={() => setDetails(!details)} className="mt-3 text-accent">
            {details ? "Hide details" : "Show details"}
          </button>
          {details && (
            <ul className="mt-2 space-y-1.5 text-mute">
              {ROWS.map((r) => (
                <li key={r.key}><span className="font-medium text-ink">{r.name}:</span> {r.text}</li>
              ))}
            </ul>
          )}
          <div className="mt-2 grid grid-cols-3 gap-2 sm:mt-4">
            <button onClick={() => choose({ preferences: false, statistics: false, marketing: false })} className="rounded-full border border-line px-2 py-1.5 font-medium hover:bg-canvas sm:px-4 sm:py-2.5">
              Necessary only
            </button>
            <button onClick={() => choose(sel)} className="rounded-full border border-line px-2 py-1.5 font-medium hover:bg-canvas sm:px-4 sm:py-2.5">
              Save selection
            </button>
            <button onClick={() => choose({ preferences: true, statistics: true, marketing: false })} className="rounded-full bg-accent px-2 py-1.5 font-medium text-white sm:px-4 sm:py-2.5 hover:bg-[#0077ed]">
              Accept statistics
            </button>
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
