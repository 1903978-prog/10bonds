"use client";

import { useState } from "react";
import { RiskBadge } from "@/components/RiskBadge";
import { GptRate, BR_HEAD, IR_HEAD } from "@/components/GptRate";
import { Spread, SPREAD_HEAD, SPREAD_NOTE } from "@/components/Spread";
import type { DropRow, DropsData, SortKey } from "@/lib/priceHistory";
import { DROPS_TEXT, type DropsLang } from "@/lib/dropsText";

const ROWS = 10;
const PAGES = 10;
// The quick ranking choice; every move column can also be clicked to sort.
const RANKS = [["ytm", "ytm"], ["vsMax", "rankDrop"], ["gain1y", "gain1y"]] as const;
const MOVES: SortKey[] = ["vsMax", "vsMin", "d1w", "d1m"];
const HIGHEST_FIRST: SortKey[] = ["ytm", "gain1y"]; // as sorted in lib/priceHistory

/** Admin-only price moves: currency toggle, risk chips, sortable move columns, and a table that always keeps 10 rows. */
/** Years from today to a maturity date (the price-drop rows carry no duration). */
const yearsLeft = (m: string | null) => (m && Number.isFinite(Date.parse(m)) ? (Date.parse(m) - Date.now()) / (365.25 * 86_400_000) : null);

