"use client";

import { useCallback, useEffect, useState } from "react";
import type { Locale } from "@/lib/seo/locales";
import type { ContentScore } from "@/lib/seo/contentScores";
import type { Bucket, RankingRow } from "@/lib/seo/rankings";
import { api, Badge, card, day, ErrorNote, num, Steps, Table } from "./ui";

type Data = {
  market: Locale; state: "not_connected" | "needs_setting" | "connected"; site: string | null; serviceAccount: string | null; error: string | null;
  site28: { clicks: number; impressions: number; position: number } | null;
  rows: (RankingRow & { content: ContentScore | null })[];
  kpi: { tracked: number; ranking: number; top3: number; page1: number; page1Share: number; page2: number; clicks: number; impressions: number; at: string | null } | null;
};

const BUCKET: Record<Bucket, [string, "green" | "amber" | "red" | "gray"]> = {
  top3: ["Top 3", "green"], page1: ["Page 1", "green"], page2: ["Page 2", "amber"], beyond: ["Page 3+", "red"], none: ["Not ranking yet", "gray"],
};
/** Search Console performance report for the property, optionally filtered to one search. */
const gscLink = (site: string | null, query?: string) =>
  `https://search.google.com/search-console/performance/search-analytics?resource_id=${encodeURIComponent(site ?? "https://10bonds.com/")}${query ? `&query=*${encodeURIComponent(query)}` : ""}&num_of_days=28`;
const pct = (x: number | null) => (x === null ? "—" : `${(x * 100).toLocaleString("en-GB", { maximumFractionDigits: 1 })}%`);

