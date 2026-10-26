"use client";

import { useEffect, useState } from "react";
import { trackOnce } from "@/lib/track";
import { fmtDate, loadMe, type Me } from "@/lib/me";

/**
 * Welcome pop-up after sign-up, the "confirm your e-mail" strip, and the result of a confirmation link.
 * An unconfirmed account is never locked out: it keeps using the site like a visitor until the address is confirmed.
 */
export default function AccountNotices() {
  const [me, setMe] = useState<Me | undefined>(undefined);
  const [welcome, setWelcome] = useState(false);
  const [withCode, setWithCode] = useState(false);
  const [confirmed, setConfirmed] = useState<string | null>(null);
  const [resend, setResend] = useState<string | null>(null);
  const [notYet, setNotYet] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    setWelcome(q.get("welcome") === "1" || q.get("welcome") === "code");
    setWithCode(q.get("welcome") === "code");
    setConfirmed(q.get("confirmed"));
    if (q.get("confirmed") === "1") trackOnce("email_verified");
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
      {welcome && me && (() => {
        // Not confirmed yet (the owner, 26/10/2026): the pop-up asks to confirm the e-mail first. It is still dismissable
        // ("Continue anyway"), because an unconfirmed account is never locked out.
        const verify = me.confirmationOn && !me.emailVerified;
        const done = () => { setWelcome(false); clearQuery(); };
        return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" data-testid="welcome-modal">
          <div className="w-full max-w-md rounded-[28px] bg-white p-7 text-center shadow-[0_8px_40px_rgba(0,0,0,0.2)] sm:p-9">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent/10 text-2xl">{verify ? "✉️" : "🎉"}</div>
            <h2 className="mt-4 text-[24px] font-semibold leading-tight tracking-tight">
              {verify ? "Please confirm your e-mail" : withCode ? "Your code is active!" : "Welcome to 10BONDS!"}
            </h2>
            {verify ? (
              <>
                <p className="mt-3 text-[15px] leading-relaxed text-mute">We sent a confirmation e-mail to <span className="font-medium text-ink">{me.email}</span>. Click the button in it to confirm your account, then come back here.</p>
                <p className="mt-3 text-sm text-mute">No e-mail? Check your spam folder or <button className="font-medium underline" disabled={resend === "sending"} data-testid="welcome-resend" onClick={async () => {
                  setResend("sending");
                  const r = await fetch("/api/auth/resend-confirmation", { method: "POST" });
                  const bd = await r.json().catch(() => ({}));
                  setResend(r.ok ? "Sent. Please check your inbox (and spam)." : bd.error ?? "Could not send.");
                }}>{resend && resend !== "sending" ? resend : "send it again"}</button>.</p>
                {notYet && <p className="mt-3 text-sm text-amber-800" data-testid="welcome-not-yet">Not confirmed yet. Please click the button in the e-mail.</p>}
                <button
                  disabled={checking}
                  onClick={async () => {
                    setChecking(true);
                    const m = await fetch("/api/auth/me", { cache: "no-store" }).then((r) => r.json()).catch(() => null);
                    setChecking(false);
                    if (m?.emailVerified) { setMe(m); done(); } else setNotYet(true);
                  }}
                  data-testid="welcome-confirmed"
                  className="mt-6 w-full rounded-full bg-accent px-5 py-3 text-[15px] font-semibold tracking-wide text-white hover:bg-[#0077ed] disabled:opacity-60"
                >
                  I’ve confirmed my e-mail
                </button>
                <button onClick={done} data-testid="welcome-skip" className="mt-3 text-xs text-mute underline">Continue anyway</button>
              </>
            ) : (
              <>
                <p className="mt-3 text-[15px] leading-relaxed text-mute">
                  {withCode ? <>You have full access free: ISIN codes, full bond details and every feature{me.premiumUntil ? `, until ${fmtDate(me.premiumUntil)}` : ""}.</> : "Your free account is ready. Upgrade any time on the Plans page for ISIN codes, full bond details and every feature."}
                </p>
                <p className="mt-3 text-[15px] leading-relaxed text-mute">
                  {withCode ? "After that, you’ll switch to our Free plan and will not be charged. No card needed." : "No card needed for the Free plan."}
                </p>
                <button
                  onClick={done}
                  className="mt-6 w-full rounded-full bg-accent px-5 py-3 text-[15px] font-semibold uppercase tracking-wide text-white hover:bg-[#0077ed]"
                >
                  Let’s get started!
                </button>
              </>
            )}
          </div>
        </div>
        );
      })()}
    </>
  );
}
