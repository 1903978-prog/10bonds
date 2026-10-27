"use client";

import { useEffect, useState } from "react";
import type { SearchKpis as Kpis } from "@/lib/seo/bing";
import { bingLinks } from "@/lib/seo/bing";
import { api, num, Steps } from "./ui";

type Engine = { state: "not_connected" | "no_property" | "error" | "connected"; message: string; data: Kpis | null };
type Data = { google: Engine; bing: Engine; at: string; serviceAccount: string | null };

const pct = (x: number | null) => (x === null ? "—" : `${(x * 100).toLocaleString("en-GB", { maximumFractionDigits: 1 })}%`);
const GITHUB_SECRET = "https://github.com/1903978-prog/10bonds/settings/secrets/actions/new";
const REDEPLOY = "https://github.com/1903978-prog/10bonds/actions/workflows/deploy.yml";

/** Change against the previous period, e.g. "+12%". Nothing when there is no earlier figure to compare with. */
function delta(now: number, before: number | null): string | null {
  if (before === null || before === 0) return null;
  const d = Math.round(((now - before) / before) * 100);
  return `${d > 0 ? "+" : ""}${d}%`;
}

/** Google Search Console and Bing Webmaster headline numbers, as small boxes at the top of the SEO page. */
export default function SearchKpis() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api<Data>("/api/admin/seo/stats").then(setData).catch((e) => setError((e as Error).message));
  }, []);
  if (error) return <p className="text-xs text-red-700">Search stats: {error}</p>;
  if (!data) return <p className="text-xs text-mute">Loading search stats…</p>;
  const bing = bingLinks();
  return (
    <section className="space-y-3" aria-label="Search stats" data-testid="seo-kpis">
      <Row name="Google" engine={data.google} indexedLabel="Pages in search" indexedHint="Pages shown in Google at least once" setup={<GoogleSetup email={data.serviceAccount} state={data.google.state} />} />
      <Row name="Bing" engine={data.bing} indexedLabel="Indexed pages" setup={<BingSetup />} extra={<a href={bing.ai} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-line bg-white px-3 py-2 hover:bg-line"><p className="text-[11px] text-mute">AI Performance</p><p className="mt-0.5 text-sm font-semibold text-accent">Open ↗</p></a>} />
    </section>
  );
}

function Row({ name, engine, indexedLabel, indexedHint, setup, extra }: { name: string; engine: Engine; indexedLabel: string; indexedHint?: string; setup: React.ReactNode; extra?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const k = engine.data;
  return (
    <div>
      <p className="mb-1 text-xs text-mute">{name} · {k ? `${engine.message} · last ${k.days} days` : engine.state === "error" ? `error: ${engine.message}` : "not connected"}</p>
      {/* The boxes are always there (a dash until the source is connected), so nothing moves when data arrives. */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <Box label="Clicks" value={k ? num(k.clicks) : "—"} change={k ? delta(k.clicks, k.prevClicks) : null} />
        <Box label="Impressions" value={k ? num(k.impressions) : "—"} change={k ? delta(k.impressions, k.prevImpressions) : null} />
        <Box label="CTR" value={k ? pct(k.ctr) : "—"} />
        <Box label="Avg position" value={k ? num(k.position, 1) : "—"} />
        <Box label={indexedLabel} value={k ? num(k.indexed) : "—"} hint={indexedHint} />
        {extra ?? <div className="rounded-lg border border-line bg-white px-3 py-2"><p className="text-[11px] text-mute">Status</p><p className={`mt-0.5 text-sm font-semibold ${k ? "text-green-700" : "text-red-700"}`}>{k ? "Connected" : "Not connected"}</p></div>}
      </div>
      {!k && (
        <div className="mt-2 rounded-lg border border-line bg-white px-4 py-3 text-sm">
          <button onClick={() => setOpen(!open)} className="text-accent">{open ? "Hide steps" : `Connect ${name} (one time)`}</button>
          {open && setup}
        </div>
      )}
    </div>
  );
}

function Box({ label, value, change, hint }: { label: string; value: string; change?: string | null; hint?: string }) {
  return (
    <div className="rounded-lg border border-line bg-white px-3 py-2" title={hint}>
      <p className="text-[11px] text-mute">{label}</p>
      <p className="mt-0.5 text-lg font-semibold leading-tight">
        {value}
        {change && <span className={`ml-1.5 text-[11px] font-medium ${change.startsWith("-") ? "text-red-700" : "text-green-700"}`}>{change}</span>}
      </p>
    </div>
  );
}

function GoogleSetup({ email, state }: { email: string | null; state: Engine["state"] }) {
  const users = { text: email ? `In Search Console, add ${email} as a user (“Restricted” is enough):` : "In Search Console, add the e-mail from inside the JSON key (client_email) as a user (“Restricted” is enough):", url: "https://search.google.com/search-console/users?resource_id=sc-domain%3A10bonds.com" };
  return (
    <Steps
      steps={state === "no_property" ? [users] : [
        { text: "Create a Google Cloud service account (any name), then open it → Keys → Add key → JSON. A file downloads:", url: "https://console.cloud.google.com/iam-admin/serviceaccounts/create" },
        { text: "Turn on the Search Console API:", url: "https://console.cloud.google.com/apis/library/searchconsole.googleapis.com" },
        { text: "Paste the whole file's text as a new secret named GOOGLE_SERVICE_ACCOUNT_JSON:", url: GITHUB_SECRET },
        users,
        { text: "Press “Run workflow” to update the site:", url: REDEPLOY },
      ]}
    />
  );
}

function BingSetup() {
  return (
    <Steps
      steps={[
        { text: "In Bing Webmaster Tools, click the gear (Settings) → API access → API Key → Generate, and copy it:", url: "https://www.bing.com/webmasters/home?siteUrl=https%3A%2F%2Fwww.10bonds.com%2F" },
        { text: "Paste it as a new secret named BING_WEBMASTER_API_KEY:", url: GITHUB_SECRET },
        { text: "Press “Run workflow” to update the site:", url: REDEPLOY },
      ]}
    />
  );
}
