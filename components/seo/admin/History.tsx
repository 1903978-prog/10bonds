"use client";

import { useEffect, useState } from "react";
import type { DailyRow } from "@/lib/seo/daily";
import { api, num } from "./ui";

type Stat = { label: string; source: DailyRow["source"]; key: keyof DailyRow; digits?: number; pct?: boolean; lowerIsBetter?: boolean };
const STATS: Stat[] = [
  { label: "Google clicks", source: "google", key: "clicks" },
  { label: "Google impressions", source: "google", key: "impressions" },
  { label: "Google CTR", source: "google", key: "ctr", digits: 1, pct: true },
  { label: "Google avg position", source: "google", key: "position", digits: 1, lowerIsBetter: true },
  { label: "Google pages in search", source: "google", key: "indexed" },
  { label: "Bing clicks", source: "bing", key: "clicks" },
  { label: "Bing impressions", source: "bing", key: "impressions" },
  { label: "Bing CTR", source: "bing", key: "ctr", digits: 1, pct: true },
  { label: "Bing avg position", source: "bing", key: "position", digits: 1, lowerIsBetter: true },
  { label: "Bing indexed pages", source: "bing", key: "indexed" },
  { label: "Keywords ranked", source: "keywords", key: "tracked" },
  { label: "Keywords in top 10", source: "keywords", key: "top10" },
  { label: "Keywords avg position", source: "keywords", key: "position", digits: 1, lowerIsBetter: true },
  { label: "New users", source: "users", key: "signups" },
  { label: "New paying users", source: "users", key: "paying" },
];

const fmt = (s: Stat, v: number | null) => (v === null ? "–" : s.pct ? `${num(v * 100, s.digits ?? 1)}%` : num(v, s.digits ?? 0));

/** A line over the saved days; days without a figure leave a gap. Same size always, so nothing moves. */
function Spark({ values }: { values: (number | null)[] }) {
  const W = 140, H = 36;
  const nums = values.filter((v): v is number => v !== null);
  if (!nums.length) return <svg width={W} height={H} aria-hidden="true" />;
  const lo = Math.min(...nums), hi = Math.max(...nums), span = hi - lo || 1;
  const x = (i: number) => (values.length < 2 ? W / 2 : (i / (values.length - 1)) * (W - 6) + 3);
  const y = (v: number) => H - 4 - ((v - lo) / span) * (H - 8);
  let d = "", gap = true;
  values.forEach((v, i) => {
    if (v === null) { gap = true; return; }
    d += `${gap ? "M" : "L"}${x(i).toFixed(1)} ${y(v).toFixed(1)} `;
    gap = false;
  });
  const last = values.map((v, i) => [v, i] as const).filter(([v]) => v !== null).pop()!;
  return (
    <svg width={W} height={H} aria-hidden="true">
      <path d={d} fill="none" stroke="#0071e3" strokeWidth="1.5" />
      <circle cx={x(last[1])} cy={y(last[0] as number)} r="2.5" fill="#0071e3" />
    </svg>
  );
}

/** History of the headline search numbers, saved once a day: a small chart per figure and the dated table. */
export default function History() {
  const [rows, setRows] = useState<DailyRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [table, setTable] = useState(false);
  useEffect(() => {
    if (!open || rows) return;
    api<{ rows: DailyRow[] }>("/api/admin/seo/history").then((r) => setRows(r.rows)).catch((e) => setError((e as Error).message));
  }, [open, rows]);
  const days = rows ? [...new Set(rows.map((r) => r.day))].sort() : [];
  const val = (s: Stat, day: string) => {
    const r = rows?.find((x) => x.day === day && x.source === s.source);
    return r ? ((r[s.key] as number | null) ?? null) : null;
  };
  return (
    <section className="rounded-2xl bg-white px-4 py-3" data-testid="seo-history">
      <button onClick={() => setOpen(!open)} className="text-sm text-accent">{open ? "Hide history" : "History of these numbers (saved daily)"}</button>
      {open && error && <p className="mt-2 text-xs text-red-700">{error}</p>}
      {open && !rows && !error && <p className="mt-2 text-xs text-mute">Loading…</p>}
      {open && rows && (
        <div className="mt-3 space-y-3">
          <p className="text-xs text-mute">One figure per day. Google and Bing show the last 28 days as of that day; a dash means the source gave nothing that day. {days.length ? `${days.length} day${days.length > 1 ? "s" : ""} saved so far.` : "The first day is saved now."}</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-8">
            {STATS.map((s) => {
              const vals = days.map((d) => val(s, d));
              const last = [...vals].reverse().find((v) => v !== null) ?? null;
              return (
                <div key={s.label} className="rounded-xl bg-canvas px-3 py-2">
                  <p className="text-[11px] text-mute">{s.label}</p>
                  <p className="text-sm font-semibold">{fmt(s, last)}</p>
                  <Spark values={vals} />
                </div>
              );
            })}
          </div>
          {days.length > 0 && (
            <div>
              <button onClick={() => setTable(!table)} className="text-xs text-accent">{table ? "Hide date table" : "Show date table"}</button>
              {table && (
                <div className="mt-2 max-h-[70vh] overflow-auto">
                  <table className="w-full text-left text-sm">
                    <thead><tr><th className="pr-3 font-medium">Date</th>{STATS.map((s) => <th key={s.label} className="px-2 font-medium">{s.label}</th>)}</tr></thead>
                    <tbody>
                      {[...days].reverse().map((d) => (
                        <tr key={d} className="border-t border-line"><td className="whitespace-nowrap py-1.5 pr-3">{d}</td>{STATS.map((s) => <td key={s.label} className="px-2">{fmt(s, val(s, d))}</td>)}</tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
