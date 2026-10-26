"use client";
import Link from "next/link";
import { useEffect } from "react";
import { useFinderText } from "@/lib/finderText";
import { flushNow, track, trackOnce } from "@/lib/track";

export type Quota = { kind: "single" | "portfolio"; limit: number | null; used: number; resetsAt: string | null };

/** Small line under the results: how many free searches are left this week. Nothing for unlimited plans. */
export function QuotaNote({ quota, className = "mt-3" }: { quota: Quota | null | undefined; className?: string }) {
  const t = useFinderText();
  if (!quota || quota.limit === null) return null;
  const left = Math.max(0, quota.limit - quota.used);
  return (
    <p className={`${className} text-center text-xs text-mute`} data-testid={`quota-${quota.kind}`}>
      {t.quotaLeft(left, quota.limit, quota.kind === "single")} · <Link href="/pricing" className="text-accent" onClick={() => { track("upgrade_click", { from: "quota_note", left }); flushNow(); }}>Plus</Link>
    </p>
  );
}

/** Shown instead of results when the weekly allowance is used up. */
export function LimitReached({ quota }: { quota: Quota }) {
  const t = useFinderText();
  useEffect(() => trackOnce("limit_reached", { kind: quota.kind }), [quota.kind]);
  const date = quota.resetsAt ? new Date(quota.resetsAt).toLocaleString(t.locale, { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }) : "—";
  return (
    <div className="rounded-2xl bg-canvas p-6 text-center" data-testid="limit-reached">
      <p className="font-semibold">{t.limitTitle}</p>
      <p className="mt-2 text-sm text-mute">{t.limitBody(quota.limit ?? 0, quota.kind === "single", date)}</p>
      <p className="mt-3 text-sm text-mute" data-testid="limit-plus">{t.limitPlus}</p>
      <p className="mt-1 text-xs text-mute">{t.limitFree}</p>
      <Link href="/pricing" onClick={() => { track("upgrade_click", { from: "limit_reached", kind: quota.kind }); flushNow(); }} className="mt-4 inline-block rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-[#0077ed]">
        {t.limitCta}
      </Link>
    </div>
  );
}
