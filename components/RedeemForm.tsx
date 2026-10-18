"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fmtDate, loadMe, type Me } from "@/lib/me";

export default function RedeemForm() {
  const [me, setMe] = useState<Me | undefined>(undefined);
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    loadMe().then(setMe);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const r = await fetch("/api/codes/redeem", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
    const b = await r.json().catch(() => ({}));
    setBusy(false);
    setMsg(r.ok ? { ok: true, text: `Done! You have Premium until ${fmtDate(b.premiumUntil)}.` } : { ok: false, text: b.error ?? "Something went wrong." });
  }

  return (
    <div className="mx-auto max-w-md rounded-[28px] bg-white p-7 shadow-[0_2px_20px_rgba(0,0,0,0.04)] sm:p-9">
      <h1 className="text-[28px] font-semibold tracking-tight">Redeem a code</h1>
      <p className="mt-2 text-[15px] text-mute">A 10BONDS code gives you Premium, with every feature, for free for the time stated with it.</p>
      {me === null ? (
        <p className="mt-6 text-[15px]">
          Please <Link href="/signup" className="text-accent">create a free account</Link> or <Link href="/login" className="text-accent">sign in</Link> first.
        </p>
      ) : (
        <form onSubmit={submit} className="mt-6 space-y-4">
          <input
            required
            placeholder="10B-XXXX-XXXX"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className="w-full rounded-xl border border-line px-4 py-3 font-mono text-[15px] uppercase outline-none focus:border-accent"
            data-testid="redeem-code"
          />
          {msg && <p className={`rounded-xl px-4 py-3 text-sm ${msg.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`} data-testid="redeem-msg">{msg.text}</p>}
          <button disabled={busy || me === undefined} className="w-full rounded-full bg-accent px-5 py-3 text-[15px] font-medium text-white hover:bg-[#0077ed] disabled:opacity-60">
            {busy ? "Please wait…" : "Redeem"}
          </button>
        </form>
      )}
    </div>
  );
}
