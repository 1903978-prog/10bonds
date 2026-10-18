"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { flushNow, getConsent, setConsent, track } from "@/lib/track";

/** Consent banner plus page-view and named-click tracking. Nothing runs until the visitor accepts. */
export default function UsageStats() {
  const pathname = usePathname();
  const [consent, setC] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    const read = () => setC(getConsent());
    read();
    window.addEventListener("tb-consent", read);
    const onHide = () => flushNow();
    window.addEventListener("pagehide", onHide);
    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement | null)?.closest<HTMLElement>("a,button");
      if (!el) return;
      const label = (el.dataset.track ?? el.textContent ?? "").trim().slice(0, 60);
      const href = el instanceof HTMLAnchorElement ? el.getAttribute("href") : null;
      if (label) track("click", { label, href });
    };
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("tb-consent", read);
      window.removeEventListener("pagehide", onHide);
      document.removeEventListener("click", onClick, true);
    };
  }, []);

  useEffect(() => {
    if (consent === "yes") track("page_view", { referrer: document.referrer ? new URL(document.referrer).host : null });
  }, [pathname, consent]);

  if (consent !== null) return null;
  return (
    <div className="fixed inset-x-3 bottom-3 z-30 mx-auto max-w-xl rounded-2xl bg-white p-4 text-sm shadow-[0_8px_40px_rgba(0,0,0,0.15)] sm:p-5">
      <p className="leading-relaxed">
        May we count how the site is used (pages visited, searches, buttons clicked) to make it better? No ads and no
        third parties. You can change your mind anytime from the footer.
      </p>
      <div className="mt-3 flex gap-2">
        <button onClick={() => setConsent("yes")} className="rounded-full bg-accent px-4 py-2 font-medium text-white hover:bg-[#0077ed]">
          Allow
        </button>
        <button onClick={() => setConsent("no")} className="rounded-full bg-canvas px-4 py-2 font-medium hover:bg-line/60">
          No thanks
        </button>
      </div>
    </div>
  );
}

export function UsageStatsSetting() {
  return (
    <button
      onClick={() => {
        try {
          window.localStorage.removeItem("tb_consent");
        } catch {}
        window.dispatchEvent(new Event("tb-consent"));
      }}
      className="underline hover:text-ink"
    >
      Usage stats settings
    </button>
  );
}
