"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ListingSite } from "@/lib/seo/listingSites";
import type { Backlink, Opportunity } from "@/lib/seo/store";
import { api, Badge, btn, btnLight, card, day, ErrorNote, Field, input, Table, when } from "./ui";

const LINK = { id: 0, sourceUrl: "", targetUrl: "https://10bonds.com/", linkType: "editorial", rel: "follow", status: "active", relevance: "", quality: "", verifiedAt: new Date().toISOString().slice(0, 10), notes: "" };
const OPP = { id: 0, kind: "publisher", name: "", url: "", status: "idea", notes: "" };

/** Backlinks are site-wide (one domain for all three languages); targets show which language they point to. */
export default function Backlinks() {
  const [data, setData] = useState<{
    backlinks: Backlink[]; opportunities: Opportunity[]; checkedAt: string | null;
    listing: { sites: ListingSite[]; done: Record<string, string> }; bing: { configured: boolean; syncedAt: string | null };
  } | null>(null);
  const [market, setMarket] = useState("all");
  const [syncing, setSyncing] = useState(false);
  const autoSynced = useRef(false);
  const [link, setLink] = useState<typeof LINK | null>(null);
  const [opp, setOpp] = useState<typeof OPP | null>(null);
  const [csv, setCsv] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await api("/api/admin/seo/backlinks"));
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function call(body: Record<string, unknown>, after?: (r: Record<string, unknown>) => void) {
    setError(null);
    setMsg(null);
    try {
      const r = await api<Record<string, unknown>>("/api/admin/seo/backlinks", body);
      after?.(r);
      await load();
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    }
  }

  const syncBing = useCallback(async () => {
    setSyncing(true);
    await call({ op: "bing" }, (r) => setMsg(`Bing: ${r.imported} link${r.imported === 1 ? "" : "s"} from other websites found and saved.`));
    setSyncing(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Refresh from Bing once a day, when the page is opened.
  useEffect(() => {
    if (!data?.bing.configured || autoSynced.current) return;
    autoSynced.current = true;
    if (!data.bing.syncedAt || Date.now() - Date.parse(data.bing.syncedAt) > 86_400_000) syncBing();
  }, [data, syncBing]);

  if (!data) return error ? <ErrorNote error={error} /> : <p className="text-sm text-mute">Loading…</p>;
  const active = data.backlinks.filter((b) => b.status === "active");
  const domains = new Set(active.map((b) => b.sourceDomain)).size;
  return (
    <div className="space-y-5" data-testid="seo-backlinks">
      <section className={card}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">Backlinks</h2>
            <p className="mt-1 max-w-3xl text-xs text-mute">
              {active.length} active links from {domains} websites. Last checked: {when(data.checkedAt)}.{" "}
              {data.bing.configured ? `Bing Webmaster Tools is read automatically once a day (last: ${when(data.bing.syncedAt)}).` : "Bing is not connected (BING_WEBMASTER_API_KEY missing)."} Until you add links, import a file or confirm you checked, the backlink score stays “Not assessed” (not a verified zero).
              Export the list from Search Console → Links → “Export external links” at https://search.google.com/search-console/links, or from Ahrefs / Semrush.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {data.bing.configured && <button disabled={syncing} onClick={syncBing} className={btn}>{syncing ? "Reading Bing…" : "Update from Bing"}</button>}
            <button onClick={() => setLink({ ...LINK })} className={btnLight}>Add link</button>
            <button onClick={() => setCsv("")} className={btnLight}>Import CSV</button>
            <button onClick={() => call({ op: "checked" }, () => setMsg("Recorded: you checked the backlink sources today."))} className={btnLight}>I checked, list is complete</button>
          </div>
        </div>
        <ErrorNote error={error} />
        {msg && <p className="mt-3 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800">{msg}</p>}
        {csv !== null && (
          <div className="mt-3 flex flex-wrap items-end gap-2 rounded-xl bg-canvas p-3">
            <Field label="CSV from Search Console, Ahrefs, Semrush or a simple list (linking page, target page)"><input type="file" accept=".csv,text/csv" className={input} onChange={async (e) => setCsv((await e.target.files?.[0]?.text()) ?? "")} /></Field>
            <button disabled={!csv} onClick={() => call({ op: "import", csv }, (r) => { setCsv(null); setMsg(`${r.imported} links imported, ${r.skipped} rows skipped.`); })} className={btn}>Import</button>
            <button onClick={() => setCsv(null)} className={btnLight}>Cancel</button>
          </div>
        )}
        {link && (
          <form onSubmit={async (e) => { e.preventDefault(); if (await call({ op: "save", ...link, id: link.id || null })) setLink(null); }} className="mt-3 grid gap-3 rounded-xl bg-canvas p-3 sm:grid-cols-3">
            <Field label="Linking page URL" wide><input required value={link.sourceUrl} onChange={(e) => setLink({ ...link, sourceUrl: e.target.value })} className={input} /></Field>
            <Field label="Page on 10BONDS"><input value={link.targetUrl} onChange={(e) => setLink({ ...link, targetUrl: e.target.value })} className={input} /></Field>
            <Field label="Type">
              <select value={link.linkType} onChange={(e) => setLink({ ...link, linkType: e.target.value })} className={input}>{["editorial", "directory", "social", "forum", "partner", "sponsored"].map((x) => <option key={x}>{x}</option>)}</select>
            </Field>
            <Field label="Link attribute">
              <select value={link.rel} onChange={(e) => setLink({ ...link, rel: e.target.value })} className={input}>{["follow", "nofollow", "ugc", "sponsored"].map((x) => <option key={x}>{x}</option>)}</select>
            </Field>
            <Field label="Status">
              <select value={link.status} onChange={(e) => setLink({ ...link, status: e.target.value })} className={input}>{["active", "lost", "unverified"].map((x) => <option key={x}>{x}</option>)}</select>
            </Field>
            <Field label="Relevance 1-5"><input inputMode="numeric" value={link.relevance} onChange={(e) => setLink({ ...link, relevance: e.target.value })} className={input} /></Field>
            <Field label="Quality 1-5"><input inputMode="numeric" value={link.quality} onChange={(e) => setLink({ ...link, quality: e.target.value })} className={input} /></Field>
            <Field label="Last seen live"><input type="date" value={link.verifiedAt} onChange={(e) => setLink({ ...link, verifiedAt: e.target.value })} className={input} /></Field>
            <Field label="Notes" wide><input value={link.notes} onChange={(e) => setLink({ ...link, notes: e.target.value })} className={input} maxLength={500} /></Field>
            <div className="flex gap-2 sm:col-span-3"><button className={btn}>Save</button><button type="button" onClick={() => setLink(null)} className={btnLight}>Cancel</button></div>
          </form>
        )}
        <Table head={["Website", "Points to", "Type", "Attribute", "Status", "Rel./Qual.", "Last seen", ""]} min="54rem">
          {data.backlinks.length === 0 && <tr><td colSpan={8} className="py-3 text-mute">No backlinks recorded.</td></tr>}
          {data.backlinks.map((b) => (
            <tr key={b.id} className="border-t border-line align-top">
              <td className="py-2 pr-3"><a href={b.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className="text-accent">{b.sourceDomain}</a></td>
              <td className="pr-3 text-xs">{(() => { try { return new URL(b.targetUrl).pathname; } catch { return b.targetUrl; } })()}</td>
              <td className="pr-3 text-xs">{b.linkType}</td>
              <td className="pr-3 text-xs">{b.rel}</td>
              <td className="pr-3"><Badge tone={b.status === "active" ? "green" : b.status === "lost" ? "red" : "gray"}>{b.status}</Badge></td>
              <td className="pr-3 text-xs">{b.relevance ?? "—"}/{b.quality ?? "—"}</td>
              <td className="pr-3 text-xs">{day(b.verifiedAt)}</td>
              <td className="whitespace-nowrap">
                <button onClick={() => setLink({ id: b.id, sourceUrl: b.sourceUrl, targetUrl: b.targetUrl, linkType: b.linkType, rel: b.rel, status: b.status, relevance: b.relevance?.toString() ?? "", quality: b.quality?.toString() ?? "", verifiedAt: b.verifiedAt ?? "", notes: b.notes ?? "" })} className="text-sm text-accent">Edit</button>
                <button onClick={() => confirm("Delete this link?") && call({ op: "delete", id: b.id })} className="ml-3 text-sm text-red-700">Delete</button>
              </td>
            </tr>
          ))}
        </Table>
      </section>

      <ListingSites sites={data.listing.sites} done={data.listing.done} market={market} setMarket={setMarket} onToggle={(id, done) => call({ op: "listing", id, done })} />

      <section className={card}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">Link opportunities</h2>
            <p className="mt-1 text-xs text-mute">Publishers, blogs, schools, YouTube channels or unlinked mentions worth contacting.</p>
          </div>
          <button onClick={() => setOpp({ ...OPP })} className={btnLight}>Add opportunity</button>
        </div>
        {opp && (
          <form onSubmit={async (e) => { e.preventDefault(); if (await call({ op: "opportunity", ...opp, id: opp.id || null })) setOpp(null); }} className="mt-3 grid gap-3 rounded-xl bg-canvas p-3 sm:grid-cols-3">
            <Field label="Name"><input required value={opp.name} onChange={(e) => setOpp({ ...opp, name: e.target.value })} className={input} maxLength={150} /></Field>
            <Field label="Type"><select value={opp.kind} onChange={(e) => setOpp({ ...opp, kind: e.target.value })} className={input}>{["publisher", "blog", "education", "youtube", "mention", "other"].map((x) => <option key={x}>{x}</option>)}</select></Field>
            <Field label="Status"><select value={opp.status} onChange={(e) => setOpp({ ...opp, status: e.target.value })} className={input}>{["idea", "contacted", "in_progress", "won", "declined"].map((x) => <option key={x}>{x}</option>)}</select></Field>
            <Field label="URL"><input value={opp.url} onChange={(e) => setOpp({ ...opp, url: e.target.value })} className={input} /></Field>
            <Field label="Notes" wide><input value={opp.notes} onChange={(e) => setOpp({ ...opp, notes: e.target.value })} className={input} maxLength={1000} /></Field>
            <div className="flex gap-2 sm:col-span-3"><button className={btn}>Save</button><button type="button" onClick={() => setOpp(null)} className={btnLight}>Cancel</button></div>
          </form>
        )}
        <Table head={["Name", "Type", "Status", "Notes", ""]}>
          {data.opportunities.length === 0 && <tr><td colSpan={5} className="py-3 text-mute">No opportunities yet.</td></tr>}
          {data.opportunities.map((o) => (
            <tr key={o.id} className="border-t border-line align-top">
              <td className="py-2 pr-3">{o.url ? <a href={o.url} target="_blank" rel="noopener noreferrer nofollow" className="text-accent">{o.name}</a> : o.name}</td>
              <td className="pr-3 text-xs">{o.kind}</td>
              <td className="pr-3"><Badge tone={o.status === "won" ? "green" : o.status === "declined" ? "red" : "gray"}>{o.status}</Badge></td>
              <td className="pr-3 text-xs text-mute">{o.notes ?? ""}</td>
              <td className="whitespace-nowrap">
                <button onClick={() => setOpp({ id: o.id, kind: o.kind, name: o.name, url: o.url ?? "", status: o.status, notes: o.notes ?? "" })} className="text-sm text-accent">Edit</button>
                <button onClick={() => confirm("Delete?") && call({ op: "deleteOpportunity", id: o.id })} className="ml-3 text-sm text-red-700">Delete</button>
              </td>
            </tr>
          ))}
        </Table>
      </section>
    </div>
  );
}

const MARKET_LABEL: Record<string, string> = { all: "All", global: "🌍 Global", it: "🇮🇹 Italy", fr: "🇫🇷 France", de: "🇩🇪 Germany", us: "🇺🇸 US", uk: "🇬🇧 UK" };
const PRIORITY: Record<number, [string, "red" | "amber" | "gray"]> = { 1: ["High", "red"], 2: ["Medium", "amber"], 3: ["Low", "gray"] };

/** Checklist of sites where 10BONDS should have a listing or profile, ticked as they are done. */
function ListingSites({ sites, done, market, setMarket, onToggle }: {
  sites: ListingSite[]; done: Record<string, string>; market: string; setMarket: (m: string) => void; onToggle: (id: string, done: boolean) => void;
}) {
  const shown = sites.filter((x) => market === "all" || x.market === market).sort((a, b) => a.priority - b.priority || Number(!!done[a.id]) - Number(!!done[b.id]));
  const count = sites.filter((x) => done[x.id]).length;
  return (
    <section className={card} data-testid="seo-listing-sites">
      <h2 className="text-lg font-semibold">Where to list 10BONDS</h2>
      <p className="mt-1 max-w-3xl text-xs text-mute">
        {count} of {sites.length} done. Each site gives a link back to 10bonds.com. Start with “High”. On forums and Reddit, answer questions first and link a guide only when it helps: plain self-promotion gets removed. Once a link is live, add it above (or wait for the Bing update).
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {Object.entries(MARKET_LABEL).map(([id, label]) => (
          <button key={id} onClick={() => setMarket(id)} className={`rounded-full px-3 py-1.5 text-sm ${market === id ? "bg-ink text-white" : "bg-canvas"}`}>{label}</button>
        ))}
      </div>
      <Table head={["Done", "Site", "Market", "Type", "Priority", "Tip"]} min="48rem">
        {shown.map((x) => (
          <tr key={x.id} className={`border-t border-line align-top ${done[x.id] ? "opacity-60" : ""}`}>
            <td className="py-2 pr-3"><input type="checkbox" aria-label={`${x.name} done`} checked={!!done[x.id]} onChange={(e) => onToggle(x.id, e.target.checked)} className="h-4 w-4" /></td>
            <td className="pr-3"><a href={x.url} target="_blank" rel="noopener noreferrer nofollow" className="text-accent">{x.name} ↗</a>{done[x.id] && <span className="block text-[11px] text-mute">done {day(done[x.id])}</span>}</td>
            <td className="pr-3 text-xs">{MARKET_LABEL[x.market]}</td>
            <td className="pr-3 text-xs">{x.kind}</td>
            <td className="pr-3"><Badge tone={PRIORITY[x.priority][1]}>{PRIORITY[x.priority][0]}</Badge></td>
            <td className="pr-3 text-xs text-mute">{x.tip}</td>
          </tr>
        ))}
      </Table>
    </section>
  );
}
