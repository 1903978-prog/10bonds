"use client";

import { calcGptRating, useGptCalc, useGptRatings } from "@/lib/gptStore";
import { bondNote } from "@/lib/bondNotes";
import { SCENARIO_CAVEAT, SCENARIO_SOURCE } from "@/lib/scenarioText";

/** Admin only: the "BR" (bond rating) and "IR" (issuer rating) column headers, both from GPT. */
export const BR_HEAD = "BR";
export const IR_HEAD = "IR";
export const GPT_HEAD = "BR";

/** One bond's GPT rating in the yellow admin style (basis and date on hover): the bond rating (BR) or issuer rating (IR), "–" when GPT gave none. Fixed width. */
export function GptRate({ isin, kind = "br" }: { isin?: string | null; kind?: "br" | "ir" }) {
  const gpt = useGptRatings();
  const g = isin ? gpt[isin] : undefined;
  const v = kind === "ir" ? g?.issuerRating : g?.rating;
  const title = v ? [g?.basis, g?.basis?.includes(SCENARIO_SOURCE) ? SCENARIO_CAVEAT : null, kind === "ir" ? "Issuer rating" : "Bond rating", g?.at ? `GPT, ${g.at.slice(0, 10)}` : "GPT"].filter(Boolean).join(" · ") : undefined;
  const note = kind === "br" ? bondNote(isin) : undefined;
  const calc = useGptCalc();
  const st = isin ? calc[isin] : undefined;
  const modelTip = kind === "br" && v && g?.model ? ` · Calculated by ${g.model}, provisional GPT scenario, not validated` : "";
  const chip = <span title={note ?? (title ? title + modelTip : undefined)} className={`inline-block min-w-[3rem] rounded px-1 text-center text-[11px] font-semibold tabular-nums ${v ? "bg-amber-100 text-amber-900" : "text-mute"}`} data-testid={kind === "ir" ? "gpt-ir" : "gpt-rate"}>{v ?? "–"}</span>;
  // the calculate button sits at the left edge of the IR chip (absolute, so no cell changes width)
  const btn = kind === "ir" && isin ? (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); void calcGptRating(isin); }}
      disabled={st?.busy}
      title={st?.error ?? "Calculate IR and BR with the API (provisional, admin only)"}
      aria-label="Calculate IR and BR"
      data-testid="gpt-calc"
      className={`absolute -left-3.5 top-1/2 flex h-3 w-3 -translate-y-1/2 items-center justify-center rounded-full text-[9px] font-bold leading-none ${st?.error ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-900 hover:bg-amber-200"}`}
    >
      {st?.busy ? <span className="inline-block h-2 w-2 animate-spin rounded-full border border-amber-700 border-t-transparent" /> : st?.error ? "!" : "↻"}
    </button>
  ) : null;
  if (btn) return <span className="relative inline-block">{btn}{chip}</span>;
  if (!note) return chip;
  // the † sits over the chip's corner, so no cell changes width
  return <span className="relative inline-block">{chip}<span className="pointer-events-none absolute -right-0.5 -top-1 text-[10px] font-bold leading-none text-amber-700" data-testid="bond-note-mark">†</span></span>;
}
