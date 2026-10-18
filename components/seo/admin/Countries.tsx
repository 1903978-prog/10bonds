"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/lib/seo/locales";
import { api, Badge, card, day, ErrorNote, num, Table } from "./ui";

type Market = {
  market: Locale; name: string; language: string; publishedGuides: number; guidesInReview: number; draftGuides: number; indexableComparisons: number;
  keywords: number; impressions: number | null; clicks: number | null; registrations: number | null; paidConversions: number | null; score: number | null; scoredAt: string | null;
};
type Version = { id: number; slug: string; title: string; status: string; unverified: boolean; outdated: boolean } | null;
type Data = { markets: Market[]; global: number | null; gscConnected: boolean; translations: { group: string; versions: Record<Locale, Version> }[] };

const L: Locale[] = ["it", "fr", "de"];

export default function Countries() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api<Data>("/api/admin/seo/countries").then(setData).catch((e) => setError((e as Error).message));
  }, []);
  if (error) return <ErrorNote error={error} />;
  if (!data) return <p className="text-sm text-mute">Loading…</p>;
  const missing = data.translations.reduce((s, g) => s + L.filter((l) => !g.versions[l]).length, 0);
  const outdated = data.translations.reduce((s, g) => s + L.filter((l) => g.versions[l]?.outdated).length, 0);
  const unverified = data.translations.reduce((s, g) => s + L.filter((l) => g.versions[l]?.unverified).length, 0);
  return (
    <div className="space-y-5" data-testid="seo-countries">
      <section className={card}>
        <h2 className="text-lg font-semibold">Countries & Languages</h2>
        <p className="mt-1 text-xs text-mute">
          One central bond database; each market has its own language site, content and keywords. Search figures come from Search Console ({data.gscConnected ? "connected, top 25 pages so lower bounds" : "not connected"}); sign-ups and paid conversions come from the site&apos;s own records (last 28 days, visitors who allowed statistics cookies and landed from a search engine on that language).
        </p>
        <Table head={["Market", "Published guides", "In review / draft", "Indexable comparison pages", "Target keywords", "Impressions", "Clicks", "Registrations", "Paid", "SEO score"]} min="58rem">
          {data.markets.map((m) => (
            <tr key={m.market} className="border-t border-line">
              <td className="py-2 pr-3 font-medium">{m.name}<span className="block text-xs font-normal text-mute">{m.language} · /{m.market}</span></td>
              <td className="pr-3">{m.publishedGuides}</td>
              <td className="pr-3">{m.guidesInReview} / {m.draftGuides}</td>
              <td className="pr-3">{m.indexableComparisons}</td>
              <td className="pr-3">{m.keywords}</td>
              <td className="pr-3">{num(m.impressions)}</td>
              <td className="pr-3">{num(m.clicks)}</td>
              <td className="pr-3">{num(m.registrations)}</td>
              <td className="pr-3">{num(m.paidConversions)}</td>
              <td>{m.score === null ? "—" : <><b>{num(m.score, 1)}</b>/100<span className="block text-xs text-mute">{day(m.scoredAt)}</span></>}</td>
            </tr>
          ))}
          <tr className="border-t border-line">
            <td className="py-2 pr-3 font-medium" colSpan={9}>Average of the three markets (internal metric, equal weights — not a Google score)</td>
            <td><b>{data.global === null ? "—" : num(data.global, 1)}</b></td>
          </tr>
        </Table>
      </section>

      <section className={card}>
        <h2 className="text-lg font-semibold">Translation status</h2>
        <p className="mt-1 text-xs text-mute">
          {missing} missing · {outdated} possibly outdated (another language was edited later) · {unverified} not yet verified by a person. Each version is edited and published on its own, in “Guides & authors”.
        </p>
        <Table head={["Guide group", "Italiano", "Français", "Deutsch"]} min="40rem">
          {data.translations.map((g) => (
            <tr key={g.group} className="border-t border-line align-top">
              <td className="py-2 pr-3 font-mono text-xs">{g.group}</td>
              {L.map((l) => {
                const v = g.versions[l];
                return (
                  <td key={l} className="pr-3">
                    {!v ? <Badge tone="red">Missing</Badge> : (
                      <>
                        <span className="block text-xs">{v.title}</span>
                        <span className="mt-1 flex flex-wrap gap-1">
                          <Badge tone={v.status === "published" ? "green" : v.status === "review" ? "amber" : "gray"}>{v.status}</Badge>
                          {v.unverified && <Badge tone="purple">Unverified translation</Badge>}
                          {v.outdated && <Badge tone="amber">Outdated?</Badge>}
                        </span>
                      </>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </Table>
      </section>
    </div>
  );
}
