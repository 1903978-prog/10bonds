"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { FinderLang } from "@/lib/finderText";
import type { WhyRow } from "@/lib/whyList";
import { SpSlot } from "@/components/RiskBadge";
import { GptRate, BR_HEAD, IR_HEAD } from "@/components/GptRate";
import { Spread, SPREAD_HEAD, SPREAD_NOTE } from "@/components/Spread";

// Small icon under the results: opens "why in or out" for the current search, every bond of the search window with
// the reason it is in the top 10 or not (Premium, Pro and admin; others see the Plans link). The table scrolls inside
// the window, so the page itself never scrolls.

const TEXT: Record<FinderLang, { open: string; title: string; sub: (n: number, k: number) => string; issuer: string; yld: string; risk: string; dur: string; surplus: string; why: string; close: string; loading: string; premium: string; plans: string; error: string; add: string; addHint: string }> = {
  en: { open: "Why these bonds?", title: "Why in or out", sub: (n, k) => `${k} in the top 10, ${n - k} left out, for this search.`, issuer: "Issuer", yld: "Return", risk: "Risk", dur: "Dur.", surplus: "Surplus", why: "Why", close: "Close", loading: "Loading…", premium: "The reasons behind every selection are a Premium feature.", plans: "See plans", error: "Could not load the reasons. Please try again.", add: "Add", addHint: "Adds it to your top 10 in place of the same issuer's bond, or the one with the lowest return after losses." },
  it: { open: "Perché queste obbligazioni?", title: "Perché dentro o fuori", sub: (n, k) => `${k} nella top 10, ${n - k} escluse, per questa ricerca.`, issuer: "Emittente", yld: "Rend.", risk: "Rischio", dur: "Dur.", surplus: "Surplus", why: "Perché", close: "Chiudi", loading: "Caricamento…", premium: "Le ragioni di ogni selezione sono una funzione Premium.", plans: "Vedi i piani", error: "Impossibile caricare le ragioni. Riprova.", add: "Aggiungi", addHint: "La aggiunge alla tua top 10 al posto del bond dello stesso emittente, o di quello con il rendimento dopo le perdite più basso." },
  fr: { open: "Pourquoi ces obligations ?", title: "Pourquoi dedans ou dehors", sub: (n, k) => `${k} dans le top 10, ${n - k} écartées, pour cette recherche.`, issuer: "Émetteur", yld: "Rdt", risk: "Risque", dur: "Dur.", surplus: "Surplus", why: "Pourquoi", close: "Fermer", loading: "Chargement…", premium: "Les raisons de chaque sélection sont une fonction Premium.", plans: "Voir les offres", error: "Impossible de charger les raisons. Réessayez.", add: "Ajouter", addHint: "L'ajoute à votre top 10 à la place de l'obligation du même émetteur, ou de celle au rendement après pertes le plus faible." },
  de: { open: "Warum diese Anleihen?", title: "Warum dabei oder nicht", sub: (n, k) => `${k} in den Top 10, ${n - k} ausgeschlossen, für diese Suche.`, issuer: "Emittent", yld: "Rendite", risk: "Risiko", dur: "Dur.", surplus: "Überschuss", why: "Warum", close: "Schließen", loading: "Lädt…", premium: "Die Gründe jeder Auswahl sind eine Premium-Funktion.", plans: "Pläne ansehen", error: "Die Gründe konnten nicht geladen werden. Bitte erneut versuchen.", add: "Hinzufügen", addHint: "Nimmt sie in Ihre Top 10 auf, anstelle der Anleihe desselben Emittenten oder der mit der niedrigsten Rendite nach Verlusten." },
};

type State = { rows: WhyRow[] } | { upgrade: true } | { error: true } | null;

