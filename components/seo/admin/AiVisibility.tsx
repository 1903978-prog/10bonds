"use client";

import { useEffect, useState } from "react";
import type { BingStats } from "@/lib/seo/bing";
import type { AiFunnel, CitationTest, Dimension } from "@/lib/seo/geo";
import { api, Badge, card, ErrorNote, num } from "./ui";

type Data = {
  score: number; dimensions: Dimension[]; funnel: AiFunnel | null; questions: { market: string; q: string }[]; citations: CitationTest | null;
  manual: { prompt: string; week: string; assistants: readonly { id: string; name: string; open: string }[]; saved: string[] };
  bing: { state: "connected" | "error" | "not_connected"; error: string | null; data: BingStats | null; links: { overview: string; performance: string; ai: string } };
};

/** AI Visibility (GEO): readiness to be found and cited by AI assistants, kept apart from the SEO score. */
export default function AiVisibility() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = () => api<Data>("/api/admin/seo/geo").then(setData, (e: Error) => setError(e.message));
  useEffect(() => { load(); }, []);
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
        <p className="mt-1 text-sm text-mute">Every week (and after an update when the last test is a week old) the AI assistants with an API key get the fixed questions below, with web search on, and we record which sites each answer cites.</p>
        {!data.citations ? (
          <p className="mt-3"><Badge tone="gray">Not connected</Badge> <span className="text-sm text-mute">Add at least one key as a GitHub secret at <a className="text-accent" href="https://github.com/1903978-prog/10bonds/settings/secrets/actions/new" target="_blank" rel="noopener noreferrer">https://github.com/1903978-prog/10bonds/settings/secrets/actions/new</a>: PERPLEXITY_API_KEY, OPENAI_API_KEY or ANTHROPIC_API_KEY. Until then nothing is shown, rather than estimated numbers.</span></p>
        ) : (
          <>
            <p className="mt-2 text-xs text-mute">Last test {new Date(data.citations.at).toLocaleString("en-GB")}</p>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {data.citations.assistants.map((a) => <Kpi key={a.id} label={`${a.name}: cites us`} value={`${a.cited} of ${a.answered}`} />)}
            </div>
            {data.citations.competitors.length > 0 && (
              <p className="mt-3 text-sm"><span className="text-mute">Sites cited most instead: </span>{data.citations.competitors.slice(0, 10).map((c) => `${c.domain} (${c.n})`).join(", ")}</p>
            )}
            <details className="mt-3 text-sm">
              <summary className="cursor-pointer text-accent">Answers per question</summary>
              <table className="mt-2 w-full text-sm">
                <thead><tr className="text-left text-mute"><th className="py-1 pr-3 font-normal">Question</th>{data.citations.assistants.map((a) => <th key={a.id} className="py-1 pr-3 font-normal">{a.name}</th>)}</tr></thead>
                <tbody>{data.questions.map((q) => (
                  <tr key={q.q} className="border-t border-line">
                    <td className="py-1 pr-3"><span className="text-mute">{q.market.toUpperCase()}</span> · {q.q}</td>
                    {data.citations!.assistants.map((a) => { const x = a.answers.find((y) => y.q === q.q); return <td key={a.id} className="py-1 pr-3" title={x?.error ?? x?.domains.join(", ")}>{!x || x.error ? "–" : x.cited ? "✓ cited" : "✗"}</td>; })}
                  </tr>
                ))}</tbody>
              </table>
            </details>
          </>
        )}
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer text-accent">The {data.questions.length} test questions</summary>
          <ul className="mt-2 space-y-1">{data.questions.map((q) => <li key={q.q}><span className="text-mute">{q.market.toUpperCase()}</span> · {q.q}</li>)}</ul>
        </details>
      </section>

      <ManualCheck manual={data.manual} onSaved={load} />

      <section className={card}>
        <h2 className="text-lg font-semibold">Bing and Copilot</h2>
        <p className="mt-1 text-sm text-mute">Bing search traffic for the last 28 days. Bing&apos;s AI Performance report (when Copilot and Bing AI cite the site) has no API, so open it with the button.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <a href={data.bing.links.ai} target="_blank" rel="noopener noreferrer" className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white">AI Performance ↗</a>
          <a href={data.bing.links.performance} target="_blank" rel="noopener noreferrer" className="rounded-full bg-canvas px-4 py-2 text-sm font-medium">Search performance ↗</a>
          <a href={data.bing.links.overview} target="_blank" rel="noopener noreferrer" className="rounded-full bg-canvas px-4 py-2 text-sm font-medium">Bing overview ↗</a>
        </div>
        {data.bing.state === "not_connected" && (
          <p className="mt-3 text-sm"><Badge tone="gray">Not connected</Badge> <span className="text-mute">Add the Bing API key as the GitHub secret BING_WEBMASTER_API_KEY at <a className="text-accent" href="https://github.com/1903978-prog/10bonds/settings/secrets/actions/new" target="_blank" rel="noopener noreferrer">https://github.com/1903978-prog/10bonds/settings/secrets/actions/new</a>. It is used from the next update of the site.</span></p>
        )}
        {data.bing.state === "error" && <ErrorNote error={`Bing did not answer: ${data.bing.error}. Check that the key is right and that https://www.10bonds.com/ is verified in Bing.`} />}
        {data.bing.data && (
          <>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Kpi label="Bing clicks, 28 days" value={num(data.bing.data.clicks)} />
              <Kpi label="Bing impressions, 28 days" value={num(data.bing.data.impressions)} />
            </div>
            {data.bing.data.queries.length > 0 && (
              <table className="mt-4 w-full text-sm">
                <thead><tr className="text-left text-mute"><th className="py-1 pr-3 font-normal">Search</th><th className="py-1 pr-3 text-right font-normal">Clicks</th><th className="py-1 pr-3 text-right font-normal">Impressions</th><th className="py-1 text-right font-normal">Position</th></tr></thead>
                <tbody>{data.bing.data.queries.map((q) => <tr key={q.query} className="border-t border-line"><td className="py-1 pr-3">{q.query}</td><td className="py-1 pr-3 text-right">{num(q.clicks)}</td><td className="py-1 pr-3 text-right">{num(q.impressions)}</td><td className="py-1 text-right">{num(q.position, 1)}</td></tr>)}</tbody>
              </table>
            )}
          </>
        )}
      </section>
    </div>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return <div className="rounded-2xl bg-canvas p-3"><p className="text-xs text-mute">{label}</p><p className="mt-1 text-lg font-semibold">{value}</p>{sub && <p className="text-xs text-mute">{sub}</p>}</div>;
}

