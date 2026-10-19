"use client";

import { useEffect, useState } from "react";
import { fmtDate, loadMe, type Me } from "@/lib/me";

/** Welcome pop-up after sign-up, the "confirm your e-mail" strip, and the result of a confirmation link. */
export default function AccountNotices() {
  const [me, setMe] = useState<Me | undefined>(undefined);
  const [welcome, setWelcome] = useState(false);
  const [withCode, setWithCode] = useState(false);
  const [confirmed, setConfirmed] = useState<string | null>(null);
  const [resend, setResend] = useState<string | null>(null);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    setWelcome(q.get("welcome") === "1" || q.get("welcome") === "code");
    setWithCode(q.get("welcome") === "code");
    setConfirmed(q.get("confirmed"));
    loadMe().then(setMe);
  }, []);

  const clearQuery = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete("welcome");
    url.searchParams.delete("confirmed");
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
  };

  const confirmMsg =
    confirmed === "1" ? "Thank you, your e-mail address is confirmed." :
    confirmed === "deleted" ? "Your account and all its data have been deleted." :
    confirmed === "invalid" ? "This confirmation link is not valid or has expired. Use “Send again” to get a new one." :
    confirmed === "error" ? "We could not confirm your address just now. Please try the link again later." : null;

  // After the 3-hour grace period an unconfirmed account sees only this screen (legal pages stay readable).
  const legal = typeof window !== "undefined" && /^\/(privacy|terms|cookies|disclaimer|methodology)(\/|$)/.test(window.location.pathname);
  if (me?.confirmBlocked && !legal) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white p-4" role="dialog" aria-modal="true" data-testid="confirm-block">
      <div className="w-full max-w-sm text-center">
        <h2 className="text-[20px] font-semibold tracking-tight">Confirm your e-mail</h2>
        <p className="mt-2 text-sm text-mute">To keep using 10BONDS, click the link we sent to {me.email}.</p>
        <button
          disabled={resend === "sending"}
          onClick={async () => {
            setResend("sending");
            const r = await fetch("/api/auth/resend-confirmation", { method: "POST" });
            const b = await r.json().catch(() => ({}));
            setResend(r.ok ? "Sent. Please check your inbox (and spam)." : b.error ?? "Could not send.");
          }}
          className="mt-5 w-full rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0077ed]"
        >
          Send again
        </button>
        {resend && resend !== "sending" && <p className="mt-2 text-xs text-mute">{resend}</p>}
        <button
          onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); window.location.href = "/"; }}
          className="mt-4 text-xs text-mute underline hover:text-ink"
        >
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {confirmMsg && (
        <div className="fixed inset-x-3 top-16 z-30 mx-auto flex max-w-xl items-start justify-between gap-3 rounded-2xl bg-white p-4 text-sm shadow-[0_8px_40px_rgba(0,0,0,0.12)]" data-testid="confirm-result">
          <span>{confirmMsg}</span>
          <button onClick={() => { setConfirmed(null); clearQuery(); }} className="text-mute hover:text-ink" aria-label="Close">✕</button>
        </div>
      )}
      {me && !me.emailVerified && me.confirmationOn && !welcome && !confirmMsg && (
        <div className="mb-2 ml-auto flex w-fit max-w-full flex-wrap items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs text-amber-900" data-testid="confirm-strip">
          <span>Please confirm your e-mail ({me.email}).</span>
          <button
            disabled={resend === "sending"}
            onClick={async () => {
              setResend("sending");
              const r = await fetch("/api/auth/resend-confirmation", { method: "POST" });
              const b = await r.json().catch(() => ({}));
              setResend(r.ok ? "Sent. Please check your inbox (and spam)." : b.error ?? "Could not send.");
            }}
            className="font-medium underline"
          >
            {resend && resend !== "sending" ? resend : "Send again"}
          </button>
        </div>
      )}
      {welcome && me && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" data-testid="welcome-modal">
          <div className="w-full max-w-md rounded-[28px] bg-white p-7 text-center shadow-[0_8px_40px_rgba(0,0,0,0.2)] sm:p-9">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent/10 text-2xl">🎉</div>
            <h2 className="mt-4 text-[24px] font-semibold leading-tight tracking-tight">
              {withCode ? "Your code is active!" : "Welcome to 10BONDS!"}
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-mute">
              {withCode ? <>You have full access free: ISIN codes, full bond details and every feature{me.premiumUntil ? `, until ${fmtDate(me.premiumUntil)}` : ""}.</> : "Your free account is ready. Upgrade any time on the Pricing page for ISIN codes, full bond details and every feature."}
            </p>
            <p className="mt-3 text-[15px] leading-relaxed text-mute">
              {withCode ? "After that, you’ll switch to our Free plan and will not be charged. No card needed." : "No card needed for the Free plan."}
            </p>
            {me.confirmationOn && !me.emailVerified && (
              <p className="mt-3 text-sm text-mute">We also sent you an e-mail: click the button in it to confirm your account.</p>
            )}
            <button
              onClick={() => { setWelcome(false); clearQuery(); }}
              className="mt-6 w-full rounded-full bg-accent px-5 py-3 text-[15px] font-semibold uppercase tracking-wide text-white hover:bg-[#0077ed]"
            >
              Let’s get started!
            </button>
          </div>
        </div>
      )}
    </>
  );
}
