"use client";

import Link from "next/link";
import { useState } from "react";

export default function AuthForm({ mode }: { mode: "signup" | "login" }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const signup = mode === "signup";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Something went wrong.");
      window.location.href = "/";
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md rounded-[28px] bg-white p-7 shadow-[0_2px_20px_rgba(0,0,0,0.04)] sm:p-9">
      <h1 className="text-[28px] font-semibold tracking-tight">{signup ? "Create your free account" : "Sign in"}</h1>
      <p className="mt-2 text-[15px] text-mute">
        {signup ? "See the full top 10 bonds for your goals. Free, no card needed." : "Welcome back."}
      </p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <label className="block">
          <span className="text-sm font-medium">Email</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-line px-4 py-3 text-[15px] outline-none focus:border-accent"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Password</span>
          <input
            type="password"
            required
            minLength={signup ? 8 : undefined}
            autoComplete={signup ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-line px-4 py-3 text-[15px] outline-none focus:border-accent"
          />
          {signup && <span className="mt-1 block text-xs text-mute">At least 8 characters.</span>}
        </label>
        {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-full bg-accent px-5 py-3 text-[15px] font-medium text-white transition hover:bg-[#0077ed] disabled:opacity-60"
        >
          {busy ? "Please wait…" : signup ? "Create free account" : "Sign in"}
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
          10BONDS is an information service and does not give investment advice.
        </p>
      )}
    </div>
  );
}
