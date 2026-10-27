"use client";

import { useEffect } from "react";
import { closeCalcPopup, useCalcPopup, useGptRatings } from "@/lib/gptStore";

/** Admin only: the window that shows the full answer when one bond's IR / BR calculation returns. Mounted once for admins. */
export default function GptCalcPopup() {
  const p = useCalcPopup();
  const gpt = useGptRatings();
  useEffect(() => {
    if (!p) return;
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") closeCalcPopup(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [p]);
  if (!p) return null;
  const g = gpt[p.isin];
  const chip = (label: string, v?: string | null) => (
    <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900"><span className="mr-1 font-normal text-amber-800">{label}</span>{v ?? "–"}</span>
  );
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={closeCalcPopup} data-testid="gpt-popup">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-xl border border-amber-300 bg-white p-4 shadow-xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Calculated rating">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">{p.isin}</h2>
          <button type="button" onClick={closeCalcPopup} aria-label="Close" className="rounded-full px-2 text-lg leading-none text-mute hover:bg-canvas">×</button>
        </div>
        {p.error ? <p className="mb-2 text-xs font-medium text-red-700">{p.error}</p> : (
          <div className="mb-2 flex flex-wrap items-center gap-1.5">{chip("IR", g?.issuerRating)}{chip("BR", g?.rating)}{chip("Risk Pay", g?.riskPay)}<span className="text-[11px] text-mute">saved to the database and the table</span></div>
        )}
        {p.note && <p className="mb-2 text-xs font-medium text-amber-800" data-testid="gpt-popup-note">{p.note}</p>}
        <pre className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap rounded bg-canvas p-2 text-xs leading-relaxed" data-testid="gpt-popup-answer">{p.answer}</pre>
        <p className="mt-2 text-[11px] text-mute">Provisional scenario from a language model, not validated. Admin only, never used in rankings or shown to customers.{g?.model ? ` Model: ${g.model}.` : ""}</p>
      </div>
    </div>
  );
}
