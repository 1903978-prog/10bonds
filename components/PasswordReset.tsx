"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { RESET_PAGE, resetLang, type ResetLang } from "@/lib/passwordResetText";

function useLang(): ResetLang {
  const [lang, setLang] = useState<ResetLang>("en");
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("lang");
    setLang(resetLang(q ?? navigator.language));
  }, []);
  return lang;
}

const box = "mx-auto max-w-md rounded-lg border border-line bg-white p-7 sm:p-9";
const input = "mt-1.5 w-full rounded-xl border border-line px-4 py-3 text-[15px] outline-none focus:border-accent";
const button = "w-full rounded-full bg-accent px-5 py-3 text-[15px] font-medium text-white transition hover:bg-[#0077ed] disabled:opacity-60";

export function ForgotForm() {
  const lang = useLang();
  const t = RESET_PAGE[lang];
  const [login, setLogin] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "sent" | "off">("idle");
  const [error, setError] = useState<string | null>(null);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("busy");
    setError(null);
    const res = await fetch("/api/auth/forgot", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ login, lang }) });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) { setError(body.error ?? "Error"); setState("idle"); return; }
    setState(body.off ? "off" : "sent");
  }
  return (
    <div className={box} lang={lang}>
      <h1 className="text-[28px] font-semibold tracking-tight">{t.forgotTitle}</h1>
      {state === "sent" || state === "off" ? (
        <p className="mt-4 text-[15px]" data-testid="forgot-done">{state === "sent" ? t.sent : t.off}</p>
      ) : (
        <form onSubmit={submit} className="mt-4 space-y-4">
          <p className="text-[15px] text-mute">{t.forgotLead}</p>
          <label className="block">
            <span className="text-sm font-medium">{t.login}</span>
            <input type="text" required autoComplete="username" value={login} onChange={(e) => setLogin(e.target.value)} className={input} />
          </label>
          {error && <p className="text-sm text-[#d70015]">{error}</p>}
          <button type="submit" disabled={state === "busy"} className={button}>{t.send}</button>
        </form>
      )}
      <p className="mt-6 text-sm"><Link href="/login" className="text-accent">{t.back}</Link></p>
    </div>
  );
}

export function ResetForm() {
  const lang = useLang();
  const t = RESET_PAGE[lang];
  const [password, setPassword] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "saved" | "bad">("idle");
  const [error, setError] = useState<string | null>(null);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("busy");
    setError(null);
    const token = new URLSearchParams(window.location.search).get("t");
    const res = await fetch("/api/auth/reset", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ t: token, password }) });
    const body = await res.json().catch(() => ({}));
    if (res.ok) return setState("saved");
    if (body.error === "bad") return setState("bad");
    setError(body.error ?? "Error");
    setState("idle");
  }
  return (
    <div className={box} lang={lang}>
      <h1 className="text-[28px] font-semibold tracking-tight">{t.resetTitle}</h1>
      {state === "saved" ? (
        <p className="mt-4 text-[15px]" data-testid="reset-done">{t.saved} <Link href="/login" className="text-accent">{t.back}</Link></p>
      ) : state === "bad" ? (
        <p className="mt-4 text-[15px]">{t.bad} <Link href={`/forgot-password?lang=${lang}`} className="text-accent">{t.again}</Link></p>
      ) : (
        <form onSubmit={submit} className="mt-4 space-y-4">
          <label className="block">
            <span className="text-sm font-medium">{t.password}</span>
            <input type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className={input} />
            <span className="mt-1 block text-xs text-mute">{t.hint}</span>
          </label>
          {error && <p className="text-sm text-[#d70015]">{error}</p>}
          <button type="submit" disabled={state === "busy"} className={button}>{t.save}</button>
        </form>
      )}
    </div>
  );
}