export default function PriceDrops({ data, lang }: { data: DropsData; lang: DropsLang }) {
  const t = DROPS_TEXT[lang];
  const [currency, setCurrency] = useState<"EUR" | "USD">("EUR");
  const [risk, setRisk] = useState<number | null>(null);
  const [sort, setSortKey] = useState<SortKey>("vsMax");
  const [page, setPage] = useState(0);
  const lists = data[currency][sort];
  const ids = risk === null ? lists.top : lists.byRisk[risk] ?? [];
  const pages = Math.max(1, Math.min(PAGES, Math.ceil(ids.length / ROWS)));
  const at = Math.min(page, pages - 1);
  const rows: (DropRow | null)[] = ids.slice(at * ROWS, at * ROWS + ROWS).map((i) => data.rows[i]);
  // Any new sort, currency or risk starts again on page 1.
  const setSort = (k: SortKey) => { setSortKey(k); setPage(0); };
  const padded = [...rows, ...Array<null>(Math.max(0, ROWS - rows.length)).fill(null)].slice(0, ROWS);
  const day = (iso: string) => new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString(t.locale, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  const num = (n: number | null, d = 2) => (n === null ? "–" : n.toLocaleString(t.locale, { minimumFractionDigits: d, maximumFractionDigits: d }));
  const signed = (n: number | null) => (n === null ? "–" : `${n > 0 ? "+" : ""}${num(n, 1)}%`);
  const tone = (n: number | null) => (n === null ? "text-mute" : n < -0.05 ? "text-[#dc2626]" : n > 0.05 ? "text-[#16a34a]" : "");
  const label: Record<SortKey, string> = { ytm: t.ytm, vsMax: t.vsMax, vsMin: t.vsMin, d1w: t.d1w, d1m: t.d1m, gain1y: t.gain1y };

  const SortHead = ({ k, className = "" }: { k: SortKey; className?: string }) => (
    <th className={`text-right font-medium ${className}`} aria-sort={sort === k ? (HIGHEST_FIRST.includes(k) ? "descending" : "ascending") : undefined}>
      <button type="button" onClick={() => setSort(k)} data-testid={`sort-${k}`} className={`inline-flex items-center gap-0.5 uppercase tracking-wide ${sort === k ? "text-ink" : "hover:text-ink"}`}>
        {label[k]}
        <span className={`inline-block w-2 ${sort === k ? "" : "invisible"}`}>{HIGHEST_FIRST.includes(k) ? "↓" : "↑"}</span>
      </button>
    </th>
  );

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-[26px] font-semibold tracking-tight sm:text-[30px]">
        {t.h1} <span className="ml-1 rounded-full bg-yellow-200 px-2 py-0.5 align-middle text-[12px] font-medium">Admin</span>
      </h1>
      <p className="mt-1 text-[14px] text-mute sm:text-[15px]">{t.intro}</p>

      <div className="mt-4 flex flex-wrap items-end gap-x-6 gap-y-3">
        <div>
          <div className="text-xs font-medium text-mute">{t.currency}</div>
          <div role="radiogroup" aria-label={t.currency} data-testid="drops-currency" className="mt-1 grid w-[132px] grid-cols-2 rounded-full bg-white p-0.5 text-[13px] font-medium shadow-sm">
            {(["EUR", "USD"] as const).map((c) => (
              <button key={c} type="button" role="radio" aria-checked={currency === c} onClick={() => { setCurrency(c); setPage(0); }} className={`rounded-full px-2 py-1 transition ${currency === c ? "bg-ink text-white" : "text-mute hover:text-ink"}`}>
                {c}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="text-xs font-medium text-mute">{t.rankBy}</div>
          <div role="radiogroup" aria-label={t.rankBy} data-testid="drops-rank" className="mt-1 grid w-[264px] grid-cols-3 rounded-full bg-white p-0.5 text-[13px] font-medium shadow-sm">
            {RANKS.map(([k, name]) => (
              <button key={k} type="button" role="radio" aria-checked={sort === k} onClick={() => setSort(k)} className={`rounded-full px-2 py-1 transition ${sort === k ? "bg-ink text-white" : "text-mute hover:text-ink"}`}>
                {t[name]}
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
                  onClick={() => { setRisk(r); setPage(0); }}
                  className={`h-7 rounded-full text-[13px] font-medium tabular-nums transition disabled:cursor-not-allowed disabled:opacity-30 ${r === null ? "w-11 sm:w-14" : "w-[26px] sm:w-7"} ${on ? "bg-ink text-white" : "bg-white text-ink shadow-sm hover:bg-canvas"}`}
                >
                  {r ?? t.all}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <section className="mt-4 overflow-x-auto rounded-2xl bg-white shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
        <div className="flex h-11 items-center justify-between px-4 text-[12px] font-medium text-mute">
          <span data-testid="drops-caption">{risk === null ? t.topAll(ids.length, label[sort]) : t.topRisk(risk, label[sort])}</span>
          <nav aria-label={t.pages} data-testid="drops-pages" className="flex items-center gap-1 text-[13px] text-ink tabular-nums">
            <span className="mr-1 text-mute">{t.page}</span>
            <button type="button" aria-label={t.prev} disabled={at === 0} onClick={() => setPage(at - 1)} className="h-7 w-7 rounded-full bg-white shadow-sm hover:bg-canvas disabled:opacity-30">‹</button>
            {Array.from({ length: PAGES }, (_, p) => (
              <button key={p} type="button" aria-current={p === at ? "page" : undefined} disabled={p >= pages} onClick={() => setPage(p)} className={`h-7 w-7 rounded-full disabled:opacity-30 ${p === at ? "bg-ink text-white" : "bg-white shadow-sm hover:bg-canvas"}`}>
                {p + 1}
              </button>
            ))}
            <button type="button" aria-label={t.next} disabled={at >= pages - 1} onClick={() => setPage(at + 1)} className="h-7 w-7 rounded-full bg-white shadow-sm hover:bg-canvas disabled:opacity-30">›</button>
          </nav>
        </div>
        <table className="w-full min-w-[1024px] table-fixed text-[13px]">
          <thead>
            <tr className="h-8 border-y border-line/70 text-left text-[11px] uppercase tracking-wide text-mute">
              <th className="w-10 pl-4 font-medium">#</th>
              <th className="pr-3 font-medium">{t.issuer}</th>
              <th className="w-[84px] text-center font-medium">{t.risk}</th>
              <th className="w-[64px] text-center font-medium text-amber-800">{IR_HEAD}</th>
              <th className="w-[64px] text-center font-medium text-amber-800">{BR_HEAD}</th>
              <th className="w-[72px] text-center font-medium text-amber-800" title={SPREAD_NOTE}>{SPREAD_HEAD}</th>
              <th className="w-[100px] text-center font-medium">{t.maturity}</th>
              <th className="w-16 text-right font-medium">{t.price}</th>
              <SortHead k="ytm" className="w-[64px]" />
              <th className="w-[68px] text-right font-medium">{t.min}</th>
              <th className="w-[68px] text-right font-medium">{t.max}</th>
              {MOVES.map((k) => <SortHead key={k} k={k} className="w-[92px]" />)}
              <SortHead k="gain1y" className="w-[84px] pr-4" />
            </tr>
          </thead>
          <tbody data-testid="drops-rows">
            {padded.map((r, i) => (
              <tr key={i} className="h-9 border-b border-line/40 last:border-0">
                {r ? (
                  <>
                    <td className="pl-4 text-mute tabular-nums">{at * ROWS + i + 1}</td>
                    <td className="truncate pr-3 font-medium" title={`${r.name} · ${r.isin}`}>{r.issuer} <span className="font-normal text-mute">{r.isin}</span></td>
                    <td className="text-center"><RiskBadge risk={r.risk} sp={r.sp} /></td>
                    <td className="text-center"><GptRate isin={r.isin} kind="ir" /></td>
                    <td className="text-center"><GptRate isin={r.isin} /></td>
                    <td className="text-center"><Spread ytm={r.ytm} years={yearsLeft(r.maturity)} /></td>
                    <td className="text-center tabular-nums">{r.maturity ? day(r.maturity) : "–"}</td>
                    <td className="text-right tabular-nums">{num(r.price)}</td>
                    <td className={`text-right tabular-nums ${sort === "ytm" ? "font-medium" : ""}`}>{r.ytm === null ? "–" : `${num(r.ytm)}%`}</td>
                    <td className="text-right tabular-nums text-mute">{num(r.min52w)}</td>
                    <td className="text-right tabular-nums text-mute">{num(r.max52w)}</td>
                    {MOVES.map((k) => <td key={k} className={`text-right tabular-nums ${tone(r[k])} ${sort === k ? "font-medium" : ""}`}>{signed(r[k])}</td>)}
                    <td className={`pr-4 text-right tabular-nums ${sort === "gain1y" ? "font-medium" : ""}`}>{r.gain1y === null ? "–" : `${num(r.gain1y, 1)}%`}</td>
                  </>
                ) : (
                  <td colSpan={15} className="px-4 text-center text-mute">{i === 0 ? t.none : ""}</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <p className="mt-3 text-[11px] leading-snug text-mute">
        {data.since && <span>{t.building(day(data.since))} </span>}
        <span>{t.indicative} </span>
        <span>{t.gainNote}</span>
      </p>
    </div>
  );
}
