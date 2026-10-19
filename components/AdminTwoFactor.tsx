"use client";

import { useEffect, useState } from "react";

type State = { state: "setup"; secret: string; qr: string } | { state: "needed" } | { state: "ok"; backupLeft: number } | null;

/** /admin before the admin powers open: turn on two-factor login, or enter a code for this browser. */
export default function AdminTwoFactor() {
  const [s, setS] = useState<State>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [backup, setBackup] = useState<string[] | null>(null);

  useEffect(() => {
    fetch("/api/admin/2fa", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then(setS).catch(() => {});
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!s || s.state === "ok") return;
    setBusy(true);
    setError(null);
    const r = await fetch("/api/admin/2fa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: s.state === "setup" ? "confirm" : "verify", code }),
    }).catch(() => null);
    const b = await r?.json().catch(() => ({}));
    setBusy(false);
    if (!r?.ok) return setError(b?.error ?? "Something went wrong.");
    if (b.backupCodes) setBackup(b.backupCodes);
    else window.location.reload();
  }

  const card = "mx-auto max-w-md rounded-[24px] bg-white p-6 shadow-[0_2px_20px_rgba(0,0,0,0.04)] sm:p-7";
  if (!s) return <div className={card}><p className="text-sm text-mute">Loading…</p></div>;

  if (backup)
    return (
      <div className={card} data-testid="twofa-backup">
        <h1 className="text-[22px] font-semibold tracking-tight">Two-factor login is on</h1>
        <p className="mt-2 text-[15px] text-mute">Save these backup codes somewhere safe (a password manager). Each works once, if your phone is not at hand. They are shown only now.</p>
        <ul className="mt-4 grid grid-cols-2 gap-2 font-mono text-[15px]" data-allow-copy>
          {backup.map((c) => <li key={c} className="rounded-lg bg-[#f5f5f7] px-3 py-2 text-center">{c}</li>)}
        </ul>
        <button onClick={() => window.location.reload()} className="mt-5 w-full rounded-full bg-accent px-5 py-3 text-[15px] font-medium text-white transition hover:bg-[#0077ed]">I saved them, open Admin</button>
      </div>
    );

  return (
    <div className={card} data-testid="twofa-admin">
      <h1 className="text-[22px] font-semibold tracking-tight">{s.state === "setup" ? "Turn on two-factor login" : "Enter your code"}</h1>
      {s.state === "setup" ? (
        <>
          <p className="mt-2 text-[15px] text-mute">Admin needs a code from an authenticator app (Google Authenticator, Microsoft Authenticator, 1Password…). Scan this QR code with the app, then type the 6-digit code it shows.</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={s.qr} alt="QR code for the authenticator app" width={220} height={220} className="mx-auto mt-4" data-testid="twofa-qr" />
          <p className="mt-2 text-center text-xs text-mute">Can't scan? Enter this key by hand: <span className="font-mono" data-allow-copy>{s.secret.match(/.{1,4}/g)?.join(" ")}</span></p>
        </>
      ) : (
        <p className="mt-2 text-[15px] text-mute">Type the 6-digit code from your authenticator app, or a backup code.</p>
      )}
      <form onSubmit={submit} className="mt-4 space-y-3">
        <input
          autoFocus
          required
          autoComplete="one-time-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="123456"
          data-testid="twofa-admin-code"
          className="w-full rounded-xl border border-line px-3.5 py-2.5 text-center font-mono text-[20px] tracking-[0.3em] outline-none focus:border-accent"
        />
        {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
        <button type="submit" disabled={busy} className="w-full rounded-full bg-accent px-5 py-3 text-[15px] font-medium text-white transition hover:bg-[#0077ed] disabled:opacity-60">{busy ? "Checking…" : s.state === "setup" ? "Turn on" : "Continue"}</button>
      </form>
    </div>
  );
}
