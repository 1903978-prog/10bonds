"use client";

import { useEffect, useState } from "react";
import type { OptResult } from "@/lib/optimalBuild";

/** Admin only: the "Find Optimal Portfolio" result for the Multi-year chart, asked for once the button is pressed and polled while the server builds it in the background. */
export function useOptimal(active: boolean, currency: string, size: string): OptResult | "pending" | "failed" | null {
  const [res, setRes] = useState<OptResult | "pending" | "failed" | null>(null);
  useEffect(() => {
    if (!active) return;
    let stop = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const ask = () =>
      fetch(`/api/bonds/optimal?${new URLSearchParams({ currency, size })}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => {
          if (stop) return;
          if (j?.maturities) setRes(j);
          else if (j?.pending) { setRes("pending"); timer = setTimeout(ask, 2000); }
          else setRes("failed");
        })
        .catch(() => !stop && setRes("failed"));
    setRes((r) => r ?? "pending");
    ask();
    return () => { stop = true; clearTimeout(timer); };
  }, [active, currency, size]);
  return res;
}

const pct = (v: number | null | undefined, d = 2) => (v == null ? "–" : `${v.toFixed(d)}%`);

/** Amber button for the chart's top right: Find Optimal Portfolio, then Optimizing…, then Show / Hide Optimal Results. */
export function OptimalButton({ state, shown, onClick }: { state: OptResult | "pending" | "failed" | null; shown: boolean; onClick: () => void }) {
  const busy = state === "pending";
  const label = busy ? "Optimizing…" : state && state !== "failed" ? (shown ? "Hide Optimal Results" : "Show Optimal Results") : state === "failed" ? "Retry optimization" : "◎ Find Optimal Portfolio";
  return (
    <button type="button" data-testid="find-optimal" disabled={busy} onClick={onClick} className="mr-2 h-7 whitespace-nowrap rounded-full border border-amber-300 bg-white px-3 text-[12px] font-medium text-amber-900 hover:bg-amber-50 disabled:opacity-60">
      {label}
    </button>
  );
}

const TIP = {
  ytm: "Average gross return of the 10 bonds, per year.",
  el: "Expected loss on your money from defaults over the life of the bonds (default chance × loss given default, averaged).",
  net: "Expected annual return after defaults, from the Monte Carlo (timing of defaults and recovery included). Gross of costs, no reinvestment.",
  es: "Expected Shortfall 95%: average annual return of the worst 5% of simulated outcomes. Defaults are treated as independent (no correlation data), so this is understated.",
  eff: "Extra return (percentage points a year) per extra percentage point of expected loss, between neighbouring efficient portfolios.",
};

/** The compact result under the chart: the model-selected portfolio, the stability line, and one row per maturity. A row click selects it (its 10 bonds show on the right). */
export default function OptimalPanel({ res, selected, onSelect, onView }: { res: OptResult | "pending" | "failed"; selected: number | null; onSelect: (years: number) => void; onView: () => void }) {
  if (res === "pending" || res === "failed")
    return <div className="flex h-[150px] items-center justify-center rounded-xl bg-black/[0.03] text-[12px] text-mute" data-testid="optimal-panel">{res === "pending" ? "Optimizing… the first run takes up to a minute." : "The optimization could not be loaded. Try again."}</div>;
  const rows = res.maturities;
  const sel = rows.find((m) => m.years === selected) ?? rows.find((m) => m.years === res.winner) ?? null;
  const o = sel?.optimum ?? null;
  return (
    <div className="flex h-[150px] gap-3 overflow-hidden rounded-xl bg-black/[0.03] p-2 text-[11px] leading-tight" data-testid="optimal-panel">
      <div className="flex w-[40%] min-w-0 shrink-0 flex-col gap-0.5 overflow-auto">
        <div className="font-semibold uppercase tracking-wide text-amber-900">{sel && sel.years === res.winner ? "★ Optimal portfolio" : `${sel?.years ?? "–"}-year portfolio`}</div>
        {o ? (
          <>
            <div title={TIP.ytm}>Maturity {sel!.years} years · gross return {pct(o.ytm)}</div>
            <div title={TIP.net}>Expected net return {pct(o.mu)} a year</div>
            <div title={TIP.el}>Expected loss {pct(o.el)} · <span title={TIP.es}>ES95 {pct(o.es95)} a year</span></div>
            <div className="text-mute">Method: balanced risk-adjusted compromise</div>
            <button type="button" onClick={onView} className="mt-0.5 self-start rounded-full bg-amber-100 px-2.5 py-0.5 font-medium text-amber-900 hover:bg-amber-200" data-testid="view-10-bonds">View 10 Bonds</button>
          </>
        ) : (
          <div className="text-mute">No portfolio for this maturity.</div>
        )}
        {res.stress && <div className="text-mute" title={res.stress.labels.join(" · ")}>Best maturity unchanged in {res.stress.sameWinner} of {res.stress.total} stress scenarios.</div>}
        {res.provisional.length > 0 && <div className="text-amber-800">Provisional: {res.provisional.join(" ")}</div>}
        <details className="text-mute"><summary className="cursor-pointer">Not available</summary><ul className="list-disc pl-4">{res.unavailable.map((u) => <li key={u}>{u}</li>)}</ul></details>
      </div>
      <div className="min-w-0 flex-1 overflow-auto">
        <table className="w-full whitespace-nowrap text-right tabular-nums" data-testid="optimal-table">
          <thead className="sticky top-0 bg-[#f4f4f6] text-mute">
            <tr>
              <th className="px-1 text-left font-normal">Maturity</th>
              <th className="px-1 font-normal" title={TIP.ytm}>Return</th>
              <th className="px-1 font-normal" title={TIP.el}>Exp. loss</th>
              <th className="px-1 font-normal" title={TIP.net}>Net return</th>
              <th className="px-1 font-normal" title={TIP.es}>ES95</th>
              <th className="px-1 font-normal" title={TIP.eff}>Efficiency</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => (
              <tr key={m.years} onClick={() => onSelect(m.years)} data-testid={`optimal-row-${m.years}`} className={`cursor-pointer ${m.years === res.winner ? "bg-amber-100/70" : ""} ${sel?.years === m.years ? "font-semibold" : ""}`}>
                <td className="px-1 text-left">{m.years === res.winner ? "★ " : ""}{m.years}y</td>
                <td className="px-1">{pct(m.optimum?.ytm)}</td>
                <td className="px-1">{pct(m.optimum?.el)}</td>
                <td className="px-1">{pct(m.optimum?.mu)}</td>
                <td className="px-1">{pct(m.optimum?.es95)}</td>
                <td className="px-1">{m.optimum?.efficiency == null ? "–" : m.optimum.efficiency.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
