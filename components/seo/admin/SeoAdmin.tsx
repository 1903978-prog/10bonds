"use client";

import { useState } from "react";
import type { Locale } from "@/lib/seo/locales";
import Backlinks from "./Backlinks";
import Countries from "./Countries";
import Guides from "./Guides";
import Keywords from "./Keywords";
import Overview from "./Overview";
import Performance from "./Performance";
import Rankings from "./Rankings";

const MARKETS: { id: Locale; label: string }[] = [
  { id: "it", label: "🇮🇹 Italy" },
  { id: "fr", label: "🇫🇷 France" },
  { id: "de", label: "🇩🇪 Germany" },
];
const TABS = [
  ["overview", "Score & roadmap"],
  ["rankings", "Google rankings"],
  ["countries", "Countries & Languages"],
  ["keywords", "Keywords & Knowledge Center"],
  ["guides", "Guides & authors"],
  ["backlinks", "Backlinks"],
  ["performance", "Search performance"],
] as const;
type Tab = (typeof TABS)[number][0];

/** Admin -> SEO Management. Only the admin reaches it (the page and every API route check). */
export default function SeoAdmin() {
  const [market, setMarket] = useState<Locale>("it");
  const [tab, setTab] = useState<Tab>("overview");
  const perMarket = tab !== "countries" && tab !== "backlinks";
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[32px] font-semibold tracking-tight">SEO Management</h1>
        <p className="mt-1 text-sm text-mute">
          Only you can see this page. · <a href="/admin" className="text-accent">Back to Admin</a>
        </p>
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
      {tab === "overview" && <Overview market={market} />}
      {tab === "rankings" && <Rankings market={market} />}
      {tab === "countries" && <Countries />}
      {tab === "keywords" && <Keywords market={market} />}
      {tab === "guides" && <Guides market={market} />}
      {tab === "backlinks" && <Backlinks />}
      {tab === "performance" && <Performance market={market} />}
    </div>
  );
}
