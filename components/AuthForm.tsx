"use client";

import Link from "next/link";
import { useState } from "react";
import { solveChallenge } from "@/lib/solveChallenge";
import { flushNow, track } from "@/lib/track";
import TermsText from "./TermsText";

export default function AuthForm({ mode }: { mode: "signup" | "login" }) {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [accept, setAccept] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<string | null>(null);
  const [website, setWebsite] = useState("");
  const [code, setCode] = useState("");
  const [showCode, setShowCode] = useState(false);
  const signup = mode === "signup";

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
        body: JSON.stringify(signup ? { email, username, password, acceptTerms: accept, website, code: code.trim() || undefined, ...check } : { email, password }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Something went wrong.");
      track(signup ? "signup" : "login", null);
      flushNow();
      if (body.codeError) alert(body.codeError);
      window.location.href = signup ? (body.codeApplied ? "/?welcome=code" : "/?welcome=1") : "/";
    } catch (err) {
      setStep(null);
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md rounded-[24px] bg-white p-6 shadow-[0_2px_20px_rgba(0,0,0,0.04)] sm:p-7">
      <h1 className="text-[24px] font-semibold tracking-tight">{signup ? "Create your free account" : "Sign in"}</h1>
      <p className="mt-2 text-[15px] text-mute">
        {signup ? "See the full top 10 bonds for your goals. Free, no card needed." : "Welcome back."}
      </p>
      <form onSubmit={submit} className="mt-4 space-y-3">
        <label className="block">
          <span className="text-sm font-medium">{signup ? "Email" : "Email or username"}</span>
          <input
            type={signup ? "email" : "text"}
            required
            autoComplete={signup ? "email" : "username"}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-line px-3.5 py-2.5 text-[15px] outline-none focus:border-accent"
          />
        </label>
        {signup && (
          <label className="block">
            <span className="text-sm font-medium">Username</span>
            <input
              type="text"
              required
              minLength={3}
              maxLength={24}
              pattern="[A-Za-z0-9._\-]{3,24}"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-line px-3.5 py-2.5 text-[15px] outline-none focus:border-accent"
            />
            <span className="mt-1 block text-xs text-mute">3 to 24 letters, digits, dots, dashes or underscores.</span>
          </label>
        )}
        <label className="block">
          <span className="text-sm font-medium">Password</span>
          <input
            type="password"
            required
            minLength={signup ? 8 : undefined}
            autoComplete={signup ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-line px-3.5 py-2.5 text-[15px] outline-none focus:border-accent"
          />
          {signup && <span className="mt-1 block text-xs text-mute">At least 8 characters.</span>}
          {!signup && (
            <Link href="/forgot-password" className="mt-1.5 block text-right text-sm text-accent" data-testid="forgot-link">Forgot password?</Link>
          )}
        </label>
        {signup && (
          <div>
            {showCode ? (
              <label className="block">
                <span className="text-sm font-medium">10BONDS code <span className="font-normal text-mute">(optional)</span></span>
                <input
                  type="text"
                  placeholder="10B-XXXX-XXXX"
                  autoComplete="off"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="mt-1.5 w-full rounded-xl border border-line px-4 py-3 font-mono text-[15px] uppercase outline-none focus:border-accent"
                  data-testid="signup-code"
                />
                <span className="mt-1 block text-xs text-mute">A code gives you Premium free for the time stated with it.</span>
              </label>
            ) : (
              <button type="button" onClick={() => setShowCode(true)} className="text-sm text-accent" data-testid="signup-code-toggle">
                Have a code?
              </button>
            )}
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
          <div>
            <div className="max-h-32 overflow-y-auto rounded-xl border border-line bg-canvas p-4" data-testid="terms-box">
              <p className="mb-3 text-sm font-semibold">Terms of Use and Risk Disclosure</p>
              <TermsText compact />
            </div>
            <label className="mt-3 flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                required
                checked={accept}
                onChange={(e) => setAccept(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-[#0071e3]"
              />
              <span>
                I have read and accept the{" "}
                <Link href="/terms" target="_blank" className="text-accent">
                  Terms of Use and Risk Disclosure
                </Link>
                . I understand 10BONDS gives information only, not investment advice, and that I can lose money investing in bonds.
              </span>
            </label>
          </div>
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