/** `onAdd` (Premium, while the list can be edited): an Add button on each bond not in `inList`, the list on screen. */
export default function WhyTable({ query, lang = "en", inList, onAdd }: { query: string; lang?: FinderLang; inList?: string[]; onAdd?: (r: WhyRow) => void }) {
  const t = TEXT[lang];
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<State>(null);

  useEffect(() => {
    if (!open) return;
    const ctrl = new AbortController();
    setState(null);
    fetch(`/api/bonds/why?${query}`, { signal: ctrl.signal })
      .then(async (r) => (r.status === 402 ? setState({ upgrade: true }) : r.ok ? setState({ rows: (await r.json()).rows }) : setState({ error: true })))
      .catch((e) => e.name !== "AbortError" && setState({ error: true }));
    return () => ctrl.abort();
  }, [open, query]);
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open]);

  const rows = state && "rows" in state ? state.rows : null;
  const bp = rows?.some((r) => r.surplusBp !== undefined);
  // The S&P grade comes to the admin only: the same rows get the "GPT rate" column.
  const admin = rows?.some((r) => r.sp !== undefined);
  const n = (x: number | null | undefined, plus = false) => (x === null || x === undefined ? "–" : `${plus && x > 0 ? "+" : ""}${Math.round(x)}`);

  return (
    <>
      <button
        type="button" onClick={() => setOpen(true)} title={t.open} aria-label={t.open} data-testid="why-open"
        className="ml-auto inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line text-[13px] font-semibold text-mute hover:bg-canvas hover:text-ink"
      >
        ?
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label={t.title} onClick={() => setOpen(false)} data-testid="why-modal">
          <div className="flex max-h-[85vh] w-full max-w-5xl flex-col rounded-3xl bg-white p-5 shadow-[0_8px_40px_rgba(0,0,0,0.2)]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3">
              <div className="min-w-0">
                <h2 className="text-[17px] font-semibold">{t.title}</h2>
                <p className="text-xs text-mute">{rows ? t.sub(rows.length, rows.filter((r) => r.inTop).length) : " "}</p>
              </div>
              <button onClick={() => setOpen(false)} className="ml-auto rounded-full border border-line px-3 py-1 text-xs font-medium hover:bg-canvas">{t.close}</button>
            </div>
            <div className="mt-3 min-h-0 flex-1 overflow-auto">
              {!state && <p className="py-8 text-center text-sm text-mute">{t.loading}</p>}
              {state && "error" in state && <p className="py-8 text-center text-sm text-mute">{t.error}</p>}
              {state && "upgrade" in state && (
                <div className="py-8 text-center text-sm">
                  <p className="text-mute">{t.premium}</p>
                  <Link href="/pricing" className="mt-2 inline-block font-medium text-accent">{t.plans}</Link>
                </div>
              )}
              {rows && (
                <table className="w-full text-left text-[12px] tabular-nums">
                  <thead className="sticky top-0 bg-white text-mute">
                    <tr>
                      <th className="py-1 pr-2">#</th><th className="pr-2">{t.issuer}</th><th className="pr-2 text-right">{t.yld}</th><th className="pr-2 text-right">{t.risk}</th><th className="pr-2 text-right">{t.dur}</th>
                      {bp && <><th className="pr-2 text-right">{t.surplus}</th></>}
                      {admin && <><th className="w-14 pr-2 text-center text-amber-800">{IR_HEAD}</th><th className="w-14 pr-2 text-center text-amber-800">{BR_HEAD}</th><th className="w-16 pr-2 text-center text-amber-800" title={SPREAD_NOTE}>{SPREAD_HEAD}</th></>}
                      <th>{t.why}</th>
                      {onAdd && <th />}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.isin} className={`border-t border-line ${(inList ? inList.includes(r.isin) : r.inTop) ? "font-medium text-ink" : "text-mute"}`}>
                        <td className="py-1 pr-2">{r.inTop ? r.rank : "–"}</td>
                        <td className="max-w-[220px] truncate pr-2" title={r.name}>{r.issuer}</td>
                        <td className="pr-2 text-right">{r.ytm.toFixed(2)}</td>
                        <td className="whitespace-nowrap pr-2 text-right">{r.risk ?? "–"}{r.sp !== undefined && <> <SpSlot sp={r.sp} /></>}</td>
                        <td className="pr-2 text-right">{r.duration.toFixed(1)}</td>
                        {bp && <><td className="pr-2 text-right">{n(r.surplusBp, true)}</td></>}
                        {admin && <><td className="pr-2 text-center"><GptRate isin={r.isin} kind="ir" /></td><td className="pr-2 text-center"><GptRate isin={r.isin} /></td><td className="pr-2 text-center"><Spread ytm={r.ytm} years={r.duration} /></td></>}
                        <td>{r.why}</td>
                        {onAdd && (
                          <td className="py-0.5 pl-2 text-right">
                            {!inList?.includes(r.isin) && (
                              <button type="button" title={t.addHint} data-testid="why-add" onClick={() => { onAdd(r); setOpen(false); }} className="whitespace-nowrap rounded-full border border-line px-2.5 py-0.5 text-[11px] font-medium text-accent hover:bg-canvas">+ {t.add}</button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
