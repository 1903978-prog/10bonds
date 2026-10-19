"use client";

import { useCallback, useEffect, useState } from "react";
import type { Backlink, Opportunity } from "@/lib/seo/store";
import { api, Badge, btn, btnLight, card, day, ErrorNote, Field, input, Table, when } from "./ui";

const LINK = { id: 0, sourceUrl: "", targetUrl: "https://10bonds.com/", linkType: "editorial", rel: "follow", status: "active", relevance: "", quality: "", verifiedAt: new Date().toISOString().slice(0, 10), notes: "" };
const OPP = { id: 0, kind: "publisher", name: "", url: "", status: "idea", notes: "" };

/** Backlinks are site-wide (one domain for all three languages); targets show which language they point to. */
export default function Backlinks() {
  const [data, setData] = useState<{ backlinks: Backlink[]; opportunities: Opportunity[]; checkedAt: string | null } | null>(null);
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
              {active.length} active links from {domains} websites. Last checked: {when(data.checkedAt)}. Until you add links, import a file or confirm you checked, the backlink score stays “Not assessed” (not a verified zero).
              Export the list from Search Console → Links → “Export external links” at https://search.google.com/search-console/links, or from Ahrefs / Semrush.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setLink({ ...LINK })} className={btn}>Add link</button>
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
