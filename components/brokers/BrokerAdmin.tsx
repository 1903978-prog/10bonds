"use client";
import Link from "next/link";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { BrokerProfile, Country, Methodology, TariffData } from "@/lib/brokers/types";

// Knowledge Management -> Broker Management. Every tariff change is saved as a draft and only goes live
// after "Approve". Older versions stay as history with their effective dates.

type Version = { brokerId: string; country: Country; data: TariffData; effectiveFrom: string; verifiedAt: string; status: "draft" | "published" | "archived"; note: string | null; version: number; createdAt: string; createdBy: string | null; approvedAt: string | null; approvedBy: string | null };
type Settings = { published: boolean; excluded: { id: string; reason: string }[]; intro: string[] | null };
type Payload = {
  profiles: BrokerProfile[];
  tariffs: Version[];
  methodology: Methodology;
  countries: Record<Country, { settings: Settings; scores: { brokerId: string; overall: number; criteria: Record<string, number> }[]; overdue: string[] }>;
  traffic: { pages: { path: string; n: number }[]; clicks: { label: string; n: number }[] } | null;
  today: string;
};

const COUNTRY_NAMES: Record<Country, string> = { it: "Italy", fr: "France", de: "Germany" };
const PATHS: Record<Country, string> = { it: "/it/broker-obbligazioni", fr: "/fr/courtiers-obligations", de: "/de/anleihen-broker" };
const card = "rounded-lg border border-line bg-white p-6";
const btn = "rounded-full border border-line px-3 py-1.5 text-xs font-medium hover:bg-canvas disabled:opacity-50";
const btnMain = "rounded-full bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50";

