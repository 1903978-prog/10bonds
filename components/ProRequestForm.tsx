"use client";

import { useState } from "react";
import { ProNotice } from "./ReplacementEngine";

const input = "mt-1 w-full rounded-xl border border-line px-4 py-3 text-[15px] outline-none focus:border-accent";

export default function ProRequestForm({ status }: { status: "none" | "pending" | "rejected" }) {
  const [state, setState] = useState(status);
  const [form, setForm] = useState({ firm: "", role: "", country: "", regulator: "", licence: "", website: "" });
  const [declaration, setDeclaration] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const r = await fetch("/api/pro/request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, declaration }) });
    const b = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) return setError(b.error ?? "Something went wrong.");
    setState("pending");
  }

  const f = (k: keyof typeof form, label: string, placeholder: string, required = true) => (
    <label className="block text-sm">
      <span className="text-mute">{label}</span>
      <input required={required} value={form[k]} placeholder={placeholder} onChange={(e) => setForm((s) => ({ ...s, [k]: e.target.value }))} className={input} data-testid={`pro-${k}`} />
    </label>
  );

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="rounded-[28px] bg-white p-7 shadow-[0_2px_20px_rgba(0,0,0,0.04)] sm:p-9">
        <p className="text-sm font-medium text-accent">For professional wealth managers</p>
        <h1 className="mt-1 text-[28px] font-semibold tracking-tight">Bond Replacement Engine</h1>
        <p className="mt-2 text-[15px] text-mute">
          Upload a client portfolio and see, bond by bond, which one to sell, which to buy and why: a higher yield or a lower risk level, based on the data shown.
          This tool is open to regulated professionals only, so we check every request by hand.
        </p>

        {state === "pending" ? (
          <p className="mt-6 rounded-xl bg-accent/10 px-4 py-3 text-[15px] text-accent" data-testid="pro-pending">
            Thank you. We are checking your details and will switch the tool on for your account soon.
          </p>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            {state === "rejected" && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">We could not confirm your last request. You can send it again with more details.</p>}
            {f("firm", "Firm", "Name of your firm")}
            {f("role", "Your role", "e.g. Wealth manager, Portfolio manager")}
            {f("country", "Country", "e.g. Italy")}
            {f("regulator", "Regulator", "e.g. CONSOB, BaFin, AMF, FCA")}
            {f("licence", "Licence or register number", "Firm or personal registration number")}
            {f("website", "Firm website (optional)", "https://", false)}
            <label className="flex items-start gap-3 text-sm">
              <input type="checkbox" checked={declaration} onChange={(e) => setDeclaration(e.target.checked)} className="mt-1 h-4 w-4 accent-accent" data-testid="pro-declaration" />
              <span>
                I confirm that I work for a firm authorised to provide investment services, that I will use this tool only in my professional role
                (as a professional client or eligible counterparty under MiFID II), and that its results are screening ideas, not personal
                recommendations: I remain responsible for checking prices, liquidity and suitability before any trade.
              </span>
            </label>
            {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
            <button disabled={busy || !declaration} className="w-full rounded-full bg-accent px-5 py-3 text-[15px] font-medium text-white hover:bg-[#0077ed] disabled:opacity-50" data-testid="pro-submit">
              {busy ? "Please wait…" : "Request professional access"}
            </button>
          </form>
        )}
      </div>
      <ProNotice />
    </div>
  );
}