/** Google rankings: where the target keywords appear in Google, from Search Console. Real numbers only. */
export default function Rankings({ market }: { market: Locale }) {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setData(null);
    try {
      setData(await api<Data>(`/api/admin/seo/rankings?market=${market}`));
    } catch (e) {
      setError((e as Error).message);
    }
  }, [market]);
  useEffect(() => {
    load();
  }, [load]);

  if (!data) return <section className={card}><p className="text-sm text-mute">Loading rankings from Google…</p><ErrorNote error={error} /></section>;
  const k = data.kpi;
  return (
    <div className="space-y-6" data-testid="seo-rankings">
      <section className={card}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Google rankings</h2>
          <a href={gscLink(data.site)} target="_blank" rel="noopener noreferrer" className="rounded-full bg-canvas px-4 py-2 text-sm font-medium text-accent hover:bg-line" data-testid="gsc-open">Open in Google Search Console ↗</a>
        </div>
        <p className="mt-1 text-sm text-mute">Where your target keywords appear in Google for this language, from Search Console (average position over the last 28 days; page 1 = position 1 to 10). Edit the keyword list in “Keywords & Knowledge Center”.</p>
        {data.state !== "connected" ? (
          <div className="mt-3 rounded-xl bg-canvas p-4">
            <p className="text-sm font-medium">Search Console is not connected yet, so there are no rankings to show.</p>
            <Steps steps={[
              { text: "Follow the steps in the “Search performance” tab (Search Console, service account, GitHub secret). Search Console home:", url: "https://search.google.com/search-console" },
              { text: "Google starts reporting positions a few days after the site is verified." },
            ]} />
          </div>
        ) : (
          <>
            <ErrorNote error={data.error} />
            {!k ? <p className="mt-3 text-sm text-mute">No data from Google yet for these keywords.</p> : (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4" data-testid="rank-kpis">
                <Kpi label="Keywords on page 1" value={`${k.page1} of ${k.tracked}`} sub={pct(k.page1Share)} />
                <Kpi label="In the top 3" value={String(k.top3)} sub={`${k.page2} on page 2`} />
                <Kpi label="Appearing in Google" value={`${k.ranking} of ${k.tracked}`} sub={`${k.tracked - k.ranking} not yet`} />
                <Kpi label="Language pages, 28 days" value={`${num(data.site28?.clicks ?? null)} clicks`} sub={`${num(data.site28?.impressions ?? null)} impressions`} />
              </div>
            )}
            {k?.at && <p className="mt-2 text-xs text-mute">Google data up to {day(k.at)} · property {data.site}</p>}
          </>
        )}
      </section>

      <section className={card}>
        <h2 className="text-lg font-semibold">Keyword by keyword</h2>
        {data.rows.length === 0 ? <p className="mt-2 text-sm text-mute">No target keywords for this language yet.</p> : (
          <Table head={["Keyword", "Google", "Position", "Change", "Clicks", "Impressions", "CTR", "Monthly searches", "Landing page", "Content vs top 3", "Top 3 on Google"]} min="84rem">
            {data.rows.map((r) => {
              const change = r.position !== null && r.previous !== null ? r.previous - r.position : null;
              return (
                <tr key={r.id} className="border-t border-line">
                  <td className="py-2 pr-3 font-medium"><a href={gscLink(data.site, r.keyword)} target="_blank" rel="noopener noreferrer" className="hover:text-accent" title="See this search in Search Console">{r.keyword} ↗</a></td>
                  <td className="pr-3">{data.state === "connected" && k ? <Badge tone={BUCKET[r.bucket][1]}>{BUCKET[r.bucket][0]}</Badge> : <span className="text-mute">—</span>}</td>
                  <td className="pr-3">{num(r.position, 1)}</td>
                  <td className={`pr-3 ${change === null ? "text-mute" : change > 0 ? "text-green-700" : change < 0 ? "text-red-700" : "text-mute"}`}>{change === null ? "—" : change > 0 ? `▲ ${num(change, 1)}` : change < 0 ? `▼ ${num(-change, 1)}` : "="}</td>
                  <td className="pr-3">{num(r.clicks)}</td>
                  <td className="pr-3">{num(r.impressions)}</td>
                  <td className="pr-3">{pct(r.ctr)}</td>
                  <td className="pr-3 text-mute">{num(r.volume)}</td>
                  <td className="break-all pr-3 text-mute">{r.landingPath ?? "—"}</td>
                  <td className="pr-3"><ContentCell c={r.content} /></td>
                  <td className="text-xs">
                    {r.content?.competitors.length ? (
                      <ol className="space-y-0.5">
                        {r.content.competitors.map((c, i) => (
                          <li key={c.url}><a href={c.url} target="_blank" rel="noopener noreferrer nofollow" className="text-accent hover:underline" title={c.title}>{i + 1}. {host(c.url)} ↗</a></li>
                        ))}
                      </ol>
                    ) : <span className="text-mute">—</span>}
                  </td>
                </tr>
              );
            })}
          </Table>
        )}
      </section>
    </div>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub: string }) {
  return <div className="rounded-2xl bg-canvas p-3"><p className="text-xs text-mute">{label}</p><p className="mt-1 text-lg font-semibold">{value}</p><p className="text-xs text-mute">{sub}</p></div>;
}

const host = (url: string) => { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; } };

/** Our page's content score against the top 3 Google results, with the reason on hover and below. */
function ContentCell({ c }: { c: ContentScore | null }) {
  if (!c) return <span className="text-mute">Not checked</span>;
  if (c.status === "draft") return <span title={c.note}><Badge tone="gray">Draft, not public</Badge></span>;
  if (c.status === "missing") return <span title={c.note}><Badge tone="red">Page missing</Badge></span>;
  const tone = c.score === null ? "gray" : c.score >= 7 ? "green" : c.score >= 5 ? "amber" : "red";
  return (
    <div className="min-w-[12rem]">
      <span title={`Depth ${c.depth ?? "—"} · relevance ${c.relevance ?? "—"} · richness ${c.richness ?? "—"}`}><Badge tone={tone}>{c.score ?? "—"}/10</Badge></span>
      {c.status === "gap" && <> <Badge tone="purple">Gap</Badge></>}
      <p className="mt-1 text-xs leading-snug text-mute">{c.note}</p>
      <p className="text-[11px] text-mute">Checked {day(c.checkedAt)}</p>
    </div>
  );
}
