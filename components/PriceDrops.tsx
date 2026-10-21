"use client";

import { useState } from "react";
import { RiskBadge } from "@/components/RiskBadge";
import type { DropRow, DropsData } from "@/lib/priceHistory";
import { DROPS_TEXT, type DropsLang } from "@/lib/dropsText";

const ROWS = 10;

/** Biggest price drops from the highest recorded price: currency toggle, risk chips, and a table that always keeps 10 rows. */
export default function PriceDrops({ data, lang, admin = false }: { data: DropsData; lang: DropsLang; admin?: boolean }) {
  const t = DROPS_TEXT[lang];
  const [currency, setCurrency] = useState<"EUR" | "USD">("EUR");
  const [risk, setRisk] = useState<number | null>(null);
  const lists = data[currency];
  const rows: (DropRow | null)[] = risk === null ? lists.top : lists.byRisk[risk] ?? [];
  const padded = [...rows, ...Array<null>(Math.max(0, ROWS - rows.length)).fill(null)].slice(0, ROWS);
  const day = (iso: string) => new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString(t.locale, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  const num = (n: number, d = 2) => n.toLocaleString(t.locale, { minimumFractionDigits: d, maximumFractionDigits: d });

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-[26px] font-semibold tracking-tight sm:text-[30px]">{t.h1}</h1>
      <p className="mt-1 text-[14px] text-mute sm:text-[15px]">{t.intro}</p>

      <div className="mt-4 flex flex-wrap items-end gap-x-6 gap-y-3">
        <div>
          <div className="text-xs font-medium text-mute">{t.currency}</div>
          <div role="radiogroup" aria-label={t.currency} data-testid="drops-currency" className="mt-1 grid w-[132px] grid-cols-2 rounded-full bg-white p-0.5 text-[13px] font-medium shadow-sm">
            {(["EUR", "USD"] as const).map((c) => (
              <button key={c} type="button" role="radio" aria-checked={currency === c} onClick={() => setCurrency(c)} className={`rounded-full px-2 py-1 transition ${currency === c ? "bg-ink text-white" : "text-mute hover:text-ink"}`}>
                {c}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="text-xs font-medium text-mute">{t.risk}</div>
          <div role="radiogroup" aria-label={t.risk} data-testid="drops-risk" className="mt-1 flex gap-[3px] sm:gap-1">
            {[null, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((r) => {
              const has = r === null || (lists.byRisk[r]?.length ?? 0) > 0;
              const on = risk === r;
              return (
                <button
                  key={r ?? "all"}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  disabled={!has}
                  onClick={() => setRisk(r)}
                  className={`h-7 rounded-full text-[13px] font-medium tabular-nums transition disabled:cursor-not-allowed disabled:opacity-30 ${r === null ? "w-11 sm:w-14" : "w-[26px] sm:w-7"} ${on ? "bg-ink text-white" : "bg-white text-ink shadow-sm hover:bg-canvas"}`}
                >
                  {r ?? t.all}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <section className="mt-4 overflow-hidden rounded-2xl bg-white shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
        <div className="flex h-9 items-center px-4 text-[12px] font-medium text-mute" data-testid="drops-caption">{risk === null ? t.topAll : t.topRisk(risk)}</div>
        <table className="w-full table-fixed text-[13px] sm:text-sm">
          <thead>
            <tr className="h-8 border-y border-line/70 text-left text-[11px] uppercase tracking-wide text-mute">
              <th className="w-10 pl-4 font-medium">#</th>
              <th className="pr-3 font-medium">{t.issuer}</th>
              <th className="hidden pr-3 font-medium md:table-cell">{t.bond}</th>
              <th className="w-14 text-center font-medium">{t.risk}</th>
              <th className="hidden w-28 text-center font-medium sm:table-cell">{t.maturity}</th>
              <th className="w-16 text-right font-medium sm:w-20">{t.price}</th>
              {admin && <th className="hidden w-32 bg-yellow-50 text-right font-medium sm:table-cell" title="Admin only">52w min / max</th>}
              <th className="w-[72px] pr-4 text-right font-medium sm:w-24">{t.drop}</th>
            </tr>
          </thead>
          <tbody data-testid="drops-rows">
            {padded.map((r, i) => (
              <tr key={i} className="h-9 border-b border-line/40 last:border-0">
                {r ? (
                  <>
                    <td className="pl-4 text-mute tabular-nums">{i + 1}</td>
                    <td className="truncate pr-3 font-medium" title={r.issuer}>{r.issuer}</td>
                    <td className="hidden truncate pr-3 text-mute md:table-cell" title={r.name}>{r.name}</td>
                    <td className="text-center"><RiskBadge risk={r.risk} /></td>
                    <td className="hidden text-center tabular-nums sm:table-cell">{r.maturity ? day(r.maturity) : "–"}</td>
                    <td className="text-right tabular-nums">{num(r.price)}</td>
                    {admin && <td className="hidden bg-yellow-50 text-right tabular-nums text-mute sm:table-cell">{r.low52w == null ? "–" : num(r.low52w)} / {r.high52w == null ? "–" : num(r.high52w)}</td>}
                    <td className="pr-4 text-right font-medium tabular-nums text-[#dc2626]">{num(r.dropPct, 1)}%</td>
                  </>
                ) : (
                  <td colSpan={admin ? 8 : 7} className="px-4 text-center text-mute">{i === 0 ? t.none : ""}</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <p className="mt-3 text-[11px] leading-snug text-mute">
        {data.since && <span>{t.building(day(data.since))} </span>}
        <span>{t.indicative} </span>
      </p>
    </div>
  );
}
