"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { trackOnce } from "@/lib/track";
import { fmtDate, loadMe, type Me } from "@/lib/me";

/**
 * Welcome pop-up after sign-up, the "confirm your e-mail" strip, and the result of a confirmation link.
 * An unconfirmed account (owner, 27/10/2026) sees a pop-up in the middle of the screen; behind it the page works like for a visitor
 * (bond names and ISIN codes blurred) until the address is confirmed. Admin is never blocked.
 */
const GATE = {
  en: { title: "Please confirm your e-mail", body: "We sent a confirmation e-mail to", after: "Click the button in it, then come back here. This page unlocks by itself.", spam: "No e-mail? Check your spam folder.", again: "Send again", sent: "Sent. Please check your inbox.", fail: "Could not send. Please try later." },
  it: { title: "Conferma la tua e-mail", body: "Abbiamo inviato un'e-mail di conferma a", after: "Clicca il pulsante nell'e-mail e torna qui. La pagina si sblocca da sola.", spam: "Nessuna e-mail? Controlla lo spam.", again: "Invia di nuovo", sent: "Inviata. Controlla la posta in arrivo.", fail: "Invio non riuscito. Riprova più tardi." },
  fr: { title: "Confirmez votre e-mail", body: "Nous avons envoyé un e-mail de confirmation à", after: "Cliquez sur le bouton, puis revenez ici. La page se débloque toute seule.", spam: "Pas d'e-mail ? Vérifiez vos spams.", again: "Renvoyer", sent: "Envoyé. Vérifiez votre boîte de réception.", fail: "Envoi impossible. Réessayez plus tard." },
  de: { title: "Bitte bestätige deine E-Mail", body: "Wir haben eine Bestätigungs-E-Mail gesendet an", after: "Klicke auf den Button und komm hierher zurück. Die Seite entsperrt sich von selbst.", spam: "Keine E-Mail? Prüfe den Spam-Ordner.", again: "Erneut senden", sent: "Gesendet. Bitte Posteingang prüfen.", fail: "Senden fehlgeschlagen. Bitte später erneut versuchen." },
} as const;

function gateLang(): keyof typeof GATE {
  const seg = window.location.pathname.split("/")[1];
  if (seg === "it" || seg === "fr" || seg === "de") return seg;
  const m = document.cookie.match(/(?:^|; )tb_lang=([a-z]{2})/);
  return m && m[1] in GATE ? (m[1] as keyof typeof GATE) : "en";
}

export default function AccountNotices() {
  const [gateOpen, setGateOpen] = useState(false);
  const [gateMsg, setGateMsg] = useState<string | null>(null);
  const [gateBusy, setGateBusy] = useState(false);
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

  const blocked = !!me && !me.isAdmin && !me.emailVerified && me.confirmationOn;
  const legalPage = typeof window !== "undefined" && /^\/(?:(?:it|fr|de)\/)?(terms|privacy|cookies|disclaimer)(\/|$)/.test(window.location.pathname);

  // While the pop-up is up, check every few seconds and when the tab is shown again; once confirmed, reload to unlock the data.
  useEffect(() => {
    if (!blocked) return;
    const check = async () => {
      const m = await fetch("/api/auth/me", { cache: "no-store" }).then((r) => r.json()).catch(() => null);
      if (m?.emailVerified) window.location.reload();
    };
    const id = setInterval(check, 4000);
    const vis = () => { if (document.visibilityState === "visible") check(); };
    document.addEventListener("visibilitychange", vis);
    window.addEventListener("focus", check);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", vis); window.removeEventListener("focus", check); };
  }, [blocked]);
  useEffect(() => { setGateOpen(blocked && !legalPage); }, [blocked, legalPage]);

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

  const g = GATE[typeof window === "undefined" ? "en" : gateLang()];
  return (
    <>
      {gateOpen && me && createPortal(
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="gate-title" data-testid="confirm-gate">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-xl">✉️</div>
            <h2 id="gate-title" className="mt-3 text-[18px] font-semibold text-ink">{g.title}</h2>
            <p className="mt-2 text-[14px] leading-snug text-ink/80">{g.body} <span className="break-all font-medium text-ink">{me.email}</span>. {g.after}</p>
            <p className="mt-2 text-[13px] text-mute">{g.spam}</p>
            <button
              disabled={gateBusy}
              data-testid="confirm-gate-resend"
              onClick={async () => {
                setGateBusy(true);
                const r = await fetch("/api/auth/resend-confirmation", { method: "POST" }).catch(() => null);
                setGateMsg(r?.ok ? g.sent : g.fail);
                setGateBusy(false);
              }}
              className="mt-4 w-full rounded-full bg-accent px-4 py-2.5 text-[15px] font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
            >{g.again}</button>
            <p className="mt-2 min-h-[18px] text-[13px] text-mute" aria-live="polite">{gateMsg ?? ""}</p>
          </div>
        </div>, document.body)}
      {confirmMsg && (
        <div className="fixed inset-x-3 top-16 z-30 mx-auto flex max-w-xl items-start justify-between gap-3 rounded-2xl bg-white p-4 text-sm shadow-[0_8px_40px_rgba(0,0,0,0.12)]" data-testid="confirm-result">
          <span>{confirmMsg}</span>
          <button onClick={() => { setConfirmed(null); clearQuery(); }} className="text-mute hover:text-ink" aria-label="Close">✕</button>
        </div>
      )}
      {false && me && (
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
      {welcome && me && !gateOpen && (() => {
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
