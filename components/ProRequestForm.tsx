"use client";

import Link from "next/link";
import { useState } from "react";
import { ProNotice } from "./ReplacementEngine";
import { REGULATORS } from "@/lib/proRegisters";
import { flushNow, track } from "@/lib/track";

const input = "mt-1 w-full rounded-xl border border-line px-4 py-3 text-[15px] outline-none focus:border-accent";

/** Short verification: firm, regulator, registration number, plus the business terms. Checked by hand before access opens. */
export default function ProRequestForm({ status, trialDays }: { status: "none" | "pending" | "rejected"; trialDays: number }) {
  const [state, setState] = useState(status);
  const [form, setForm] = useState({ firm: "", role: "", country: "", regulator: "", licence: "", website: "", registerUrl: "" });
  const [regId, setRegId] = useState("");
  const [declaration, setDeclaration] = useState(false);
  const [b2b, setB2b] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const r = await fetch("/api/pro/request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, declaration, b2bTerms: b2b }) });
    const b = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) return setError(b.error ?? "Something went wrong.");
    track("pro_request_sent", { country: form.country.slice(0, 40) });
    flushNow();
    setState("pending");
  }

  function pickRegulator(id: string) {
    setRegId(id);
    const r = REGULATORS.find((x) => x.id === id);
    if (r && id !== "other") setForm((s) => ({ ...s, regulator: r.label.split(" (")[0], country: s.country || r.country }));
    else setForm((s) => ({ ...s, regulator: "" }));
  }

  const f = (k: keyof typeof form, label: string, placeholder: string, required = true) => (
    <label className="block text-sm">
      <span className="text-mute">{label}</span>
      <input required={required} value={form[k]} placeholder={placeholder} onChange={(e) => setForm((s) => ({ ...s, [k]: e.target.value }))} className={input} data-testid={`pro-${k}`} />
    </label>
  );

  return (
    <div className="space-y-6" id="verify">
      <div className="mx-auto max-w-xl rounded-[28px] bg-white p-7 shadow-[0_2px_20px_rgba(0,0,0,0.04)] sm:p-9">
        <h2 className="text-[22px] font-semibold tracking-tight">Verify your firm</h2>
        <p className="mt-1 text-[15px] text-mute">Three details and two ticks. We match them to your regulator’s public register by hand. Then you get {trialDays} days free, no card needed.</p>

        {state === "pending" ? (
          <p className="mt-6 rounded-xl bg-accent/10 px-4 py-3 text-[15px] text-accent" data-testid="pro-pending">
            Thank you. We are checking your details against the public register. When they match, your {trialDays}-day free trial starts and the tool switches on for your account.
          </p>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            {state === "rejected" && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">We could not match your last request to a register. You can send it again with more details.</p>}
            {f("firm", "Firm name", "Legal name of your firm")}
            <label className="block text-sm">
              <span className="text-mute">Regulator</span>
              <select value={regId} onChange={(e) => pickRegulator(e.target.value)} required className={input} data-testid="pro-regulator-select">
                <option value="">Choose…</option>
                {REGULATORS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
              </select>
            </label>
            {regId === "other" && f("regulator", "Name of the regulator", "e.g. CNMV")}
            {f("licence", "Registration number", "Firm registration number on the register")}
            {f("country", "Country", "e.g. Italy")}
            {f("role", "Your role", "e.g. Wealth manager, Portfolio manager")}
            {f("registerUrl", "Link to your firm’s register entry (optional, speeds up checking)", "https://", false)}
            {f("website", "Firm website (optional)", "https://", false)}
            <label className="flex items-start gap-3 text-sm">
              <input type="checkbox" checked={declaration} onChange={(e) => setDeclaration(e.target.checked)} className="mt-1 h-4 w-4 accent-accent" data-testid="pro-declaration" />
              <span>
                I confirm that I work for a firm authorised to provide investment services, that I will use this tool only in my professional role
                (as a professional client or eligible counterparty under MiFID II), and that its results are screening information, not personal
                recommendations: I remain responsible for checking prices, liquidity and suitability before any trade.
              </span>
            </label>
            <label className="flex items-start gap-3 text-sm">
              <input type="checkbox" checked={b2b} onChange={(e) => setB2b(e.target.checked)} className="mt-1 h-4 w-4 accent-accent" data-testid="pro-b2b" />
              <span>I act for my firm and accept the <Link href="/pro/terms" target="_blank" className="text-accent">business terms for Pro</Link>.</span>
            </label>
            {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
            <button disabled={busy || !declaration || !b2b} className="w-full rounded-full bg-accent px-5 py-3 text-[15px] font-medium text-white hover:bg-[#0077ed] disabled:opacity-50" data-testid="pro-submit">
              {busy ? "Please wait…" : "Send for verification"}
            </button>
          </form>
        )}
      </div>
      <div className="mx-auto max-w-xl"><ProNotice /></div>
    </div>
  );
}
