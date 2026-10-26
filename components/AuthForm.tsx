"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { solveChallenge } from "@/lib/solveChallenge";
import { flushNow, track, trackOnce } from "@/lib/track";
import { NEWSLETTER_TEXT } from "@/lib/newsletterText";

// Sign-up agreement line: [before link, link text, after link], in the visitor's chosen language.
const AGREE = {
  en: ["By signing up I agree to the ", "Terms and Conditions", ""],
  it: ["Registrandomi accetto i ", "Termini e Condizioni", ""],
  fr: ["En m'inscrivant, j'accepte les ", "Conditions générales", ""],
  de: ["Mit der Registrierung stimme ich den ", "Allgemeinen Geschäftsbedingungen", " zu"],
} as const;
type AgreeLang = keyof typeof AGREE;

export default function AuthForm({ mode }: { mode: "signup" | "login" }) {
  const [email, setEmail] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [password, setPassword] = useState("");
  const [accept, setAccept] = useState(false);
  const [newsletter, setNewsletter] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<string | null>(null);
  const [website, setWebsite] = useState("");
  const [code, setCode] = useState("");
  const [ticket, setTicket] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const signup = mode === "signup";
  const [lang, setLang] = useState<AgreeLang>("en");
  useEffect(() => {
    const c = document.cookie.match(/(?:^|; )tb_lang=(\w+)/)?.[1];
    if (c && c in AGREE) setLang(c as AgreeLang);
  }, []);
  // After sign-in, back to the page that asked for it (same site only).
  const after = () => {
    const n = new URLSearchParams(window.location.search).get("next");
    return n && n.startsWith("/") && !n.startsWith("//") && !n.startsWith("/\\") ? n : "/";
  };

  async function submitCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/2fa", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ticket, code: otp }) });
      const body = await res.json().catch(() => ({}));
      if (body.expired) setTicket(null);
      if (!res.ok) throw new Error(body.error ?? "Something went wrong.");
      track("login", null);
      flushNow();
      window.location.href = after();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      let check: { challenge: string; nonce: string } | null = null;
      if (signup) {
        setStep("Checking you are not a robot…");
        const c = await fetch("/api/auth/challenge", { cache: "no-store" }).then((r) => r.json());
        if (!c?.challenge) throw new Error(c?.error ?? "Sign-up is not available right now.");
        check = { challenge: c.challenge, nonce: await solveChallenge(c.challenge, c.difficulty) };
        setStep(null);
      }
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(signup ? { email, password, acceptTerms: accept, newsletter, website, code: code.trim() || undefined, tz: Intl.DateTimeFormat().resolvedOptions().timeZone, ...check } : { email, password }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Something went wrong.");
      if (body.twoFactor) {
        setTicket(body.ticket);
        setBusy(false);
        return;
      }
      track(signup ? "signup" : "login", null);
      flushNow();
      if (body.codeError) alert(body.codeError);
      // Straight back to where sign-up was opened (the saved result is restored there); no intermediate page.
      const back = after();
      const q = body.codeApplied ? "welcome=code" : "welcome=1";
      window.location.href = signup ? `${back}${back.includes("?") ? "&" : "?"}${q}` : back;
    } catch (err) {
      setStep(null);
      setError((err as Error).message);
      setBusy(false);
    }
  }

  if (ticket)
    return (
      <div className="mx-auto max-w-md rounded-[24px] bg-white p-6 sm:p-7" data-testid="twofa-step">
        <h1 className="text-[24px] font-semibold tracking-tight">Enter your code</h1>
        <p className="mt-2 text-[15px] text-mute">Open your authenticator app and type the 6-digit code for 10BONDS. No phone? Use one of your backup codes.</p>
        <form onSubmit={submitCode} className="mt-4 space-y-3">
          <input
            autoFocus
            required
            inputMode="text"
            autoComplete="one-time-code"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            placeholder="123456"
            data-testid="twofa-code"
            className="w-full rounded-xl border border-line px-3.5 py-2.5 text-center font-mono text-[20px] tracking-[0.3em] outline-none focus:border-accent"
          />
          {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
          <button type="submit" disabled={busy} className="w-full rounded-full bg-accent px-5 py-3 text-[15px] font-medium text-white transition hover:bg-[#0077ed] disabled:opacity-60">{busy ? "Checking…" : "Sign in"}</button>
        </form>
      </div>
    );

  return (
    <div className="mx-auto max-w-md rounded-[24px] bg-white p-6 sm:p-7">
      <h1 className="text-[24px] font-semibold tracking-tight">{signup ? "Create your free account" : "Sign in"}</h1>
      <p className="mt-2 text-[15px] text-mute">
        {signup ? "Free, no card needed." : "Welcome back."}
      </p>
      <form onSubmit={submit} className="mt-4 space-y-3">
        <label className="block">
          <span className="text-sm font-medium">{signup ? "Email" : "Email or username"}</span>
          <input
            type={signup ? "email" : "text"}
            required
            autoComplete={signup ? "email" : "username"}
            value={email}
            onChange={(e) => { setEmail(e.target.value); if (signup) trackOnce("signup_started"); }}
            inputMode={signup ? "email" : undefined}
            autoCapitalize="none"
            autoCorrect="off"
            className="mt-1.5 w-full rounded-xl border border-line px-3.5 py-2.5 text-[15px] outline-none focus:border-accent"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Password</span>
          <div className="relative">
          <input
            type={showPw ? "text" : "password"}
            required
            minLength={signup ? 8 : undefined}
            autoComplete={signup ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={signup ? "At least 8 characters" : undefined}
            className="mt-1.5 w-full rounded-xl border border-line py-2.5 pl-3.5 pr-16 text-[15px] outline-none focus:border-accent"
          />
          <button type="button" onClick={() => setShowPw((v) => !v)} aria-pressed={showPw} className="absolute right-3 top-[calc(50%+3px)] -translate-y-1/2 text-xs font-medium text-accent">{showPw ? "Hide" : "Show"}</button>
          </div>
          {!signup && (
            <Link href="/forgot-password" className="mt-1.5 block text-right text-sm text-accent" data-testid="forgot-link">Forgot password?</Link>
          )}
        </label>
        {signup && (
          <div>
            <label className="block">
              <span className="text-sm font-medium">Promo code <span className="font-normal text-mute">(optional)</span></span>
              <input
                type="text"
                placeholder="10B-XXXX-XXXX"
                autoComplete="off"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="mt-1.5 w-full rounded-xl border border-line px-4 py-3 font-mono text-[15px] uppercase outline-none focus:border-accent"
                data-testid="signup-code"
              />
              <span className="mt-1 block text-xs text-mute">A valid promo code gives you 30 days of full access (Premium), free.</span>
            </label>
          </div>
        )}
        {signup && (
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            className="absolute left-[-9999px] h-px w-px opacity-0"
          />
        )}
        {signup && (
          <label className="flex min-h-[20px] items-center gap-3 text-sm" data-testid="terms-tick">
            <input
              type="checkbox"
              required
              checked={accept}
              onChange={(e) => setAccept(e.target.checked)}
              className="h-4 w-4 shrink-0 accent-[#0071e3]"
            />
            <span>
              {AGREE[lang][0]}
              <Link href="/terms" target="_blank" rel="noopener" className="text-accent">
                {AGREE[lang][1]}
              </Link>
              {AGREE[lang][2]}
            </span>
          </label>
        )}
        {signup && (
          <label className="flex min-h-[20px] items-center gap-3 text-sm" data-testid="newsletter-tick">
            <input
              type="checkbox"
              checked={newsletter}
              onChange={(e) => setNewsletter(e.target.checked)}
              className="h-4 w-4 shrink-0 accent-[#0071e3]"
            />
            <span>{NEWSLETTER_TEXT[lang].signup}</span>
          </label>
        )}
        {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
        <button
          type="submit"
          disabled={busy || (signup && !accept)}
          className="w-full rounded-full bg-accent px-5 py-3 text-[15px] font-medium text-white transition hover:bg-[#0077ed] disabled:opacity-60"
        >
          {busy ? step ?? "Please wait…" : signup ? "Create free account" : "Sign in"}
        </button>
      </form>
      <p className="mt-5 text-center text-sm text-mute">
        {signup ? (
          <>Already have an account? <Link href="/login" className="text-accent">Sign in</Link></>
        ) : (
          <>New here? <Link href="/signup" className="text-accent">Create a free account</Link></>
        )}
      </p>
      {signup && (
        <p className="mt-4 text-center text-xs leading-relaxed text-mute">
          Protected by a robot check that runs in your browser: no Google, no tracking. 10BONDS is an information service and does not give investment advice.
        </p>
      )}
    </div>
  );
}
