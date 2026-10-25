"use client";
import { useEffect, useState } from "react";
import { LINDE_PRICE_NOTE, SCENARIO_CAVEAT, SCENARIO_SOURCE } from "@/lib/provisionalScenarios";
import { reloadGptRatings } from "@/lib/gptStore";

type Stats = { total: number; withYtm: number; withRating: number; ytmLast24h: number; newestYtm: string | null; shownOnSite: number } | { error: string } | null;
type Req = { id: number; requestedAt: string; status: string; pickedUpAt: string | null; finishedAt: string | null; note: string | null };

const card = "rounded-2xl border border-line bg-white p-5";
const when = (s: string | null) => (s ? new Date(s).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—");
const STATUS: Record<string, string> = { pending: "Waiting for the main app", running: "Refreshing now", done: "Done", failed: "Failed" };

type Match = { key: string; label: string; isin: string | null; problem: "none" | "ambiguous" | null; candidates: string[] };

/** Admin only: loads the provisional IR / BR / Risk Pay values (GPT scenario, 25 Oct 2026) for the 10 bonds the owner sent. */
function ProvisionalScenarios() {
  const [res, setRes] = useState<{ saved?: number; matches: Match[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const run = async (save: boolean) => {
    setBusy(true);
    try {
      const r = await fetch("/api/admin/gpt-ratings/provisional", { method: save ? "POST" : "GET" }).then((x) => x.json());
      setRes(r.matches ? r : null);
      if (save) reloadGptRatings();
    } catch { setRes(null); } finally { setBusy(false); }
  };
  return (
    <div className="mt-5 rounded-xl bg-amber-50 p-4 text-sm" data-testid="provisional-scenarios">
      <h3 className="font-semibold text-amber-900">Provisional IR, BR and Risk Pay (10 bonds)</h3>
      <p className="mt-1 text-xs text-amber-900">{SCENARIO_SOURCE}. {SCENARIO_CAVEAT} Never used in any ranking or portfolio selection. Shown to admin only, in orange with a &quot;stored&quot; tag.</p>
      <p className="mt-1 text-xs text-amber-900">{LINDE_PRICE_NOTE}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button onClick={() => run(false)} disabled={busy} className="rounded-full border border-amber-400 px-4 py-1.5 text-xs font-medium text-amber-900 disabled:opacity-60" data-testid="scenario-check">Check matches</button>
        <button onClick={() => run(true)} disabled={busy} className="rounded-full bg-amber-500 px-4 py-1.5 text-xs font-medium text-white disabled:opacity-60" data-testid="scenario-load">Load the 10 bonds</button>
      </div>
      {res && (
        <ul className="mt-3 space-y-1 text-xs" data-testid="scenario-result">
          {res.saved !== undefined && <li className="font-medium">Saved {res.saved} of {res.matches.length}.</li>}
          {res.matches.map((m) => (
            <li key={m.key}>{m.label}: {m.isin ?? (m.problem === "ambiguous" ? `NOT SAVED, several bonds match (${m.candidates.join("; ")})` : "NOT SAVED, no bond with this issuer and maturity in the data")}</li>
          ))}
        </ul>
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
