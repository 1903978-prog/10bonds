"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

// Interactive comparison: pick an order size, sort by score or by the cost of one bond type.
// All numbers arrive pre-computed and pre-formatted from the server; this component only arranges them.

export type Cell = { status: "ok" | "not_offered" | "not_disclosed" | "not_eligible"; total: number | null; totalPct: number | null; totalLabel: string | null; pctLabel: string | null; uncounted: boolean; general: boolean };
export type TableRow = {
  id: string;
  name: string;
  profileHref: string;
  site: { href: string; rel: string; kind: string };
  overall: number;
  custody: string;
  verifiedAt: string;
  overdue: boolean;
  costs: Record<string, Record<string, Cell>>; // category -> amount -> cell
};
type Labels = {
  broker: string; score: string; orderSize: string; custody: string; details: string; view: string;
  officialSite: string; notOffered: string; notDisclosed: string; notEligible: string; uncounted: string; verified: string; overdue: string; sortBy: string; generalTariff: string;
};

export default function CostTable({ rows, categories, amounts, labels }: { rows: TableRow[]; categories: { key: string; label: string }[]; amounts: { value: number; label: string }[]; labels: Labels }) {
  const [amount, setAmount] = useState((amounts[1] ?? amounts[0]).value);
  const [sort, setSort] = useState<string>("score");

  const sorted = useMemo(() => {
    if (sort === "score") return rows;
    const cost = (r: TableRow) => {
      const c = r.costs[sort]?.[String(amount)];
      return c?.status === "ok" && c.total !== null ? c.total : Number.POSITIVE_INFINITY;
    };
    return [...rows].sort((a, b) => cost(a) - cost(b) || b.overall - a.overall);
  }, [rows, sort, amount]);

  const cell = (c: Cell | undefined) => {
    if (!c) return <span className="text-mute">—</span>;
    if (c.status === "ok" && c.total !== null)
      return (
        <span>
          <span className="font-semibold">{c.totalLabel}</span>
          {c.uncounted ? "*" : ""}
          {c.general ? "†" : ""}
          <span className="block text-xs text-mute">{c.pctLabel}</span>
        </span>
      );
    const text = c.status === "not_offered" ? labels.notOffered : c.status === "not_eligible" ? labels.notEligible : labels.notDisclosed;
    return <span className="text-xs text-mute">{text}</span>;
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <div role="group" aria-label={labels.orderSize} className="inline-flex rounded-full bg-canvas p-1 text-sm">
          {amounts.map((a) => (
            <button
              key={a.value}
              type="button"
              onClick={() => setAmount(a.value)}
              aria-pressed={a.value === amount}
              className={`rounded-full px-4 py-1.5 transition ${a.value === amount ? "bg-white font-semibold shadow-sm" : "text-mute hover:text-ink"}`}
              data-testid={`amount-${a.value}`}
            >
              {a.label}
            </button>
          ))}
        </div>
        <label className="text-sm text-mute">
          {labels.sortBy}{" "}
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="ml-1 rounded-full border border-line bg-white px-3 py-1.5 text-ink" data-testid="sort">
            <option value="score">{labels.score}</option>
            {categories.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-4 hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm" data-testid="broker-table">
          <thead className="text-xs text-mute">
            <tr className="border-b border-line">
              <th className="py-2 pr-3 font-medium">#</th>
              <th className="py-2 pr-3 font-medium">{labels.broker}</th>
              <th className="py-2 pr-3 font-medium">{labels.score}</th>
              {categories.map((c) => (
                <th key={c.key} className="py-2 pr-3 font-medium">
                  {c.label}
                </th>
              ))}
              <th className="py-2 pr-3 font-medium">{labels.custody}</th>
              <th className="py-2 font-medium">{labels.details}</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) => (
              <tr key={r.id} className="border-b border-line/60 align-top" data-testid={`row-${r.id}`}>
                <td className="py-3 pr-3 text-mute">{i + 1}</td>
                <td className="py-3 pr-3">
                  <Link href={r.profileHref} className="font-semibold hover:text-accent">
                    {r.name}
                  </Link>
                  <span className={`block text-xs ${r.overdue ? "text-amber-700" : "text-mute"}`}>{r.overdue ? labels.overdue : `${labels.verified} ${r.verifiedAt}`}</span>
                </td>
                <td className="py-3 pr-3 font-semibold">{r.overall.toFixed(0)}</td>
                {categories.map((c) => (
                  <td key={c.key} className="py-3 pr-3">
                    {cell(r.costs[c.key]?.[String(amount)])}
                  </td>
                ))}
                <td className="max-w-[160px] py-3 pr-3 text-xs">{r.custody}</td>
                <td className="py-3">
                  <Link href={r.profileHref} className="whitespace-nowrap text-accent">
                    {labels.view}
                  </Link>
                  <a href={r.site.href} rel={r.site.rel} target="_blank" className="ml-3 text-accent" data-track={`broker:${r.id}:table:${r.site.kind}`}>
                    {labels.officialSite} ↗
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ol className="mt-4 space-y-3 md:hidden">
        {sorted.map((r, i) => (
          <li key={r.id} className="rounded-lg border border-line/70 p-4">
            <div className="flex items-baseline justify-between gap-3">
              <Link href={r.profileHref} className="font-semibold">
                {i + 1}. {r.name}
              </Link>
              <span className="text-sm">
                <span className="text-mute">{labels.score}</span> <b>{r.overall.toFixed(0)}</b>
              </span>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              {categories.map((c) => (
                <div key={c.key}>
                  <dt className="text-xs text-mute">{c.label}</dt>
                  <dd>{cell(r.costs[c.key]?.[String(amount)])}</dd>
                </div>
              ))}
              <div className="col-span-2">
                <dt className="text-xs text-mute">{labels.custody}</dt>
                <dd className="text-xs">{r.custody}</dd>
              </div>
            </dl>
            <Link href={r.profileHref} className="mt-3 inline-block text-sm text-accent">
              {labels.view}
            </Link>
            <a href={r.site.href} rel={r.site.rel} target="_blank" className="ml-4 mt-3 inline-block text-sm text-accent" data-track={`broker:${r.id}:table:${r.site.kind}`}>
              {labels.officialSite} ↗
            </a>
          </li>
        ))}
      </ol>
      {rows.some((r) => Object.values(r.costs).some((a) => Object.values(a).some((c) => c.uncounted))) && <p className="mt-3 text-xs text-mute">* {labels.uncounted}</p>}
      {rows.some((r) => Object.values(r.costs).some((a) => Object.values(a).some((c) => c.general && c.status === "ok"))) && <p className="mt-1 text-xs text-mute">† {labels.generalTariff}</p>}
    </div>
  );
}
