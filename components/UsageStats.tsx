"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { flushNow, getCategories, getConsent, reopenCookieBanner, setCategories, track, type Categories } from "@/lib/track";

const ROWS: { key: keyof Categories | "necessary"; name: string; text: string }[] = [
  { key: "necessary", name: "Necessary", text: "Keep you signed in and remember this choice. The site does not work without them." },
  { key: "preferences", name: "Preferences", text: "Remember settings such as your last slider values." },
  { key: "statistics", name: "Statistics", text: "Count pages visited, searches and buttons clicked, so we can improve the site. No third parties." },
  { key: "marketing", name: "Marketing", text: "We use no marketing or advertising cookies today. If that changes we will ask again." },
];

/** Cookie banner (by category) plus page-view and named-click tracking, which run only with Statistics allowed. */
export default function UsageStats() {
  const pathname = usePathname();
  const [consent, setC] = useState<string | null | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState<Categories>({ preferences: false, statistics: false, marketing: false });
  const [details, setDetails] = useState(false);

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
    if (consent === "yes") track("page_view", { referrer: document.referrer ? new URL(document.referrer).host : null });
  }, [pathname, consent]);

  if (!open) return null;
  const choose = (c: Categories) => {
    setCategories(c);
    setOpen(false);
  };
  return (
    <div
      data-cookie-banner
      data-testid="cookie-banner"
      role="dialog"
      aria-label="Cookie settings"
      className="fixed inset-x-3 bottom-3 z-40 mx-auto max-h-[85vh] max-w-2xl overflow-y-auto rounded-2xl bg-white p-4 text-[13px] shadow-[0_8px_40px_rgba(0,0,0,0.18)] sm:p-6"
    >
      <p className="text-[15px] font-semibold">This website uses cookies</p>
      <p className="mt-2 leading-relaxed text-mute">
        We use cookies to keep you signed in and, if you allow it, to count how the site is used. You choose which kinds below.
        You can change your choice at any time with “Cookie settings” at the bottom of every page.{" "}
        <Link href="/terms#privacy" className="text-accent">Privacy details</Link>
      </p>
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
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <button onClick={() => choose({ preferences: false, statistics: false, marketing: false })} className="rounded-full border border-line px-4 py-2.5 font-medium hover:bg-canvas">
          Deny
        </button>
        <button onClick={() => choose(sel)} className="rounded-full border border-line px-4 py-2.5 font-medium hover:bg-canvas">
          Allow selection
        </button>
        <button onClick={() => choose({ preferences: true, statistics: true, marketing: true })} className="rounded-full bg-accent px-4 py-2.5 font-medium text-white hover:bg-[#0077ed]">
          Allow all
        </button>
      </div>
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
