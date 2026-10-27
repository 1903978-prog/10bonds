"use client";

import { useEffect, useState } from "react";
import type { PsiResult } from "@/lib/seo/google";
import type { CrawlSnapshot, Issue } from "@/lib/seo/technical";
import { api, Badge, card, ErrorNote, num, Table, when } from "./ui";

export type TechData = { crawl: CrawlSnapshot | null; issues: Issue[]; psi: { market: string; psi: PsiResult | null; error: string | null }[] };

export function useTech(version: number) {
  const [data, setData] = useState<TechData | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api<TechData>("/api/admin/seo/technical").then(setData, (e: Error) => setError(e.message));
  }, [version]);
  return { data, error, setData };
}

const SEV: Record<Issue["severity"], "red" | "amber" | "gray"> = { high: "red", medium: "amber", low: "gray" };

/** Pages & technical: what the last crawl found on every public page. */
export default function Technical({ version }: { version: number }) {
  const { data, error } = useTech(version);
  const [all, setAll] = useState(false);
  if (error) return <ErrorNote error={error} />;
  if (!data) return <p className="text-sm text-mute">Loading…</p>;
  const c = data.crawl;
  if (!c) return <p className={`${card} text-sm text-mute`}>No crawl yet. Press &ldquo;Refresh now&rdquo; at the top.</p>;
  const ok = c.pages.filter((p) => p.status === 200);
  const indexable = ok.filter((p) => !p.noindex);
  const count = (s: Issue["severity"]) => data.issues.filter((i) => i.severity === s).length;
  return (
    <div className="space-y-5" data-testid="seo-technical">
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        <Kpi label="Pages read" value={num(c.pages.length)} />
        <Kpi label="Indexable" value={num(indexable.length)} />
        <Kpi label="In sitemap" value={num(c.sitemapCount)} />
        <Kpi label="Not HTTP 200" value={num(c.pages.length - ok.length)} />
        <Kpi label="Broken links" value={num(c.brokenLinks.length)} />
        <Kpi label="Serious problems" value={num(count("high"))} />
        <Kpi label="Medium" value={num(count("medium"))} />
        <Kpi label="Minor" value={num(count("low"))} />
      </section>
      <p className="text-xs text-mute">Last crawl {when(c.at)} · robots.txt {c.robotsOk ? "ok" : "missing"} · sitemap {c.sitemapOk ? "ok" : "missing"}{c.error ? ` · error: ${c.error}` : ""}</p>

      <section className={card}>
        <h2 className="text-lg font-semibold">Problems found</h2>
        <div className="max-h-[22rem] overflow-y-auto">
          <Table head={["", "Page", "Problem", "Fix"]} min="44rem">
            {data.issues.length === 0 && <tr><td colSpan={4} className="py-3 text-mute">No problems found.</td></tr>}
            {data.issues.map((i, n) => (
              <tr key={n} className="border-t border-line align-top">
                <td className="py-2 pr-3"><Badge tone={SEV[i.severity]}>{i.severity}</Badge></td>
                <td className="pr-3 font-mono text-xs">{i.path}</td>
                <td className="pr-3">{i.problem}</td>
                <td className="text-xs text-mute">{i.fix}</td>
              </tr>
            ))}
          </Table>
        </div>
      </section>

      <section className={card}>
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">All pages</h2>
          <button onClick={() => setAll(!all)} className="text-sm text-accent">{all ? "Hide" : `Show all ${c.pages.length}`}</button>
        </div>
        {all && (
          <div className="max-h-[26rem] overflow-y-auto">
            <Table head={["Page", "HTTP", "Title", "Description", "H1", "Words", "Index", "Sitemap", "Structured data"]} min="64rem">
              {c.pages.map((p) => (
                <tr key={p.path} className="border-t border-line align-top text-xs">
                  <td className="py-2 pr-3 font-mono">{p.path}</td>
                  <td className="pr-3">{p.status}</td>
                  <td className="max-w-[16rem] pr-3">{p.title ?? "–"} <span className="text-mute">({p.title?.length ?? 0})</span></td>
                  <td className="pr-3 text-mute">{p.description?.length ?? 0} chars</td>
                  <td className="pr-3">{p.h1}</td>
                  <td className="pr-3">{num(p.words)}</td>
                  <td className="pr-3">{p.noindex ? "noindex" : "yes"}</td>
                  <td className="pr-3">{p.inSitemap ? "yes" : "no"}</td>
                  <td className="text-mute">{p.jsonLd.join(", ") || "–"}</td>
                </tr>
              ))}
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}

export function Kpi({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-lg border border-line bg-white p-3">
      <p className="text-[11px] text-mute">{label}</p>
      <p className={`mt-0.5 text-lg font-semibold ${tone ?? ""}`}>{value}</p>
    </div>
  );
}