export default function BrokerAdmin() {
  const [data, setData] = useState<Payload | null>(null);
  const [country, setCountry] = useState<Country>("it");
  const [msg, setMsg] = useState<string | null>(null);
  const [problems, setProblems] = useState<string[]>([]);
  const [editing, setEditing] = useState<{ brokerId: string; json: string; effectiveFrom: string; verifiedAt: string; note: string } | null>(null);
  const [profileEdit, setProfileEdit] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/brokers", { cache: "no-store" });
    if (r.ok) setData(await r.json());
    else setMsg("Could not load the broker data. Is the accounts database connected?");
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function post(body: unknown, ok: string) {
    setBusy(true);
    setMsg(null);
    setProblems([]);
    const r = await fetch("/api/admin/brokers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const b = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) {
      setMsg(b.error ?? "Something went wrong.");
      setProblems(b.problems ?? []);
      return false;
    }
    setMsg(ok);
    await load();
    return true;
  }

  const c = data?.countries[country];
  const versions = useMemo(() => (data ? data.tariffs.filter((t) => t.country === country) : []), [data, country]);
  const brokerIds = useMemo(() => Array.from(new Set(versions.map((v) => v.brokerId))).sort(), [versions]);
  const name = (id: string) => data?.profiles.find((p) => p.id === id)?.name ?? id;

  if (!data || !c) return <p className="text-mute">{msg ?? "Loading…"}</p>;

  const settings = c.settings;
  const setCountrySettings = (v: Settings, ok: string) => post({ action: "country", country, value: v }, ok);
  const drafts = versions.filter((v) => v.status === "draft");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[32px] font-semibold tracking-tight">Broker management</h1>
        <p className="text-sm text-mute">
          Knowledge Management · <Link href="/admin" className="text-accent">Admin</Link> · Changes are drafts until you approve them.
        </p>
      </div>

      <div className="inline-flex rounded-full bg-white p-1 text-sm shadow-sm">
        {(["it", "fr", "de"] as Country[]).map((k) => (
          <button key={k} onClick={() => { setCountry(k); setEditing(null); }} className={`rounded-full px-4 py-1.5 ${k === country ? "bg-ink text-white" : "text-mute"}`}>
            {COUNTRY_NAMES[k]}
            {data.countries[k].overdue.length > 0 && <span className="ml-1 text-amber-500">●</span>}
          </button>
        ))}
      </div>

      {msg && (
        <div className="rounded-lg border border-line bg-white px-4 py-3 text-sm shadow-sm">
          {msg}
          {problems.length > 0 && <ul className="mt-2 list-disc pl-5 text-red-700">{problems.map((p) => <li key={p}>{p}</li>)}</ul>}
        </div>
      )}

      <section className={card}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{COUNTRY_NAMES[country]} page</h2>
            <p className="text-sm text-mute">
              <a href={PATHS[country]} target="_blank" className="text-accent">{PATHS[country]}</a> · {settings.published ? "Published: visible to everyone and to Google" : "Not published: only you can see it (preview)"}
            </p>
          </div>
          <button disabled={busy} className={btnMain} onClick={() => setCountrySettings({ ...settings, published: !settings.published }, settings.published ? "Page hidden." : "Page published.")} data-testid="publish-toggle">
            {settings.published ? "Unpublish" : "Publish this page"}
          </button>
        </div>
      </section>

      {drafts.length > 0 && (
        <section className={card}>
          <h2 className="text-lg font-semibold">Waiting for your approval</h2>
          <ul className="mt-3 space-y-4">
            {drafts.map((d) => {
              const cur = versions.find((v) => v.brokerId === d.brokerId && v.status === "published");
              return (
                <li key={d.version} className="rounded-lg border border-line p-4 text-sm">
                  <p className="font-semibold">{name(d.brokerId)} · in force from {d.effectiveFrom} · checked {d.verifiedAt}</p>
                  {d.note && <p className="text-mute">{d.note}</p>}
                  <Diff before={cur?.data ?? null} after={d.data} />
                  <div className="mt-3 flex gap-2">
                    <button disabled={busy} className={btnMain} onClick={() => post({ action: "approve", id: d.version }, "Approved and published.")}>Approve</button>
                    <button disabled={busy} className={btn} onClick={() => post({ action: "reject", id: d.version }, "Draft rejected.")}>Reject</button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className={card}>
        <h2 className="text-lg font-semibold">Brokers in {COUNTRY_NAMES[country]}</h2>
        <p className="text-sm text-mute">Order = published methodology. Commercial deals never change it. Tariffs older than {data.methodology.verifyEveryDays} days are flagged.</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-mute">
              <tr className="border-b border-line">
                <th className="py-2 pr-2">Broker</th>
                <th className="py-2 pr-2">Score</th>
                <th className="py-2 pr-2">Checked</th>
                <th className="py-2 pr-2">Unverified</th>
                <th className="py-2 pr-2">In list</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {brokerIds.map((id) => {
                const cur = versions.filter((v) => v.brokerId === id && v.status === "published" && v.effectiveFrom <= data.today).sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom) || b.version - a.version)[0];
                const score = c.scores.find((s) => s.brokerId === id);
                const excluded = settings.excluded.find((e) => e.id === id);
                const overdue = c.overdue.includes(id);
                return (
                  <tr key={id} className="border-b border-line/60 align-top">
                    <td className="py-2 pr-2">
                      <a href={`${PATHS[country]}/${id}`} target="_blank" className="font-medium hover:text-accent">{name(id)}</a>
                      <span className="block text-xs text-mute">{versions.filter((v) => v.brokerId === id).length} version(s){cur && !cur.data.eligible ? " · not eligible" : ""}</span>
                    </td>
                    <td className="py-2 pr-2">{score ? score.overall.toFixed(1) : "—"}</td>
                    <td className={`py-2 pr-2 ${overdue ? "font-semibold text-amber-700" : ""}`}>{cur?.verifiedAt ?? "—"}{overdue && " · re-check"}</td>
                    <td className="py-2 pr-2 text-xs">{cur?.data.unverified.join(", ") || "—"}</td>
                    <td className="py-2 pr-2">
                      <input
                        type="checkbox"
                        checked={!excluded}
                        onChange={() => {
                          if (excluded) return setCountrySettings({ ...settings, excluded: settings.excluded.filter((e) => e.id !== id) }, "Back in the list.");
                          const reason = window.prompt("Why remove this broker from the list? (shown only here)");
                          if (reason) setCountrySettings({ ...settings, excluded: [...settings.excluded, { id, reason }] }, "Removed from the list.");
                        }}
                      />
                      {excluded && <span className="block text-xs text-mute">{excluded.reason}</span>}
                    </td>
                    <td className="space-x-1 space-y-1 py-2">
                      {cur && <button disabled={busy} className={btn} onClick={() => post({ action: "verify", id: cur.version }, "Marked as re-checked today.")}>Re-checked today</button>}
                      <button
                        className={btn}
                        onClick={() => setEditing({ brokerId: id, json: JSON.stringify(cur?.data ?? versions.find((v) => v.brokerId === id)?.data, null, 2), effectiveFrom: data.today, verifiedAt: data.today, note: "" })}
                      >
                        Edit fees
                      </button>
                      <button className={btn} onClick={() => setProfileEdit(JSON.stringify(data.profiles.find((p) => p.id === id), null, 2))}>Profile & affiliate</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <button className={`${btn} mt-4`} onClick={() => setEditing({ brokerId: "", json: JSON.stringify(emptyTariff(), null, 2), effectiveFrom: data.today, verifiedAt: data.today, note: "" })}>
          Add a broker to {COUNTRY_NAMES[country]}
        </button>
      </section>

      {editing && (
        <section className={card}>
          <h2 className="text-lg font-semibold">{editing.brokerId ? `Edit ${name(editing.brokerId)} (${COUNTRY_NAMES[country]})` : `New broker in ${COUNTRY_NAMES[country]}`}</h2>
          <p className="text-sm text-mute">Saved as a draft. Every commission needs the official source link. Percentages in percent (0.19 = 0.19%).</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-4">
            <label className="text-sm">
              Broker id
              <input value={editing.brokerId} onChange={(e) => setEditing({ ...editing, brokerId: e.target.value.trim().toLowerCase() })} className="mt-1 w-full rounded-xl border border-line px-3 py-2" list="broker-ids" />
              <datalist id="broker-ids">{data.profiles.map((p) => <option key={p.id} value={p.id} />)}</datalist>
            </label>
            <label className="text-sm">
              In force from
              <input type="date" value={editing.effectiveFrom} onChange={(e) => setEditing({ ...editing, effectiveFrom: e.target.value })} className="mt-1 w-full rounded-xl border border-line px-3 py-2" />
            </label>
            <label className="text-sm">
              Checked on official source
              <input type="date" value={editing.verifiedAt} onChange={(e) => setEditing({ ...editing, verifiedAt: e.target.value })} className="mt-1 w-full rounded-xl border border-line px-3 py-2" />
            </label>
            <label className="text-sm">
              Note
              <input value={editing.note} onChange={(e) => setEditing({ ...editing, note: e.target.value })} className="mt-1 w-full rounded-xl border border-line px-3 py-2" placeholder="What changed" />
            </label>
          </div>
          <Evidence json={editing.json} />
          <textarea value={editing.json} onChange={(e) => setEditing({ ...editing, json: e.target.value })} rows={22} className="mt-3 w-full rounded-xl border border-line p-3 font-mono text-xs" spellCheck={false} />
          <div className="mt-3 flex gap-2">
            <button
              disabled={busy}
              className={btnMain}
              onClick={async () => {
                let parsed: unknown;
                try {
                  parsed = JSON.parse(editing.json);
                } catch {
                  return setMsg("The fee data is not valid JSON.");
                }
                if (!data.profiles.some((p) => p.id === editing.brokerId)) return setMsg("Create the broker profile first (Profile & affiliate, or ask Claude).");
                if (await post({ action: "draft", brokerId: editing.brokerId, country, data: parsed, effectiveFrom: editing.effectiveFrom, verifiedAt: editing.verifiedAt, note: editing.note }, "Draft saved. Approve it above to publish.")) setEditing(null);
              }}
            >
              Save draft
            </button>
            <button className={btn} onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </section>
      )}

      {profileEdit !== null && (
        <section className={card}>
          <h2 className="text-lg font-semibold">Broker profile & commercial terms</h2>
          <p className="text-sm text-mute">
            affiliate.status &quot;active&quot; switches the broker&apos;s links to the tracking url and labels them as advertising. Use it only once an agreement is signed.
            &quot;sponsored&quot; lists the countries where a separate Sponsored box is shown. Neither changes scores or order.
          </p>
          <textarea value={profileEdit} onChange={(e) => setProfileEdit(e.target.value)} rows={18} className="mt-3 w-full rounded-xl border border-line p-3 font-mono text-xs" spellCheck={false} />
          <div className="mt-3 flex gap-2">
            <button
              disabled={busy}
              className={btnMain}
              onClick={async () => {
                let parsed: unknown;
                try {
                  parsed = JSON.parse(profileEdit);
                } catch {
                  return setMsg("The profile is not valid JSON.");
                }
                if (await post({ action: "profile", profile: parsed }, "Profile saved.")) setProfileEdit(null);
              }}
            >
              Save profile
            </button>
            <button className={btn} onClick={() => setProfileEdit(null)}>Cancel</button>
          </div>
        </section>
      )}

      <section className={card}>
        <h2 className="text-lg font-semibold">Page text ({COUNTRY_NAMES[country]})</h2>
        <p className="text-sm text-mute">Optional: replace the intro paragraphs. One paragraph per line. Leave empty to use the standard text.</p>
        <IntroEditor key={country} value={settings.intro} onSave={(intro) => setCountrySettings({ ...settings, intro }, "Intro saved.")} />
      </section>

      <MethodologyEditor value={data.methodology} busy={busy} onSave={(m) => post({ action: "methodology", value: m }, "Methodology saved.")} />

      <section className={card}>
        <h2 className="text-lg font-semibold">Traffic, last 30 days</h2>
        <p className="text-sm text-mute">Only visitors who accepted usage statistics are counted.</p>
        {data.traffic ? (
          <div className="mt-3 grid gap-6 sm:grid-cols-2">
            <ul className="space-y-1 text-sm">
              <li className="text-xs text-mute">Page views</li>
              {data.traffic.pages.map((p) => <li key={p.path} className="flex justify-between gap-2"><span className="truncate">{p.path}</span><b>{p.n}</b></li>)}
              {data.traffic.pages.length === 0 && <li className="text-mute">None yet</li>}
            </ul>
            <ul className="space-y-1 text-sm">
              <li className="text-xs text-mute">Clicks to brokers (broker:id:country:link type)</li>
              {data.traffic.clicks.map((p) => <li key={p.label} className="flex justify-between gap-2"><span className="truncate">{p.label}</span><b>{p.n}</b></li>)}
              {data.traffic.clicks.length === 0 && <li className="text-mute">None yet</li>}
            </ul>
          </div>
        ) : (
          <p className="mt-2 text-sm text-mute">Not available.</p>
        )}
      </section>
    </div>
  );
}

function emptyTariff(): TariffData {
  const src = { evidence: null, sourceUrl: null };
  return {
    eligible: true,
    accountType: "",
    govBonds: { available: null, markets: null, ...src },
    corpBonds: { available: null, markets: null, ...src },
    foreignCurrencyBonds: { available: null, markets: null, ...src },
    commissions: [],
    thirdPartyFees: [],
    custodyFee: { text: null, annualEur: null, ...src },
    accountFee: { text: null, annualEur: null, ...src },
    fxFee: { text: null, pct: null, ...src },
    otherFees: null,
    minInvestment: null,
    taxAgent: { value: null, ...src },
    venues: [],
    tariffDocUrl: null,
    unverified: [],
    notes: null,
  };
}

/** The quotes and links behind each fee, to check against the official documents. */
function Evidence({ json }: { json: string }) {
  let d: TariffData | null = null;
  try {
    d = JSON.parse(json);
  } catch {
    return null;
  }
  if (!d) return null;
  const items: [string, { evidence: string | null; sourceUrl: string | null }][] = [
    ...(d.commissions ?? []).map((c, i) => [`Commission ${i + 1} (${c.venue})`, c] as [string, typeof c]),
    ...(d.thirdPartyFees ?? []).map((c) => [c.description, c] as [string, typeof c]),
    ["Custody", d.custodyFee],
    ["Account", d.accountFee],
    ["FX", d.fxFee],
    ["Tax agent", d.taxAgent],
  ];
  return (
    <details className="mt-3 rounded-xl bg-canvas p-3 text-xs">
      <summary className="cursor-pointer font-medium">Evidence ({items.length})</summary>
      <ul className="mt-2 space-y-2">
        {items.map(([k, s], i) => (
          <li key={i}>
            <b>{k}:</b> {s?.evidence ? `“${s.evidence}”` : <span className="text-amber-700">no quote</span>}{" "}
            {s?.sourceUrl && <a href={s.sourceUrl} target="_blank" rel="noopener" className="break-all text-accent">{s.sourceUrl}</a>}
          </li>
        ))}
      </ul>
    </details>
  );
}

/** Before/after cost of a €10,000 order, so a material change is visible before approving. */
function Diff({ before, after }: { before: TariffData | null; after: TariffData }) {
  const lines = useMemo(() => {
    const out: string[] = [];
    const a = JSON.stringify(after.commissions.map((c) => c.rule));
    const b = before ? JSON.stringify(before.commissions.map((c) => c.rule)) : null;
    if (a !== b) out.push(`Commission rules: ${b ?? "none"} → ${a}`);
    for (const k of ["custodyFee", "accountFee", "fxFee"] as const) {
      const x = JSON.stringify(after[k].text);
      const y = before ? JSON.stringify(before[k].text) : null;
      if (x !== y) out.push(`${k}: ${y ?? "none"} → ${x}`);
    }
    if (before && before.eligible !== after.eligible) out.push(`eligible: ${before.eligible} → ${after.eligible}`);
    return out;
  }, [before, after]);
  return <ul className="mt-2 list-disc pl-5 font-mono text-xs">{lines.length ? lines.map((l) => <li key={l}>{l}</li>) : <li>No fee change (text or sources only).</li>}</ul>;
}

function IntroEditor({ value, onSave }: { value: string[] | null; onSave: (v: string[] | null) => void }) {
  const [text, setText] = useState((value ?? []).join("\n"));
  return (
    <div>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} className="mt-3 w-full rounded-xl border border-line p-3 text-sm" />
      <button className={`${btnMain} mt-2`} onClick={() => onSave(text.trim() ? text.split("\n").map((s) => s.trim()).filter(Boolean) : null)}>Save text</button>
    </div>
  );
}

function MethodologyEditor({ value, busy, onSave }: { value: Methodology; busy: boolean; onSave: (m: Methodology) => void }) {
  const [m, setM] = useState(value);
  const total = Object.values(m.weights).reduce((a, b) => a + b, 0);
  return (
    <section className={card}>
      <h2 className="text-lg font-semibold">Methodology (all countries)</h2>
      <p className="text-sm text-mute">Weights in percent; they should add up to 100 (now {total}). Shown publicly on the methodology pages.</p>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-6">
        {(Object.keys(m.weights) as (keyof Methodology["weights"])[]).map((k) => (
          <label key={k} className="text-sm capitalize">
            {k}
            <input type="number" min={0} max={100} value={m.weights[k]} onChange={(e) => setM({ ...m, weights: { ...m.weights, [k]: Number(e.target.value) } })} className="mt-1 w-full rounded-xl border border-line px-3 py-2" />
          </label>
        ))}
        <label className="text-sm">
          Re-check every (days)
          <input type="number" min={1} max={365} value={m.verifyEveryDays} onChange={(e) => setM({ ...m, verifyEveryDays: Number(e.target.value) })} className="mt-1 w-full rounded-xl border border-line px-3 py-2" />
        </label>
      </div>
      <button disabled={busy || total !== 100} className={`${btnMain} mt-3`} onClick={() => onSave(m)}>Save methodology</button>
    </section>
  );
}
