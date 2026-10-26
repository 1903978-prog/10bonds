"use client";

import { useState } from "react";
import { fixBrief } from "@/lib/seo/technical";
import type { SummaryData } from "./Summary";
import { useTech } from "./Technical";
import { btnLight, card, ErrorNote } from "./ui";

const SITE = "https://10bonds.com";

/** Fixes to paste: ready-made text for the project chat (Claude fixes the site) and for Google and Bing. */
export default function Fixes({ version, summary }: { version: number; summary: SummaryData | null }) {
  const { data, error } = useTech(version);
  if (error) return <ErrorNote error={error} />;
  if (!data) return <p className="text-sm text-mute">Loading…</p>;
  const brief = fixBrief(
    "10bonds.com",
    data.issues.filter((i) => i.severity !== "low"),
    (summary?.next ?? []).map((n) => ({ area: n.area, title: n.title, action: n.action })),
  );
  const minor = data.issues.filter((i) => i.severity === "low");
  return (
    <div className="space-y-5" data-testid="seo-fixes">
      <Paste
        title="Ask Claude to fix the site"
        hint="Paste into the 10BONDS project chat. It lists the serious and medium problems from the last crawl and the next improvements."
        text={brief}
        rows={10}
      />
      {minor.length > 0 && (
        <Paste
          title={`Minor problems (${minor.length})`}
          hint="Lower priority: paste these once the list above is done."
          text={fixBrief("10bonds.com", minor, [])}
          rows={5}
        />
      )}
      <Paste title="Sitemap for Google" hint="Paste in Search Console → Sitemaps:" link="https://search.google.com/search-console/sitemaps?resource_id=sc-domain%3A10bonds.com" text={`${SITE}/sitemap.xml`} rows={1} />
      <Paste title="Sitemap for Bing" hint="Paste in Bing Webmaster Tools → Sitemaps:" link="https://www.bing.com/webmasters/sitemaps?siteUrl=https%3A%2F%2Fwww.10bonds.com%2F" text={`${SITE}/sitemap.xml`} rows={1} />
    </div>
  );
}

function Paste({ title, hint, text, rows, link }: { title: string; hint: string; text: string; rows: number; link?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };
  return (
    <section className={card}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">{title}</h2>
        <button onClick={copy} className={`${btnLight} w-24`}>{copied ? "Copied" : "Copy"}</button>
      </div>
      <p className="mt-1 text-xs text-mute">{hint}{link && <> <a href={link} target="_blank" rel="noopener noreferrer" className="break-all text-accent">{link}</a></>}</p>
      <textarea readOnly value={text} rows={rows} className="mt-3 w-full rounded-xl border border-line bg-canvas px-3 py-2 font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
    </section>
  );
}
