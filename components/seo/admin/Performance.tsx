"use client";

import { useCallback, useEffect, useState } from "react";
import type { Funnel } from "@/lib/seo/funnel";
import type { Ga4Data, GscData, PsiResult } from "@/lib/seo/google";
import type { Locale } from "@/lib/seo/locales";
import { api, Badge, btn, btnLight, card, day, ErrorNote, Field, input, num, Steps, Table, when } from "./ui";

type Src<T> = { state: "not_connected" | "needs_setting" | "error" | "connected"; message: string; data: T | null };
type Data = {
  market: Locale;
  serviceAccount: string | null;
  settings: { gscSite: string | null; ga4Property: string | null; verification: string | null };
  gsc: Src<GscData & { marketTotals?: { clicks: number; impressions: number } }>;
  ga4: Src<Ga4Data>;
  psi: { psi: PsiResult | null; error: string | null };
  funnel: Funnel | null;
};
const STATE: Record<string, [string, "green" | "amber" | "red" | "gray"]> = {
  connected: ["Connected", "green"], needs_setting: ["Needs a setting", "amber"], error: ["Error", "red"], not_connected: ["Not connected", "gray"],
};
const pct = (x: number | null | undefined) => (x === null || x === undefined ? "—" : `${(x * 100).toLocaleString("en-GB", { maximumFractionDigits: 1 })}%`);

/** SEO Business Performance: real numbers only, kept apart from the Development Score. */
export default function Performance({ market }: { market: Locale }) {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ gscSite: "", ga4Property: "", verification: "" });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await api<Data>(`/api/admin/seo/performance?market=${market}`);
      setData(d);
      setForm({ gscSite: d.settings.gscSite ?? "", ga4Property: d.settings.ga4Property ?? "", verification: d.settings.verification ?? "" });
    } catch (e) {
      setError((e as Error).message);
    }
  }, [market]);
  useEffect(() => {
    load();
  }, [load]);

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/api/admin/seo/performance", form);
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
    setBusy(false);
  }
  async function runPsi() {
    setBusy(true);
    setError(null);
    try {
      await api("/api/admin/seo/performance", { op: "psi", market });
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
    setBusy(false);
  }

  if (!data) return error ? <ErrorNote error={error} /> : <p className="text-sm text-mute">Loading…</p>;
  const g = data.gsc.data;
  const a = data.ga4.data;
  const f = data.funnel;
  const p = data.psi.psi;
  return (
    <div className="space-y-5" data-testid="seo-performance">
      <p className="text-xs text-mute">SEO Business Performance for /{market}: what search actually brings. These numbers never feed the Development Score and are never estimated.</p>

      <section className={card}>
        <div className="flex items-center justify-between gap-2"><h2 className="text-lg font-semibold">Google Search Console</h2><Badge tone={STATE[data.gsc.state][1]}>{STATE[data.gsc.state][0]}</Badge></div>
        <p className="mt-1 text-xs text-mute">{data.gsc.message}</p>
        {g ? (
          <>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Box label="Impressions (whole site)" value={num(g.totals.impressions)} />
              <Box label="Clicks (whole site)" value={num(g.totals.clicks)} />
              <Box label="Average position" value={num(g.totals.position, 1)} />
              <Box label="CTR" value={pct(g.totals.ctr)} />
            </div>
            <p className="mt-2 text-xs text-mute">{day(g.range.start)} – {day(g.range.end)} · /{market} pages among the top 25: {num(g.marketTotals?.impressions)} impressions, {num(g.marketTotals?.clicks)} clicks.</p>
            <div className="grid gap-4 lg:grid-cols-2">
              <Table head={["Top queries", "Clicks", "Impr.", "Pos."]} min="20rem">
                {g.queries.map((q) => <tr key={q.key} className="border-t border-line"><td className="py-1 pr-3">{q.key}</td><td className="pr-3">{q.clicks}</td><td className="pr-3">{q.impressions}</td><td>{num(q.position, 1)}</td></tr>)}
              </Table>
              <Table head={[`Top /${market} pages`, "Clicks", "Impr.", "Pos."]} min="20rem">
                {g.pages.length === 0 && <tr><td colSpan={4} className="py-2 text-mute">No pages of this language in the top 25 yet.</td></tr>}
                {g.pages.map((q) => <tr key={q.key} className="border-t border-line"><td className="py-1 pr-3 text-xs">{new URL(q.key).pathname}</td><td className="pr-3">{q.clicks}</td><td className="pr-3">{q.impressions}</td><td>{num(q.position, 1)}</td></tr>)}
              </Table>
            </div>
          </>
        ) : (
          <SetupGoogle email={data.serviceAccount} />
        )}
      </section>

      <section className={card}>
        <div className="flex items-center justify-between gap-2"><h2 className="text-lg font-semibold">Google Analytics 4</h2><Badge tone={STATE[data.ga4.state][1]}>{STATE[data.ga4.state][0]}</Badge></div>
        <p className="mt-1 text-xs text-mute">{data.ga4.message} GA4 only has data if its tag is on the site (not added yet: it would need the cookie banner to cover it).</p>
        {a && (
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Box label="Organic users" value={num(a.organicUsers)} />
            <Box label="Organic sessions" value={num(a.organicSessions)} />
            {a.organicConversions.slice(0, 2).map((c) => <Box key={c.event} label={c.event} value={num(c.count)} />)}
          </div>
        )}
      </section>

      <section className={card}>
        <h2 className="text-lg font-semibold">Site&apos;s own records · last {f?.days ?? 28} days</h2>
        <p className="mt-1 text-xs text-mute">Counted only for visitors who allowed statistics cookies, so these are lower bounds. Organic = arrived from a search engine on a /{market} page.</p>
        {f ? (
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Box label="Organic visitors" value={num(f.organicVisitors)} />
            <Box label="…who searched bonds" value={num(f.organicSearchers)} />
            <Box label="…who registered" value={num(f.organicSignups)} />
            <Box label="…now paying" value={num(f.organicPaid)} />
            <Box label="Organic → paid" value={pct(f.conversion)} />
            <Box label="All new accounts" value={num(f.allSignups)} />
            <Box label="Paid accounts now" value={num(f.paidAccounts)} />
            <Box label="Consenting visitors" value={num(f.consentedVisitors)} />
          </div>
        ) : <p className="mt-3 text-sm text-mute">Not available.</p>}
      </section>

      <section className={card}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Mobile speed (PageSpeed Insights) · /{market}</h2>
          <button onClick={runPsi} disabled={busy} className={btnLight}>{busy ? "Running (up to a minute)…" : "Run now"}</button>
        </div>
        {data.psi.error && <p className="mt-2 text-xs text-red-700">Last error: {data.psi.error}</p>}
        {p ? (
          <>
            <p className="mt-1 text-xs text-mute">Run {when(p.at)} on {p.url}. Lab = one simulated phone load. Field = real Chrome users over 28 days (only when Google has enough visits).</p>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
              <Box label="Lab performance" value={`${p.lab.performance ?? "—"}/100`} />
              <Box label="Lab LCP" value={p.lab.lcpMs === null ? "—" : `${num(p.lab.lcpMs / 1000, 1)} s`} />
              <Box label="Lab CLS" value={num(p.lab.cls, 3)} />
              <Box label="Lab TBT" value={p.lab.tbtMs === null ? "—" : `${num(p.lab.tbtMs)} ms`} />
              <Box label="Accessibility" value={`${p.lab.accessibility ?? "—"}/100`} />
            </div>
            <p className="mt-3 text-sm">Field data: {p.field ? `overall ${p.field.overall ?? "—"} · LCP ${p.field.lcp ?? "—"} · INP ${p.field.inp ?? "—"} · CLS ${p.field.cls ?? "—"}` : "not enough real visits yet (shown as “Not assessed” in the score)."}</p>
          </>
        ) : <p className="mt-2 text-sm text-mute">Not run yet.</p>}
      </section>

      <section className={card}>
        <h2 className="text-lg font-semibold">Connection settings</h2>
        <form onSubmit={saveSettings} className="mt-3 grid gap-3 sm:grid-cols-3">
          <Field label="Search Console property" hint="sc-domain:10bonds.com (recommended) or https://10bonds.com/"><input value={form.gscSite} onChange={(e) => setForm({ ...form, gscSite: e.target.value })} className={input} /></Field>
          <Field label="GA4 property ID" hint="A number, from GA4 Admin → Property details"><input value={form.ga4Property} onChange={(e) => setForm({ ...form, ga4Property: e.target.value })} className={input} /></Field>
          <Field label="Google verification code" hint="Only the content value of the meta tag"><input value={form.verification} onChange={(e) => setForm({ ...form, verification: e.target.value })} className={input} /></Field>
          <div className="sm:col-span-3"><button disabled={busy} className={btn}>Save settings</button></div>
        </form>
        <ErrorNote error={error} />
      </section>
    </div>
  );
}

