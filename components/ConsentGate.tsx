"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { flushNow, track } from "@/lib/track";
import { CONSENT_TEXT, CONSENT_VERSION, type ConsentLang } from "@/lib/consentText";

const KEY = "tb_agree";
const VID = "tb_agree_id";

function stored(): string | null {
  try { return localStorage.getItem(KEY); } catch { return null; }
}

/**
 * One-time agreement before the portfolio builder shows results (owner, 25/10/2026). Signed-in accounts are remembered
 * in the database, visitors in their own browser; a new wording version asks again. Admin can replay it with ?consent=1.
 * It sits above the page, so nothing on the page moves.
 */
export default function ConsentGate({ active, lang, isAdmin }: { active: boolean; lang: ConsentLang; isAdmin: boolean }) {
  const [known, setKnown] = useState<"unknown" | "yes" | "no">("unknown");
  const [replay, setReplay] = useState(false);
  const [ticked, setTicked] = useState(false);
  const [busy, setBusy] = useState(false);
  const box = useRef<HTMLInputElement>(null);
  const t = CONSENT_TEXT[lang];

  useEffect(() => {
    fetch("/api/consent", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((c) => setKnown(c?.signedIn ? (c.accepted ? "yes" : "no") : stored() === CONSENT_VERSION ? "yes" : "no"))
      .catch(() => setKnown(stored() === CONSENT_VERSION ? "yes" : "no"));
  }, []);
  useEffect(() => {
    if (isAdmin && new URLSearchParams(window.location.search).get("consent") === "1") setReplay(true);
  }, [isAdmin]);

  const open = (active && known === "no") || replay;
  useEffect(() => { if (open) box.current?.focus(); }, [open]);

  if (!open) return null;

  const agree = async () => {
    setBusy(true);
    let vid: string | null = null;
    try {
      vid = localStorage.getItem(VID) ?? crypto.randomUUID();
      localStorage.setItem(VID, vid);
      localStorage.setItem(KEY, CONSENT_VERSION);
    } catch {}
    if (!replay) await fetch("/api/consent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lang, visitorId: vid }) }).catch(() => null);
    if (!replay) { track("consent_box", { lang }); flushNow(); }
    setKnown("yes");
    setReplay(false);
    setBusy(false);
  };

  // Keep Tab inside the box while it is open.
  const trap = (e: React.KeyboardEvent) => {
    if (e.key !== "Tab") return;
    const els = Array.from(e.currentTarget.querySelectorAll<HTMLElement>("input,a,button:not([disabled])"));
    const first = els[0], last = els[els.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm" data-testid="consent-gate">
      <div role="dialog" aria-modal="true" aria-labelledby="consent-title" onKeyDown={trap} className="w-full max-w-sm rounded-lg border border-line bg-white p-6 shadow-xl">
        <h2 id="consent-title" className="text-[17px] font-semibold text-ink">{t.title}</h2>
        <ul className="mt-3 space-y-2 text-[14px] leading-snug text-ink/80">
          {t.points.map((p) => <li key={p}>{p}</li>)}
        </ul>
        <a href={lang === "en" ? "/selection-methodology" : `/selection-methodology?lang=${lang}`} target="_blank" rel="noopener" className="mt-3 inline-block text-[13px] text-accent hover:underline">{t.link}</a>
        <label className="mt-4 flex cursor-pointer items-center gap-2.5 text-[14px] text-ink">
          <input ref={box} type="checkbox" checked={ticked} onChange={(e) => setTicked(e.target.checked)} className="h-[18px] w-[18px] accent-accent" data-testid="consent-check" />
          {t.agree}
        </label>
        <button type="button" disabled={!ticked || busy} onClick={agree} data-testid="consent-continue" className="mt-4 w-full rounded-full bg-accent px-4 py-2.5 text-[15px] font-semibold text-white transition hover:opacity-90 disabled:opacity-40">
          {t.button}
        </button>
      </div>
    </div>,
    document.body,
  );
}
