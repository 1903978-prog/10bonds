"use client";

import { useEffect, useState, type PointerEvent as RPointerEvent } from "react";
import type { DailyRow } from "@/lib/seo/daily";
import type { DayRow } from "@/lib/seo/dailyTable";
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
  { label: "Unique visitors", source: "site", key: "visitors" },
  { label: "Avg minutes per visitor", source: "site", key: "minutes", digits: 1 },
];

type PageRow = { path: string; visitors: number; views: number; minutes: number };

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

const FROM_DAY = "2026-10-20";

/** Big chart of one figure, day by day, with the dated list underneath. Only saved values; a dash means nothing that day. */
function Detail({ stat, days, val, onClose, onStep }: { stat: Stat; days: string[]; val: (s: Stat, day: string) => number | null; onClose: () => void; onStep: (d: number) => void }) {
  const [hover, setHover] = useState<number | null>(null);
  const shown = days.filter((d) => d >= FROM_DAY);
  const values = shown.map((d) => val(stat, d));
  const W = 640, H = 240, PL = 8, PR = 8, PT = 16, PB = 24;
  const nums = values.filter((v): v is number => v !== null);
  const lo = nums.length ? Math.min(...nums) : 0, hi = nums.length ? Math.max(...nums) : 1, span = hi - lo || 1;
  const x = (i: number) => (shown.length < 2 ? W / 2 : PL + (i / (shown.length - 1)) * (W - PL - PR));
  const y = (v: number) => H - PB - ((v - lo) / span) * (H - PT - PB);
  let d = "", gap = true;
  values.forEach((v, i) => { if (v === null) { gap = true; return; } d += `${gap ? "M" : "L"}${x(i).toFixed(1)} ${y(v).toFixed(1)} `; gap = false; });
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); else if (e.key === "ArrowRight") onStep(1); else if (e.key === "ArrowLeft") onStep(-1); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose, onStep]);
  const move = (e: RPointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const f = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    setHover(shown.length ? Math.round(f * (shown.length - 1)) : null);
  };
  const hv = hover !== null ? values[hover] : null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-3" onClick={onClose} data-testid="seo-history-detail">
      <div role="dialog" aria-label={stat.label} className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-2">
          <button onClick={() => onStep(-1)} aria-label="Previous figure" className="px-2 text-lg text-accent">‹</button>
          <div className="min-w-0 flex-1 text-center">
            <p className="truncate text-sm font-semibold">{stat.label}</p>
            <p className="text-xs text-mute">Day by day since 20 October</p>
          </div>
          <button onClick={() => onStep(1)} aria-label="Next figure" className="px-2 text-lg text-accent">›</button>
          <button onClick={onClose} aria-label="Close" className="px-2 text-lg text-mute">×</button>
        </div>
        <div className="mt-2 h-6 text-center text-xs text-mute">{hover !== null ? <><span className="tabular-nums">{shown[hover]}</span>: <span className="font-semibold text-ink">{fmt(stat, hv)}</span></> : "Hover or tap the chart for a day"}</div>
        {nums.length === 0 ? <p className="py-10 text-center text-xs text-mute">No values saved yet.</p> : (
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full touch-pan-y" onPointerMove={move} onPointerDown={move} onPointerLeave={() => setHover(null)}>
            <text x={PL} y={10} fontSize="10" fill="#86868b">{fmt(stat, hi)}</text>
            <text x={PL} y={H - PB + 12} fontSize="10" fill="#86868b">{fmt(stat, lo)}</text>
            <path d={d} fill="none" stroke="#0071e3" strokeWidth="2" />
            {values.map((v, i) => v === null ? null : <circle key={shown[i]} cx={x(i)} cy={y(v)} r={hover === i ? 5 : 3} fill="#0071e3" />)}
            {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={PT} y2={H - PB} stroke="#86868b" strokeDasharray="3 3" />}
            {shown.length > 0 && <text x={x(0)} y={H - 6} fontSize="10" fill="#86868b" textAnchor="start">{shown[0].slice(5)}</text>}
            {shown.length > 1 && <text x={x(shown.length - 1)} y={H - 6} fontSize="10" fill="#86868b" textAnchor="end">{shown[shown.length - 1].slice(5)}</text>}
          </svg>
        )}
        <div className="mt-2 min-h-0 flex-1 overflow-auto">
          <table className="w-full text-left text-sm" data-testid="seo-detail-list">
            <thead><tr><th className="font-medium">Date</th><th className="text-right font-medium">Value</th></tr></thead>
            <tbody>
              {[...shown.keys()].reverse().map((i) => (
                <tr key={shown[i]} className={`border-t border-line tabular-nums ${hover === i ? "bg-canvas" : ""}`}><td className="py-1">{shown[i]}</td><td className="text-right">{fmt(stat, values[i])}</td></tr>
              ))}
              {shown.length === 0 && <tr><td colSpan={2} className="py-2 text-xs text-mute">No days saved yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/** History of the headline search numbers, saved once a day: a small chart per figure and the dated table. */
export default function History() {
  const [rows, setRows] = useState<DailyRow[] | null>(null);
  const [days2, setDays2] = useState<DayRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [pages, setPages] = useState<PageRow[]>([]);
  const [byPage, setByPage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [table, setTable] = useState(false);
  const [sel, setSel] = useState<number | null>(null);
  useEffect(() => {
    if (rows) return;
    api<{ rows: DailyRow[]; days: DayRow[]; pages: PageRow[] }>("/api/admin/seo/history").then((r) => { setRows(r.rows); setDays2(r.days ?? []); setPages(r.pages ?? []); }).catch((e) => setError((e as Error).message));
  }, [rows]);
  const days = rows ? [...new Set(rows.map((r) => r.day))].sort() : [];
  const val = (s: Stat, day: string) => {
    const r = rows?.find((x) => x.day === day && x.source === s.source);
    return r ? ((r[s.key] as number | null) ?? null) : null;
  };
  return (
    <section className="rounded-2xl bg-white px-4 py-3" data-testid="seo-history">
      <button onClick={() => setOpen(!open)} className="text-sm text-accent">{open ? "Hide history" : "History of these numbers (saved daily)"}</button>
      {error && <p className="mt-2 text-xs text-red-700">{error}</p>}
      {open && !rows && !error && <p className="mt-2 text-xs text-mute">Loading…</p>}
      {open && rows && (
        <div className="mt-3 space-y-3">
          <p className="text-xs text-mute">One figure per day. Google and Bing show the last 28 days as of that day; a dash means the source gave nothing that day. Visitors and minutes count only people who allowed usage statistics, and leave out your own visits. {days.length ? `${days.length} day${days.length > 1 ? "s" : ""} saved so far.` : "The first day is saved now."}</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-8">
            {STATS.map((s) => {
              const vals = days.map((d) => val(s, d));
              const last = [...vals].reverse().find((v) => v !== null) ?? null;
              return (
                <button key={s.label} type="button" onClick={() => setSel(STATS.indexOf(s))} className="rounded-xl bg-canvas px-3 py-2 text-left hover:bg-line/40">
                  <p className="text-[11px] text-mute">{s.label}</p>
                  <p className="text-sm font-semibold">{fmt(s, last)}</p>
                  <Spark values={vals} />
                </button>
              );
            })}
          </div>
          <div>
            <button onClick={() => setByPage(!byPage)} className="text-xs text-accent">{byPage ? "Hide visits by page" : "Show visits by page (last 30 days)"}</button>
            {byPage && (
              <div className="mt-2 max-h-[70vh] overflow-auto">
                {pages.length === 0 ? <p className="text-xs text-mute">No visits recorded yet.</p> : (
                  <table className="w-full text-left text-sm" data-testid="seo-pages">
                    <thead><tr><th className="pr-3 font-medium">Page</th><th className="px-2 text-right font-medium">Unique visitors</th><th className="px-2 text-right font-medium">Page views</th><th className="px-2 text-right font-medium">Avg minutes per visitor</th></tr></thead>
                    <tbody>
                      {pages.map((p) => (
                        <tr key={p.path} className="border-t border-line"><td className="py-1.5 pr-3">{p.path}</td><td className="px-2 text-right tabular-nums">{num(p.visitors, 0)}</td><td className="px-2 text-right tabular-nums">{num(p.views, 0)}</td><td className="px-2 text-right tabular-nums">{num(p.minutes, 1)}</td></tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <button onClick={() => setTable(!table)} className="text-xs text-accent">{table ? "Hide date table" : "Show date table"}</button>
              <button disabled={busy} className="text-xs text-accent disabled:opacity-60" onClick={() => {
                setBusy(true); setError(null);
                api<{ days: DayRow[] }>("/api/admin/seo/history", {}, "POST").then((r) => setDays2(r.days)).catch((e) => setError((e as Error).message)).finally(() => setBusy(false));
              }}>{busy ? "Refreshing…" : "Refresh now"}</button>
            </div>
            {table && (
              <div className="mt-2 max-h-[70vh] overflow-auto">
                <table className="w-full text-left text-sm" data-testid="seo-daily-table">
                  <thead><tr><th className="pr-3 font-medium">Date</th>{["Clicks", "Impressions", "CTR", "Avg position", "Pages in search"].map((h) => <th key={h} className="px-2 font-medium">Google {h.toLowerCase()}</th>)}{["Clicks", "Impressions", "Indexed pages"].map((h) => <th key={h} className="px-2 font-medium">Bing {h.toLowerCase()}</th>)}</tr></thead>
                  <tbody>
                    {days2.length === 0 && <tr><td colSpan={9} className="py-2 text-xs text-mute">No days saved yet. Press Refresh now to load the history.</td></tr>}
                    {days2.map((d) => (
                      <tr key={d.day} className="border-t border-line tabular-nums">
                        <td className="whitespace-nowrap py-1.5 pr-3">{d.day}</td>
                        <td className="px-2">{num(d.gClicks)}</td><td className="px-2">{num(d.gImpressions)}</td>
                        <td className="px-2">{d.gCtr === null ? "–" : `${num(d.gCtr * 100, 1)}%`}</td><td className="px-2">{d.gPosition === null ? "–" : num(d.gPosition, 1)}</td><td className="px-2">{num(d.gPages)}</td>
                        <td className="px-2">{num(d.bClicks)}</td><td className="px-2">{num(d.bImpressions)}</td><td className="px-2">{num(d.bPages)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
      {sel !== null && <Detail stat={STATS[sel]} days={days} val={val} onClose={() => setSel(null)} onStep={(n) => setSel((c) => (c === null ? c : (c + n + STATS.length) % STATS.length))} />}
    </section>
  );
}
