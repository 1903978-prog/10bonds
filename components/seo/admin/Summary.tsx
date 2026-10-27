"use client";

import type { HistoryPoint, NextStep, Source } from "@/lib/seo/summary";
import { Badge, card, day, num } from "./ui";

export type SummaryData = {
  lastCheck: string | null;
  seo: { score: number | null; assessedPct: number };
  geo: { score: number; assessedPct: number };
  history: HistoryPoint[];
  sources: Source[];
  next: NextStep[];
};

const tone = (s: number | null) => (s === null ? "text-mute" : s >= 70 ? "text-green-700" : s >= 50 ? "text-amber-600" : "text-red-700");
const STATE: Record<Source["state"], ["green" | "amber" | "red", string]> = { connected: ["green", "connected"], not_connected: ["amber", "not connected"], error: ["red", "error"] };

/** Score & roadmap, top: SEO and GEO scores, their history, the connected sources and what to do next. */
export default function Summary({ data }: { data: SummaryData }) {
  return (
    <div className="space-y-5" data-testid="seo-summary">
      <section className="grid gap-3 sm:grid-cols-2">
        <Score label="SEO score" value={data.seo.score === null ? null : Math.round(data.seo.score)} pct={data.seo.assessedPct} note={`Average of the 5 markets${data.lastCheck ? `, evaluated ${day(data.lastCheck)}` : ""}.`} />
        <Score label="GEO score" value={data.geo.score} pct={data.geo.assessedPct} note="How ready the site is to be cited by AI assistants." />
      </section>

      <p className="text-xs text-mute" data-testid="seo-history">
        History (each refresh): {data.history.length === 0 ? "starts with the next refresh." : data.history.map((h) => `${day(h.at)} SEO ${h.seo === null ? "–" : Math.round(h.seo)} · GEO ${h.geo ?? "–"}`).join(" | ")}
      </p>

      <section className={card}>
        <h2 className="text-lg font-semibold">Connected sources</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.sources.map((s) => (
            <div key={s.id} className="rounded-lg bg-canvas p-4" data-testid={`seo-source-${s.id}`}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">{s.name}</p>
                <Badge tone={STATE[s.state][0]}>{STATE[s.state][1]}</Badge>
              </div>
              <p className={`mt-1 break-words text-xs ${s.state === "error" ? "text-red-700" : "text-mute"}`}>{s.detail}</p>
              {s.help.length > 0 && (
                <ul className="mt-2 space-y-1 text-xs">
                  {s.help.map((h) => (
                    <li key={h.text}>{h.text}{h.url && <> <a href={h.url} target="_blank" rel="noopener noreferrer" className="break-all text-accent">{h.url}</a></>}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className={card} data-testid="seo-next">
        <h2 className="text-lg font-semibold">Do this next <span className="text-sm font-normal text-mute">(biggest gain for least work first)</span></h2>
        {data.next.length === 0 ? <p className="mt-2 text-sm text-mute">Nothing open.</p> : (
          <ol className="mt-3 space-y-2">
            {data.next.map((n, i) => (
              <li key={`${n.area}-${n.title}`} className="flex gap-3 text-sm">
                <span className="w-5 shrink-0 text-mute">{i + 1}.</span>
                <span className="min-w-0 flex-1">
                  <Badge tone={n.area === "SEO" ? "blue" : "purple"}>{n.area}</Badge> <span className="font-medium">{n.title}</span>
                  <span className="block text-xs text-mute">{n.action} · +{num(n.gain, 1)} points · effort {n.effort} · {n.where}</span>
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

function Score({ label, value, pct, note }: { label: string; value: number | null; pct: number; note: string }) {
  return (
    <div className={card}>
      <p className="text-xs uppercase tracking-wide text-mute">{label}</p>
      <p className="mt-1 leading-none"><span className={`text-[48px] font-semibold ${tone(value)}`}>{value ?? "–"}</span><span className="text-lg text-mute">/100</span></p>
      <p className="mt-2 text-xs text-mute">{pct}% of checks could be assessed; the rest are marked &ldquo;not connected&rdquo;. {note}</p>
    </div>
  );
}
