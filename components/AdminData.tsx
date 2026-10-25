"use client";
import { useEffect, useState } from "react";
import { LINDE_PRICE_NOTE, SCENARIO_CAVEAT, SCENARIO_SOURCE } from "@/lib/scenarioText";
import { reloadGptRatings } from "@/lib/gptStore";

type Stats = { total: number; withYtm: number; withRating: number; ytmLast24h: number; newestYtm: string | null; shownOnSite: number } | { error: string } | null;
type Req = { id: number; requestedAt: string; status: string; pickedUpAt: string | null; finishedAt: string | null; note: string | null };

const card = "rounded-2xl border border-line bg-white p-5";
const when = (s: string | null) => (s ? new Date(s).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—");
const STATUS: Record<string, string> = { pending: "Waiting for the main app", running: "Refreshing now", done: "Done", failed: "Failed" };

type Row = { key: string; label: string; isin: string | null; ir: string; br: string; riskPay: string; detail: { coupon: string; maturity: string; agency: string; ytm: string; dur: string; spread: string; el: string; net: string; at1: string; t2: string; snp: string; cln: string; reco: string } | null };
type Match = { key: string; label: string; isin: string | null; problem: "none" | "ambiguous" | null; candidates: string[] };

/** Admin only: loads the provisional IR / BR / Risk Pay values (GPT scenario, 25 Oct 2026) for the 10 bonds the owner sent. */
function ProvisionalScenarios() {
  const [res, setRes] = useState<{ saved?: number; matches: Match[] } | null>(null);
  const [table, setTable] = useState<Row[]>([]);
  useEffect(() => { fetch("/api/admin/gpt-ratings/provisional").then((x) => x.json()).then((r) => { if (r.table) setTable(r.table); if (r.matches) setRes((cur) => cur ?? { matches: r.matches }); }).catch(() => {}); }, []);
  const [busy, setBusy] = useState(false);
  const run = async (save: boolean) => {
    setBusy(true);
    try {
      const r = await fetch("/api/admin/gpt-ratings/provisional", { method: save ? "POST" : "GET" }).then((x) => x.json());
      setRes(r.matches ? r : null);
      if (r.table) setTable(r.table);
      if (save) reloadGptRatings();
    } catch { setRes(null); } finally { setBusy(false); }
  };
  return (
    <div className="mt-5 rounded-xl bg-amber-50 p-4 text-sm" data-testid="provisional-scenarios">
      <h3 className="font-semibold text-amber-900">Provisional IR, BR and Risk Pay (20 bonds)</h3>
      <p className="mt-1 text-xs text-amber-900">{SCENARIO_SOURCE}. {SCENARIO_CAVEAT} Never used in any ranking or portfolio selection. Shown to admin only, in orange with a &quot;stored&quot; tag.</p>
      <p className="mt-1 text-xs text-amber-900">{LINDE_PRICE_NOTE}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button onClick={() => run(false)} disabled={busy} className="rounded-full border border-amber-400 px-4 py-1.5 text-xs font-medium text-amber-900 disabled:opacity-60" data-testid="scenario-check">Check matches</button>
        <button onClick={() => run(true)} disabled={busy} className="rounded-full bg-amber-500 px-4 py-1.5 text-xs font-medium text-white disabled:opacity-60" data-testid="scenario-load">Load the 20 bonds</button>
      </div>
      {res && res.saved !== undefined && (
        <ul className="mt-3 space-y-1 text-xs" data-testid="scenario-result">
          <li className="font-medium">Saved {res.saved} of {res.matches.length}.</li>
          {res.matches.filter((m) => !m.isin).map((m) => (
            <li key={m.key}>{m.label}: {m.problem === "ambiguous" ? `NOT SAVED, several bonds match (${m.candidates.join("; ")})` : "NOT SAVED, no bond with this ISIN or issuer and maturity in the data"}</li>
          ))}
        </ul>
      )}
      {res && res.saved === undefined && res.matches.some((m) => !m.isin) && (
        <p className="mt-3 text-xs" data-testid="scenario-unmatched">Not found in the data: {res.matches.filter((m) => !m.isin).map((m) => m.label).join("; ")}.</p>
      )}
      {table.length > 0 && (
        <div className="mt-4 overflow-x-auto" data-testid="consolidated-comparison">
          <h4 className="mb-1 text-xs font-semibold text-amber-900">Consolidated comparison, all 20 bonds (admin only; ~ approximate, * † ‡ footnote marks as given)</h4>
          <table className="w-full min-w-[1100px] text-[11px] tabular-nums">
            <thead><tr className="text-left text-amber-900">{["#", "Issuer / ISIN", "Coupon", "Maturity", "Agency", "IR", "BR", "YTM", "Dur.", "Spread bp", "EL bp/yr", "Net bp", "Risk Pay", "AT1", "Tier 2", "SNP", "CLN", "Reco"].map((h) => <th key={h} className="pr-2 font-medium">{h}</th>)}</tr></thead>
            <tbody>
              {table.map((r, i) => {
                const d = r.detail;
                const isin = r.isin ?? res?.matches.find((m) => m.key === r.key)?.isin ?? null;
                return (
                  <tr key={r.key} className="border-t border-amber-200">
                    <td className="pr-2">{i + 1}</td>
                    <td className="pr-2">{r.label.replace(/ [A-Z]{2}[A-Z0-9]{9}[0-9]$/, "")}<br /><span className="text-mute">{isin ?? "–"}</span></td>
                    {[d?.coupon, d?.maturity, d?.agency, r.ir, r.br, d?.ytm, d?.dur, d?.spread, d?.el, d?.net, r.riskPay, d?.at1, d?.t2, d?.snp, d?.cln, d?.reco].map((v, j) => <td key={j} className="pr-2">{v ?? "–"}</td>)}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function AdminData() {
  const [data, setData] = useState<{ bonds: Stats; requests: Req[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = () => fetch("/api/admin/data").then((r) => r.json()).then(setData).catch(() => {});
  useEffect(() => { load(); }, []);

  const ask = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch("/api/admin/data", { method: "POST" }).then((x) => x.json());
      setMsg(r.created ? "Request sent. The main app picks it up on its next check." : "A request is already waiting; no new one was made.");
      load();
    } catch {
      setMsg("Could not send the request.");
    } finally {
      setBusy(false);
    }
  };

  const b = data?.bonds;
  const ok = b && !("error" in b) ? b : null;
  return (
    <section className={card} data-testid="admin-data">
      <h2 className="text-lg font-semibold">Bond data</h2>
      {b && "error" in b && <p className="mt-2 text-sm text-red-700">Could not read the bond copy: {b.error}</p>}
      {data && b === null && <p className="mt-2 text-sm text-mute">The bond copy is not connected here.</p>}
      {ok && (
        <>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[["Bonds in the copy", ok.total], ["With a yield (YTM)", ok.withYtm], ["With a risk score", ok.withRating], ["YTM updated in last 24h", ok.ytmLast24h]].map(([k, v]) => (
              <div key={k as string} className="rounded-xl bg-canvas p-3">
                <p className="text-xs text-mute">{k}</p>
                <p className="mt-1 text-2xl font-semibold" data-testid={`stat-${String(k).split(" ")[0].toLowerCase()}`}>{v}</p>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-mute">
            Shown on the site: {ok.shownOnSite} (EUR and USD, rated, fresh, modelled). Newest yield: {when(ok.newestYtm)}. The copy holds yields, not prices, so a price refresh shows here as an updated yield.
          </p>
        </>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button onClick={ask} disabled={busy} className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-[#0077ed] disabled:opacity-60" data-testid="refresh-prices">
          {busy ? "Sending…" : "Refresh prices"}
        </button>
        <span className="text-xs text-mute">Asks the LM op model app to refresh prices and send a new copy.</span>
      </div>
      {msg && <p className="mt-2 text-sm">{msg}</p>}
      <ProvisionalScenarios />
      {data && data.requests.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm" data-testid="refresh-requests">
          {data.requests.map((r) => (
            <li key={r.id} className="flex flex-wrap justify-between gap-2 border-t border-line pt-1">
              <span>{when(r.requestedAt)}</span>
              <span className={r.status === "failed" ? "text-red-700" : r.status === "done" ? "text-green-700" : "text-mute"}>
                {STATUS[r.status] ?? r.status}{r.finishedAt ? ` · ${when(r.finishedAt)}` : ""}{r.note ? ` · ${r.note}` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