function Box({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-canvas p-3"><p className="text-xs text-mute">{label}</p><p className="mt-1 text-lg font-semibold">{value}</p></div>;
}

function SetupGoogle({ email }: { email: string | null }) {
  return (
    <div className="mt-3 rounded-xl bg-canvas p-4">
      <p className="text-sm font-medium">How to connect (once, about 15 minutes)</p>
      <Steps
        steps={[
          { text: "Add the site to Search Console (choose “URL prefix” and enter https://10bonds.com/):", url: "https://search.google.com/search-console/welcome" },
          { text: "Pick the “HTML tag” check, copy only the content=\"…\" value and paste it in “Google verification code” below, Save, then press Verify in Search Console." },
          { text: "Create a Google Cloud service account (any name) and a JSON key for it:", url: "https://console.cloud.google.com/iam-admin/serviceaccounts" },
          { text: "Turn on the Search Console API:", url: "https://console.cloud.google.com/apis/library/searchconsole.googleapis.com" },
          { text: "Turn on the Analytics Data API (for GA4):", url: "https://console.cloud.google.com/apis/library/analyticsdata.googleapis.com" },
          { text: "Save the whole JSON key as a GitHub secret named GOOGLE_SERVICE_ACCOUNT_JSON:", url: "https://github.com/1903978-prog/10bonds/settings/secrets/actions/new" },
          { text: email ? `In Search Console → Settings → Users, add ${email} as a user.` : "In Search Console → Settings → Users, add the service account's e-mail as a user:", url: "https://search.google.com/search-console/users" },
          { text: "Enter the property below (https://10bonds.com/) and Save." },
        ]}
      />
    </div>
  );
}
