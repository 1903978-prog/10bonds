"use client";

import { useEffect, useState } from "react";
import type { AiFunnel, Dimension } from "@/lib/seo/geo";
import { api, Badge, card, ErrorNote, num } from "./ui";

type Data = { score: number; dimensions: Dimension[]; funnel: AiFunnel | null; questions: { market: string; q: string }[] };

/** AI Visibility (GEO): readiness to be found and cited by AI assistants, kept apart from the SEO score. */
export default function AiVisibility() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { api<Data>("/api/admin/seo/geo").then(setData, (e: Error) => setError(e.message)); }, []);
  if (error) return <ErrorNote error={error} />;
  if (!data) return <p className="text-sm text-mute">Loading…</p>;
  const f = data.funnel;
  const tone = (s: number) => (s >= 70 ? "green" : s >= 40 ? "amber" : "red");
  return (
    <div className="space-y-5">
      <section className={card}>
        <h2 className="text-lg font-semibold">AI Visibility Score</h2>
        <p className="mt-1 text-sm text-mute">How ready the site is to be found, trusted and cited by ChatGPT, Claude, Copilot, Google AI and Perplexity. Separate from the SEO score. The weights are your framework, not any AI company&apos;s algorithm, and no website can guarantee being cited.</p>
        <p className="mt-4 text-[44px] font-semibold leading-none" data-testid="geo-score">{data.score}<span className="text-xl text-mute">/100</span></p>
        <div className="mt-5 space-y-4">
          {data.dimensions.map((d) => (
            <div key={d.id} className="rounded-2xl bg-canvas p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{d.name} <span className="text-xs text-mute">· weight {d.weight}%</span></p>
                <Badge tone={tone(d.score)}>{d.score}%</Badge>
              </div>
              <ul className="mt-2 space-y-1 text-sm">
                {d.checks.map((c) => (
                  <li key={c.label} className="flex gap-2"><span className={c.done ? "text-green-700" : "text-red-700"}>{c.done ? "✓" : "✗"}</span><span>{c.label}{c.detail && <span className="text-mute"> · {c.detail}</span>}</span></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className={card}>
        <h2 className="text-lg font-semibold">Visitors from AI assistants, last 28 days</h2>
        <p className="mt-1 text-sm text-mute">Counted from the referring site (chatgpt.com, claude.ai, perplexity.ai, copilot.microsoft.com, gemini.google.com). Only visitors who accepted statistics cookies are counted, so these are minimums.</p>
        {!f ? <p className="mt-3 text-sm text-mute">Not available.</p> : (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Kpi label="AI referral visitors" value={num(f.visitors)} />
            <Kpi label="Registered" value={num(f.signups)} sub={f.visitors ? `${Math.round((f.signups / f.visitors) * 100)}% of AI visitors` : "—"} />
            <Kpi label="Paying now" value={num(f.paid)} sub={f.visitors ? `${Math.round((f.paid / f.visitors) * 100)}% of AI visitors` : "—"} />
            <Kpi label="By assistant" value={f.byAssistant.filter((a) => a.visitors).map((a) => `${a.name} ${a.visitors}`).join(" · ") || "none yet"} />
          </div>
        )}
      </section>

      <section className={card}>
        <h2 className="text-lg font-semibold">AI citation frequency and share</h2>
        <p className="mt-1 text-sm text-mute">A weekly test asks ChatGPT, Claude, Copilot and Google AI the fixed questions below and records which sites each answer cites. It gives citation frequency, citation share and the questions where competitors are cited and we are not.</p>
        <p className="mt-3"><Badge tone="gray">Not connected</Badge> <span className="text-sm text-mute">It needs API keys for the assistants. Until then nothing is shown, rather than estimated numbers.</span></p>
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer text-accent">The {data.questions.length} test questions</summary>
          <ul className="mt-2 space-y-1">{data.questions.map((q) => <li key={q.q}><span className="text-mute">{q.market.toUpperCase()}</span> · {q.q}</li>)}</ul>
        </details>
      </section>

      <section className={card}>
        <h2 className="text-lg font-semibold">Bing Webmaster Tools: AI Performance</h2>
        <p className="mt-1 text-sm text-mute">Shows when Microsoft Copilot and Bing AI cite the site and for which searches. It does not cover ChatGPT or Claude.</p>
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm">
          <li>Sign in at <a href="https://www.bing.com/webmasters" target="_blank" rel="noopener noreferrer" className="text-accent">https://www.bing.com/webmasters</a> with your Microsoft account.</li>
          <li>Choose &quot;Import from Google Search Console&quot; to add 10bonds.com in one click.</li>
          <li>Open AI Performance from the left menu.</li>
        </ol>
      </section>
    </div>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return <div className="rounded-2xl bg-canvas p-3"><p className="text-xs text-mute">{label}</p><p className="mt-1 text-lg font-semibold">{value}</p>{sub && <p className="text-xs text-mute">{sub}</p>}</div>;
}
