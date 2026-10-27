"use client";
import Link from "next/link";
import { useEffect } from "react";
import { useFinderText } from "@/lib/finderText";
import { flushNow, track, trackOnce } from "@/lib/track";

export type Quota = { kind: "single" | "portfolio"; limit: number | null; used: number; resetsAt: string | null };

export const QUOTA_EVENT = "quota-update";

/** Draws nothing: hands the quota that came with a search to the counter in the header (components/DailyCounter.tsx). */
export function QuotaSync({ quota }: { quota: Quota | null | undefined }) {
  useEffect(() => {
    if (quota) window.dispatchEvent(new CustomEvent(QUOTA_EVENT, { detail: quota }));
  }, [quota]);
  return null;
}

/** Shown instead of results when the daily allowance is used up. */
export function LimitReached({ quota }: { quota: Quota }) {
  const t = useFinderText();
  useEffect(() => trackOnce("limit_reached", { kind: quota.kind }), [quota.kind]);
  return (
    <div className="rounded-lg bg-canvas p-6 text-center" data-testid="limit-reached">
      <p className="font-semibold">{t.limitTitle}</p>
      <p className="mt-2 text-sm text-mute">{t.limitBody(quota.limit ?? 0)}</p>
      <p className="mt-3 text-sm text-mute" data-testid="limit-plus">{t.limitPlus}</p>
      <p className="mt-1 text-xs text-mute">{t.limitFree}</p>
      <Link href="/pricing" onClick={() => { track("upgrade_click", { from: "limit_reached", kind: quota.kind }); flushNow(); }} className="mt-4 inline-block rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-[#0077ed]">
        {t.limitCta}
      </Link>
    </div>
  );
}
