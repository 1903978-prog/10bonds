"use client";
import Link from "next/link";

import { useEffect, useState } from "react";
import type { SeoMarket } from "@/lib/seo/input";
import { bingLinks } from "@/lib/seo/bing";
import AiVisibility from "./AiVisibility";
import Backlinks from "./Backlinks";
import Countries from "./Countries";
import Guides from "./Guides";
import Keywords from "./Keywords";
import Overview from "./Overview";
import Performance from "./Performance";
import Rankings from "./Rankings";
import SearchKpis from "./SearchKpis";
import Sharing from "./Sharing";

const MARKETS: { id: SeoMarket; label: string }[] = [
  { id: "it", label: "🇮🇹 Italy" },
  { id: "fr", label: "🇫🇷 France" },
  { id: "de", label: "🇩🇪 Germany" },
  { id: "us", label: "🇺🇸 United States" },
  { id: "uk", label: "🇬🇧 United Kingdom" },
];
const TABS = [
  ["overview", "Score & roadmap"],
  ["rankings", "Google rankings"],
  ["ai", "AI visibility"],
  ["countries", "Countries & Languages"],
  ["keywords", "Keywords & Knowledge Center"],
  ["guides", "Guides & authors"],
  ["backlinks", "Backlinks"],
  ["performance", "Search performance"],
  ["sharing", "Sharing & indexing"],
] as const;
type Tab = (typeof TABS)[number][0];

const bing = bingLinks();
/** Google and Bing webmaster reports for the site, in one place. */
const REPORTS: [string, string][] = [
  ["Google Search Console", "https://search.google.com/search-console?resource_id=https%3A%2F%2F10bonds.com%2F"],
  ["Google: search performance", "https://search.google.com/search-console/performance/search-analytics?resource_id=https%3A%2F%2F10bonds.com%2F&num_of_days=28"],
  ["Bing overview", bing.overview],
  ["Bing: search performance", bing.performance],
  ["Bing: AI Performance", bing.ai],
];

/** Admin -> SEO Management. Only the admin reaches it (the page and every API route check). */
export default function SeoAdmin() {
  const [market, setMarket] = useState<SeoMarket>("it");
  const [tab, setTab] = useState<Tab>("overview");
  // A link back from LinkedIn's sign-in opens the Sharing tab (?tab=sharing).
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    if (TABS.some(([id]) => id === t)) setTab(t as Tab);
  }, []);
  const perMarket = tab !== "countries" && tab !== "backlinks" && tab !== "ai" && tab !== "sharing";
  const usUk = market === "us" || market === "uk";
  const eu = usUk ? null : market;
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[32px] font-semibold tracking-tight">SEO Management</h1>
        <p className="mt-1 text-sm text-mute">
          Only you can see this page. · <Link href="/admin" className="text-accent">Back to Admin</Link>
        </p>
      </div>
      <SearchKpis />
      <div className="flex flex-wrap items-center gap-2 rounded-[20px] bg-white px-4 py-3" aria-label="Reports">
        <span className="text-xs text-mute">Open the reports:</span>
        {REPORTS.map(([label, href]) => (
          <a key={label} href={href} target="_blank" rel="noopener noreferrer" className="rounded-full bg-canvas px-3 py-1.5 text-sm hover:bg-line">{label} ↗</a>
        ))}
      </div>
      <nav className="flex flex-wrap gap-2" aria-label="Sections">
        {TABS.map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} className={`rounded-full px-4 py-2 text-sm ${tab === id ? "bg-ink text-white" : "bg-white"}`} data-testid={`seo-tab-${id}`}>
            {label}
          </button>
        ))}
      </nav>
      {perMarket && (
        <div className="flex flex-wrap items-center gap-2" aria-label="Market">
          <span className="text-xs text-mute">Market:</span>
          {MARKETS.map((m) => (
            <button key={m.id} onClick={() => setMarket(m.id)} className={`rounded-full px-3 py-1.5 text-sm ${market === m.id ? "bg-accent text-white" : "bg-white"}`} data-testid={`seo-market-${m.id}`}>
              {m.label}
            </button>
          ))}
        </div>
      )}
      {usUk && (tab === "overview" || tab === "guides" || tab === "performance") && (
        <p className="rounded-[20px] bg-white px-5 py-4 text-sm text-mute">
          The US and UK are tracked through their keywords and Google rankings (English pages, searches from that country). This tab covers Italy, France and Germany only.
        </p>
      )}
      {tab === "overview" && eu && <Overview market={eu} />}
      {tab === "rankings" && <Rankings market={market} />}
      {tab === "ai" && <AiVisibility />}
      {tab === "countries" && <Countries />}
      {tab === "keywords" && <Keywords market={market} />}
      {tab === "guides" && eu && <Guides market={eu} />}
      {tab === "backlinks" && <Backlinks />}
      {tab === "performance" && eu && <Performance market={eu} />}
      {tab === "sharing" && <Sharing />}
    </div>
  );
}
