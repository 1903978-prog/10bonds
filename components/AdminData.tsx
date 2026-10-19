"use client";
import { useEffect, useState } from "react";

type Stats = { total: number; withYtm: number; withRating: number; ytmLast24h: number; newestYtm: string | null; shownOnSite: number } | { error: string } | null;
type Req = { id: number; requestedAt: string; status: string; pickedUpAt: string | null; finishedAt: string | null; note: string | null };

const card = "rounded-2xl border border-line bg-white p-5";
const when = (s: string | null) => (s ? new Date(s).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—");
const STATUS: Record<string, string> = { pending: "Waiting for the main app", running: "Refreshing now", done: "Done", failed: "Failed" };

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
