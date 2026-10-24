"use client";

import { useGptRatings } from "@/lib/gptStore";

/** Admin only: the "GPT rate" column header. */
export const GPT_HEAD = "GPT rate";

/** One bond's GPT rating in the yellow admin style (basis and date on hover), "–" when GPT gave none. Fixed width. */
export function GptRate({ isin }: { isin?: string | null }) {
  const gpt = useGptRatings();
  const g = isin ? gpt[isin] : undefined;
  const title = g ? [g.basis, g.at ? `GPT, ${g.at.slice(0, 10)}` : "GPT"].filter(Boolean).join(" · ") : undefined;
  return <span title={title} className={`inline-block min-w-[2.25rem] rounded px-1 text-center text-[11px] font-semibold tabular-nums ${g ? "bg-amber-100 text-amber-900" : "text-mute"}`} data-testid="gpt-rate">{g?.rating ?? "–"}</span>;
}
