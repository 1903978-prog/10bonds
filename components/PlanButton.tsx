"use client";
import { useState } from "react";

import { track, flushNow } from "@/lib/track";
import type { Interval, PaidPlan } from "@/lib/plans";

type Props = { plan: PaidPlan; interval?: Interval; highlight: boolean; label: string };

/** Starts Stripe checkout for a paid plan, after the EU "start now" request. */
export function PlanButton({ plan, interval = "month", highlight, label }: Props) {
  const [startNow, setStartNow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function go() {
    setBusy(true);
    setError("");
    track("plan_selected", { plan, interval });
    flushNow();
    try {
      const r = await fetch("/api/billing/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan, interval, startNow }) });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.url) {
        window.location.href = j.url;
        return;
      }
      setError(j.error || "Payment could not be started. Please try again later.");
    } catch {
      setError("Payment could not be started. Please try again later.");
    }
    setBusy(false);
  }
  return (
    <div className="mt-4">
      <label className="flex gap-1.5 text-left text-[11px] leading-snug text-mute">
        <input type="checkbox" className="mt-0.5" checked={startNow} onChange={(e) => setStartNow(e.target.checked)} data-testid={`start-now-${plan}`} />
        <span>Start my plan straight away. If I withdraw within 14 days, I pay for the days already used.</span>
      </label>
      <button
        onClick={go}
        disabled={!startNow || busy}
        data-testid={`buy-${plan}`}
        className={`mt-2 w-full rounded-full px-4 py-2 text-sm font-medium ${highlight ? "bg-accent text-white" : "bg-ink text-white"} disabled:opacity-50`}
      >
        {busy ? "Opening payment…" : label}
      </button>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}

/** Opens Stripe's own page to change plan, update the card, see invoices or cancel. */
export function ManageButton({ label = "Manage subscription" }: { label?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function go() {
    setBusy(true);
    setError("");
    const r = await fetch("/api/billing/portal", { method: "POST" }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    if (r?.ok && j.url) {
      window.location.href = j.url;
      return;
    }
    setError(j.error || "The subscription page could not be opened.");
    setBusy(false);
  }
  return (
    <div className="mt-7">
      <button onClick={go} disabled={busy} data-testid="manage-subscription" className="w-full rounded-full bg-canvas px-5 py-3 text-[15px] font-medium text-ink disabled:opacity-60">
        {busy ? "Opening…" : label}
      </button>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
