"use client";
import { useState } from "react";

/** Small "Request a correction" form for issuers: a factual error on a report page. Stored for the admin, nothing is published automatically. */
export default function ReportCorrection({ isin }: { isin: string }) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [err, setErr] = useState("");
  const field = "mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-[15px]";
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setState("sending");
    const r = await fetch("/api/corrections", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isin, name: f.get("name"), email: f.get("email"), message: f.get("message"), website: f.get("website") }) }).catch(() => null);
    if (r?.ok) return setState("sent");
    setErr((await r?.json().catch(() => null))?.error ?? "Could not send. Please try again.");
    setState("error");
  }
  return (
    <details className="mt-5 text-[14px] text-mute print:hidden" data-testid="correction">
      <summary className="cursor-pointer">Request a correction</summary>
      {state === "sent" ? <p className="mt-3 text-ink" role="status">Thank you. We review documented requests to correct factual errors.</p> : (
        <form onSubmit={submit} className="mt-3 max-w-lg space-y-3">
          <p>Issuers and other readers can ask us to correct a factual inaccuracy on this page ({isin}).</p>
          <label className="block">Name and company<input name="name" required maxLength={120} className={field} /></label>
          <label className="block">E-mail<input name="email" type="email" required maxLength={200} className={field} /></label>
          <label className="block">What is wrong, and a document or link that shows it<textarea name="message" required minLength={10} maxLength={3000} rows={4} className={field} /></label>
          <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
          {state === "error" && <p className="text-[#b42318]" role="alert">{err}</p>}
          <button type="submit" disabled={state === "sending"} className="inline-flex min-h-[40px] items-center rounded-full bg-ink px-5 text-[14px] font-medium text-white disabled:opacity-60">Send</button>
        </form>
      )}
    </details>
  );
}
