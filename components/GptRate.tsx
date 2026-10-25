"use client";

import { useGptRatings } from "@/lib/gptStore";
import { bondNote } from "@/lib/bondNotes";
import { SCENARIO_CAVEAT, SCENARIO_SOURCE } from "@/lib/provisionalScenarios";

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
  const chip = <span title={note ?? title} className={`inline-block min-w-[3rem] rounded px-1 text-center text-[11px] font-semibold tabular-nums ${v ? "bg-amber-100 text-amber-900" : "text-mute"}`} data-testid={kind === "ir" ? "gpt-ir" : "gpt-rate"}>{v ?? "–"}</span>;
  if (!note) return chip;
  // the † sits over the chip's corner, so no cell changes width
  return <span className="relative inline-block">{chip}<span className="pointer-events-none absolute -right-0.5 -top-1 text-[10px] font-bold leading-none text-amber-700" data-testid="bond-note-mark">†</span></span>;
}
