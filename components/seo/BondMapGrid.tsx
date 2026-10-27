"use client";

import { useState } from "react";
import { MATURITY_BUCKETS, RISKS, type BondMap, type BondMapText } from "@/lib/seo/bondMap";

type Tab = { key: string; label: string; map: BondMap };
type Text = Pick<BondMapText, "h1" | "maturity" | "years" | "risk" | "lower" | "higher" | "legend">;

/** The maturity x risk table, with a currency switch. Every cell has a fixed size so nothing moves when switching. */
export default function BondMapGrid({ locale, text, tabs, asOf }: { locale: string; text: Text; tabs: Tab[]; asOf: string | null }) {
  const [key, setKey] = useState(tabs[0].key);
  const tab = tabs.find((t) => t.key === key) ?? tabs[0];
  const pct = (v: number | null) => (v === null ? "–" : `${v.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`);
  const n = (v: number) => v.toLocaleString(locale);
  return (
    <section className="mt-3 rounded-lg border border-line bg-white p-4 sm:p-5" data-testid="bond-map">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Currency" className="inline-flex rounded-full bg-canvas p-1 text-sm">
          {tabs.map((t) => (
            <button
              key={t.key}
              role="tab"
              type="button"
              aria-selected={t.key === tab.key}
              onClick={() => setKey(t.key)}
              className={`w-16 rounded-full py-1 font-medium ${t.key === tab.key ? "bg-white shadow-sm" : "text-mute hover:text-ink"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-mute">
          <span className="font-semibold text-ink">{text.legend[0]}</span> · {text.legend[1]} · {text.legend[2]}
          {asOf && <> · {asOf}</>}
        </p>
      </div>
      <div className="mt-3 overflow-x-auto" tabIndex={0} role="region" aria-label={text.h1}>
        <table className="w-full min-w-[860px] table-fixed text-right text-[12px] leading-tight">
          <thead>
            <tr className="text-mute">
              <th scope="col" className="w-[84px] pb-1.5 text-left font-normal">{text.maturity}</th>
              {RISKS.map((r) => (
                <th key={r} scope="col" className="pb-1.5 font-normal">
                  {text.risk} <span className="font-semibold text-ink">{r}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MATURITY_BUCKETS.map((m, i) => (
              <tr key={m.label} className="h-[52px] border-t border-line">
                <th scope="row" className="text-left font-medium">{m.label} {text.years}</th>
                {tab.map.rows[i].map((c, j) => (
                  <td key={j} className={`tabular-nums ${c.bonds ? "" : "text-line"}`}>
                    <div className="text-[14px] font-semibold">{c.bonds ? n(c.bonds) : "–"}</div>
                    <div className="text-mute">{c.bonds ? pct(c.median) : " "}</div>
                    <div className="text-mute">{c.bonds ? pct(c.max) : " "}</div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="text-mute">
              <td />
              <td colSpan={RISKS.length} className="pt-1.5 text-[11px]">
                <span className="float-left">← {text.risk.toLowerCase()} {text.lower}</span>
                {text.risk.toLowerCase()} {text.higher} →
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}
