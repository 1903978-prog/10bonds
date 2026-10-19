"use client";

import { useState } from "react";
import { fmtDate } from "@/lib/me";

/** "Have a code?" on the pricing page, for people who already have an account (new accounts enter it at sign-up). */
export default function RedeemForm() {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const r = await fetch("/api/codes/redeem", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
    const b = await r.json().catch(() => ({}));
    setBusy(false);
    setMsg(r.ok ? { ok: true, text: `Done! You have Premium until ${fmtDate(b.premiumUntil)}.` } : { ok: false, text: b.error ?? "Something went wrong." });
    if (r.ok) setTimeout(() => window.location.reload(), 1500);
  }

  if (!open)
    return (
      <p className="mt-3 text-center text-xs">
        <button type="button" onClick={() => setOpen(true)} className="text-accent" data-testid="redeem-toggle">Have a code?</button>
      </p>
    );
  return (
    <form onSubmit={submit} className="mx-auto mt-3 flex max-w-md flex-col gap-2 sm:flex-row" data-testid="redeem-form">
      <input
        required
        autoFocus
        placeholder="10B-XXXX-XXXX"
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        className="min-w-0 flex-1 rounded-xl border border-line bg-white px-3 py-2 font-mono text-sm uppercase outline-none focus:border-accent"
        data-testid="redeem-code"
      />
      <button disabled={busy} className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-white hover:bg-[#0077ed] disabled:opacity-60">
        {busy ? "Please wait…" : "Use code"}
      </button>
      {msg && <p className={`basis-full rounded-xl px-4 py-3 text-sm sm:order-last ${msg.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`} data-testid="redeem-msg">{msg.text}</p>}
    </form>
  );
}