/** Free weekly check by hand: copy one prompt into ChatGPT and Claude, paste the answers back. */
function ManualCheck({ manual, onSaved }: { manual: Data["manual"]; onSaved: () => void }) {
  const [copied, setCopied] = useState(false);
  const [text, setText] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<Record<string, string>>({});
  const copy = async () => {
    try { await navigator.clipboard.writeText(manual.prompt); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { setCopied(false); }
  };
  const save = async (id: string) => {
    setMsg((m) => ({ ...m, [id]: "Saving…" }));
    try {
      const r = await api<{ answered: number; cited: number; week: string }>("/api/admin/seo/geo", { assistant: id, text: text[id] ?? "" });
      setMsg((m) => ({ ...m, [id]: `Saved for ${r.week}: 10BONDS cited in ${r.cited} of ${r.answered} answers.` }));
      setText((t) => ({ ...t, [id]: "" }));
      onSaved();
    } catch (e) {
      setMsg((m) => ({ ...m, [id]: (e as Error).message }));
    }
  };
  return (
    <section className={card}>
      <h2 className="text-lg font-semibold">Manual check (free, every Monday)</h2>
      <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-mute">
        <li>Copy the prompt below.</li>
        <li>Paste it into ChatGPT and into Claude, with web search on.</li>
        <li>Copy each full answer back into its box and press Save. It counts in the citation score for this week ({manual.week}).</li>
      </ol>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={copy} className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white">{copied ? "Copied ✓" : "Copy prompt"}</button>
        {manual.assistants.map((a) => (
          <a key={a.id} href={a.open} target="_blank" rel="noopener noreferrer" className="rounded-full bg-canvas px-4 py-2 text-sm font-medium">Open {a.name} ↗</a>
        ))}
      </div>
      <textarea readOnly value={manual.prompt} rows={6} className="mt-3 w-full rounded-xl border border-line bg-canvas p-3 font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {manual.assistants.map((a) => (
          <div key={a.id}>
            <label className="text-sm font-medium" htmlFor={`paste-${a.id}`}>
              {a.name} answers {manual.saved.includes(a.id) && <Badge tone="green">saved this week</Badge>}
            </label>
            <textarea id={`paste-${a.id}`} rows={8} value={text[a.id] ?? ""} onChange={(e) => setText((t) => ({ ...t, [a.id]: e.target.value }))}
              placeholder={`Paste the whole ${a.name} answer here (Q1: … Q30: …)`} className="mt-1 w-full rounded-xl border border-line p-3 text-sm" />
            <div className="mt-1 flex items-center gap-3">
              <button type="button" onClick={() => save(a.id)} disabled={!(text[a.id] ?? "").trim()} className="rounded-full bg-ink px-4 py-1.5 text-sm font-medium text-white disabled:opacity-40">Save</button>
              {msg[a.id] && <span className="text-sm text-mute">{msg[a.id]}</span>}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
