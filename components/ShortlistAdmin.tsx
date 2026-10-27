"use client";

import { useCallback, useEffect, useState } from "react";
import { RiskBadge } from "@/components/RiskBadge";
import { GptRate } from "@/components/GptRate";
import { Spread, RiskPayCell, SPREAD_HEAD, RISKPAY_HEAD } from "@/components/Spread";
import { fmtMin } from "@/lib/fmtMin";
import type { ShortlistRow, ShortlistSummary } from "@/lib/shortlist";
import type { PortfolioFigures } from "@/lib/shortlistCompare";

type Imported = { file_name: string; agency_rating: string | null; risk_grade: string | null; ir: string | null; br: string | null; risk_pay: string | null; ytm: number | null; duration: number | null; price: number | null; seniority: string | null; recommendation: string | null; verdict: string | null };
type List = { id: number; name: string; isins: string[]; bids: Record<string, number>; rows: ShortlistRow[]; summary: ShortlistSummary; imported: Record<string, Imported> };

const pct = (v: number | null | undefined, d = 2) => (v == null ? "–" : `${v.toFixed(d)}%`);
const comma = (v: number | null | undefined, d = 2) => (v == null ? "–" : v.toFixed(d).replace(".", ","));
const dash = (v: unknown) => (v == null || v === "" ? "–" : String(v));

function CopyIsin({ isin }: { isin: string }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" title="Click to copy" data-testid="copy-isin" className="w-[7.5rem] text-left font-mono text-[11px] text-amber-800 hover:text-ink" onClick={async () => { try { await navigator.clipboard.writeText(isin); setDone(true); setTimeout(() => setDone(false), 1500); } catch { setDone(false); } }}>
      {done ? "Copied ✓" : isin}
    </button>
  );
}

/** The owner's bid price of one bond: typed with a decimal comma or point, saved when the field is left. */
function BidInput({ value, onSave }: { value: number | null; onSave: (v: number | null) => void }) {
  const [txt, setTxt] = useState(value == null ? "" : comma(value));
  useEffect(() => { setTxt(value == null ? "" : comma(value)); }, [value]);
  return (
    <input value={txt} inputMode="decimal" placeholder="–" data-testid="bid-input" aria-label="My bid price" onChange={(e) => setTxt(e.target.value)}
      onBlur={() => { const n = Number(txt.replace(",", ".")); const v = txt.trim() === "" || !(n > 0) ? null : n; if (v !== value) onSave(v); else setTxt(value == null ? "" : comma(value)); }}
      onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
      className="w-16 rounded border border-amber-300 bg-yellow-50 px-1 py-0.5 text-right text-[11px] font-semibold tabular-nums text-ink" />
  );
}

/** Admin only: the shortlists, each with a table of all figures per bond and the average return, duration, risk and expected loss. */
export default function ShortlistAdmin() {
  const [lists, setLists] = useState<List[] | null>(null);
  const [sel, setSel] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [edit, setEdit] = useState<{ id: number | null; name: string; isins: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [overlap, setOverlap] = useState<string[]>([]);

  const load = useCallback(async (pick?: number) => {
    const r = await fetch("/api/admin/shortlists", { cache: "no-store" }).catch(() => null);
    const j = r?.ok ? await r.json().catch(() => null) : null;
    if (!j?.lists) { setErr("Could not load the shortlists."); return; }
    setErr(null);
    setLists(j.lists);
    setSel((cur) => pick ?? (j.lists.some((l: List) => l.id === cur) ? cur : (j.lists[0]?.id ?? null)));
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!edit) return;
    setBusy(true);
    const r = await fetch("/api/admin/shortlists", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: edit.id ?? undefined, name: edit.name, isins: edit.isins }) }).catch(() => null);
    const j = await r?.json().catch(() => null);
    setBusy(false);
    if (!r?.ok) { setErr(j?.error ?? "Could not save."); return; }
    setEdit(null);
    await load(j.list.id);
  };
  const saveBid = async (l: List, isin: string, v: number | null) => {
    const bids = { ...l.bids };
    if (v == null) delete bids[isin]; else bids[isin] = v;
    const r = await fetch("/api/admin/shortlists", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: l.id, name: l.name, isins: l.isins.join(" "), bids }) }).catch(() => null);
    if (!r?.ok) { setErr("Could not save the bid price."); return; }
    await load(l.id);
  };
  const remove = async (l: List) => {
    if (!window.confirm(`Delete ${l.name}?`)) return;
    const r = await fetch(`/api/admin/shortlists?id=${l.id}`, { method: "DELETE" }).catch(() => null);
    if (!r?.ok) { setErr("Could not delete."); return; }
    await load();
  };

  const cur = lists?.find((l) => l.id === sel) ?? null;
  const sm = cur?.summary;
  const missing = cur?.rows.filter((r) => !r.inCopy) ?? [];
  const withBids = !!cur && (Object.keys(cur.bids).length > 0 || cur.name === "Shortlist 2");
  const flagged = cur?.rows.filter((r) => r.inCopy && r.flags.length) ?? [];

  return (
    <div className="text-[13px]" data-testid="shortlist-page">
      <h1 className="text-2xl font-semibold">Shortlist</h1>
      <p className="mt-1 text-sm text-mute">Admin only. Each shortlist shows as a yellow dot on the Multi-year chart and the Heat map. Equal weight, same expected-loss method as the finder.</p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {lists?.map((l) => (
          <button key={l.id} type="button" onClick={() => setSel(l.id)} data-testid="shortlist-tab" className={`rounded-full border px-3 py-1 text-xs font-medium ${l.id === sel ? "border-amber-400 bg-yellow-200 text-ink" : "border-line bg-white text-mute"}`}>{l.name} <span className="text-[10px] opacity-70">{l.isins.length}</span></button>
        ))}
        <button type="button" onClick={() => setEdit({ id: null, name: `LM #${(lists?.length ?? 0) + 1}`, isins: "" })} className="rounded-full border border-dashed border-amber-400 px-3 py-1 text-xs font-medium text-amber-900" data-testid="shortlist-new">+ New shortlist</button>
      </div>
      {err && <p className="mt-3 text-red-600" role="alert">{err}</p>}

      {edit && (
        <div className="mt-4 max-w-2xl rounded-lg border border-amber-300 bg-amber-50 p-3" data-testid="shortlist-form">
          <label className="block text-xs text-mute">Name
            <input value={edit.name} maxLength={60} onChange={(e) => setEdit({ ...edit, name: e.target.value })} className="mt-1 block w-48 rounded-lg border border-line bg-white px-2 py-1 text-sm text-ink" />
          </label>
          <label className="mt-2 block text-xs text-mute">ISINs (one per line, or separated by spaces or commas)
            <textarea value={edit.isins} rows={8} onChange={(e) => setEdit({ ...edit, isins: e.target.value })} className="mt-1 block w-full rounded-lg border border-line bg-white px-2 py-1 font-mono text-xs text-ink" />
          </label>
          <div className="mt-2 flex gap-2">
            <button type="button" disabled={busy} onClick={save} className="rounded-full bg-yellow-300 px-4 py-1 text-xs font-semibold text-ink disabled:opacity-60">{busy ? "Saving…" : "Save"}</button>
            <button type="button" onClick={() => { setEdit(null); setErr(null); }} className="rounded-full px-3 py-1 text-xs text-mute">Cancel</button>
          </div>
        </div>
      )}

      {!lists && !err && <p className="mt-6 text-mute">Loading…</p>}
      {lists && lists.length === 0 && <p className="mt-6 text-mute">No shortlists yet.</p>}

      {cur && sm && (
        <>
          <SummaryBar name={cur.name} sm={sm} of={cur.isins.length} className="mt-5">
            <span className="ml-auto flex gap-2">
              <button type="button" onClick={() => setEdit({ id: cur.id, name: cur.name, isins: cur.isins.join("\n") })} className="rounded-full border border-amber-400 bg-white px-3 py-1 text-xs font-medium text-amber-900" data-testid="shortlist-edit">Edit</button>
              <button type="button" onClick={() => remove(cur)} className="rounded-full border border-red-300 bg-white px-3 py-1 text-xs font-medium text-red-700" data-testid="shortlist-delete">Delete</button>
            </span>
          </SummaryBar>
          <p className="mt-1 text-[11px] text-mute">Expected loss = average over the bonds of (chance of defaulting before maturity × loss given default by debt rank: 60% senior, 75% senior non-preferred, 90% subordinated). Unrated bonds count with the same worst-grade default chance the finder uses.</p>

          {(missing.length > 0 || flagged.length > 0) && (
            <div className="mt-3 rounded-xl border border-line bg-white px-3 py-2 text-xs" data-testid="shortlist-notes">
              {missing.length > 0 && <p><b>Not in the bond copy (left out of the averages):</b> {missing.map((m) => m.isin).join(", ")}</p>}
              {flagged.map((r) => (
                <p key={r.isin} className="mt-0.5"><span className="font-mono">{r.isin}</span> {r.issuer ?? r.name}: {r.flags.join("; ")}.</p>
              ))}
              <p className="mt-1 text-mute">Shown here anyway: this page is admin only. These bonds would not normally appear on the site.</p>
            </div>
          )}

          <Compare id={cur.id} onOverlap={setOverlap} />
          <Alternative id={cur.id} />

          <div className="mt-3 overflow-x-auto rounded-xl border border-line bg-white">
            <table className="w-full min-w-[1500px] text-left text-[11px] tabular-nums" data-testid="shortlist-table">
              <thead className="bg-canvas text-mute">
                <tr>
                  {["#", "Issuer", "ISIN", ...(withBids ? BID_HEAD : []), "Coupon", "Maturity", "Seniority", "Return", "Duration", "Min inv.", "Risk", "Default chance", "Exp. loss (rank · LGD)", SPREAD_HEAD, RISKPAY_HEAD, "IR", "BR", "Imported (agency · grade · IR/BR · Risk Pay · YTM · price)", "Notes"].map((h) => (
                    <th key={h} className="whitespace-nowrap px-2 py-2 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cur.rows.map((r, i) => {
                  const im = cur.imported[r.isin];
                  return (
                    <tr key={r.isin} className={`border-t border-line align-top ${r.flags.length ? "bg-amber-50/50" : ""}`} title={overlap.includes(r.isin) ? "Also in the compared portfolio" : undefined} data-testid="shortlist-row">
                      <td className="px-2 py-1.5 text-mute">{i + 1}{overlap.includes(r.isin) && <span className="ml-0.5 font-bold text-green-700" title="Also in the compared portfolio">●</span>}</td>
                      <td className="max-w-[16rem] px-2 py-1.5"><div className="font-medium text-ink">{r.issuer ?? "–"}</div><div className="truncate text-mute" title={r.name ?? undefined}>{r.name ?? "not in database"}</div></td>
                      <td className="px-2 py-1.5"><CopyIsin isin={r.isin} /></td>
                      {withBids && <BidCells r={r} onSave={(v) => saveBid(cur, r.isin, v)} />}
                      <td className="px-2 py-1.5">{pct(r.coupon, 3)}</td>
                      <td className="whitespace-nowrap px-2 py-1.5">{dash(r.maturity)}</td>
                      <td className="px-2 py-1.5">{dash(r.seniority)}</td>
                      <td className="px-2 py-1.5 font-semibold">{pct(r.ytm)}</td>
                      <td className="px-2 py-1.5">{r.duration == null ? "–" : r.duration.toFixed(2)}</td>
                      <td className="whitespace-nowrap px-2 py-1.5">{r.minInvestment == null ? "–" : fmtMin(r.minInvestment, r.currency ?? "EUR")}</td>
                      <td className="whitespace-nowrap px-2 py-1.5">{r.inCopy ? <RiskBadge risk={r.risk} sp={r.sp} /> : "–"}</td>
                      <td className="px-2 py-1.5">{r.pd == null ? "–" : `${r.pd.toFixed(2)}%`}</td>
                      <td className="whitespace-nowrap px-2 py-1.5">{r.el == null ? "–" : <><b>{r.el.toFixed(2)}%</b> <span className="text-mute">{r.rank} · {Math.round(r.lgd * 100)}%</span></>}</td>
                      <td className="px-2 py-1.5">{r.inCopy ? <Spread ytm={r.ytm} years={r.duration} /> : "–"}</td>
                      <td className="px-2 py-1.5">{r.inCopy ? <RiskPayCell isin={r.isin} ytm={r.ytm} years={r.duration} pd={r.pd} life={r.life} lgd={r.lgd} /> : "–"}</td>
                      <td className="px-2 py-1.5"><GptRate isin={r.isin} kind="ir" /></td>
                      <td className="px-2 py-1.5"><GptRate isin={r.isin} kind="br" /></td>
                      <td className="max-w-[18rem] px-2 py-1.5 text-mute">
                        {im ? <span title={[im.file_name, im.verdict, im.recommendation].filter(Boolean).join(" · ")}>{[dash(im.agency_rating), dash(im.risk_grade), `${dash(im.ir)}/${dash(im.br)}`, dash(im.risk_pay), im.ytm == null ? "–" : `${im.ytm}%`, dash(im.price)].join(" · ")}{im.recommendation ? ` · ${im.recommendation}` : ""}</span> : "–"}
                      </td>
                      <td className="max-w-[16rem] px-2 py-1.5 text-amber-800">{[r.note, ...r.flags].filter(Boolean).join("; ") || "–"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

const BID_HEAD = ["App price", "My bid price", "YTM at app price", "YTM at my bid", "App − bid"];

/** Price in the app next to the owner's bid, the return at each, and the gap (app price minus bid) with whether the app price is at or below the bid. */
function BidCells({ r, onSave }: { r: ShortlistRow; onSave: (v: number | null) => void }) {
  const diff = r.price != null && r.bid != null ? r.price - r.bid : null;
  const ok = diff != null && diff <= 0.005;
  return (
    <>
      <td className="whitespace-nowrap bg-yellow-50/60 px-2 py-1.5 text-right font-semibold">{r.inCopy ? comma(r.price) : <span className="font-normal text-mute">not in database</span>}</td>
      <td className="bg-yellow-50/60 px-2 py-1.5 text-right"><BidInput value={r.bid} onSave={onSave} /></td>
      <td className="whitespace-nowrap bg-yellow-50/60 px-2 py-1.5 text-right">{pct(r.ytm).replace(".", ",")}</td>
      <td className="whitespace-nowrap bg-yellow-50/60 px-2 py-1.5 text-right font-semibold">{r.ytmBid == null ? "–" : `${comma(r.ytmBid)}%`}</td>
      <td className={`w-28 whitespace-nowrap bg-yellow-50/60 px-2 py-1.5 text-right ${diff == null ? "text-mute" : ok ? "text-green-700" : "text-red-700"}`} data-testid="bid-diff">
        {diff == null ? "–" : <>{diff > 0 ? "+" : ""}{comma(diff)} <span className="text-[10px]">{ok ? "at/below bid" : "above bid"}</span></>}
      </td>
    </>
  );
}

/** The yellow summary bar of one portfolio: name, average return, duration, risk, expected loss on your money and bonds counted. Same bar for every list on the page. */
function SummaryBar({ name, sm, of, className = "", testId = "shortlist-kpis", children }: { name: string; sm: ShortlistSummary; of: number; className?: string; testId?: string; children?: React.ReactNode }) {
  return (
    <div className={`flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 ${className}`} data-testid={testId}>
      <span className="text-base font-semibold">{name}</span>
      <Kpi label="Avg return (YTM)" value={pct(sm.avgYtm)} />
      <Kpi label="Avg duration" value={sm.avgDuration == null ? "–" : `${sm.avgDuration.toFixed(2)} yrs`} />
      <Kpi label="Avg risk (1–10)" value={sm.avgRisk == null ? "–" : sm.avgRisk.toFixed(1)} />
      <Kpi label="Expected loss on your money" value={pct(sm.lifeLoss)} />
      <Kpi label="Bonds counted" value={`${sm.count} of ${of}`} />
      {children}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex flex-col leading-tight">
      <span className="text-[10px] uppercase tracking-wide text-mute">{label}</span>
      <span className="text-lg font-semibold tabular-nums">{value}</span>
    </span>
  );
}

type Cmp = {
  name: string; years: number; target: number; mine: PortfolioFigures; other: PortfolioFigures;
  diff: { ytm: number | null; duration: number | null; lifeLoss: number | null; risk: number | null; spreadBp: number | null; riskPay: number | null };
  verdict: string; rows: ShortlistRow[] & { overlap?: boolean }[]; bundAsOf: string | null; source: { asOf: string | null; bonds: number };
};
const sgn = (v: number | null, d: number, unit: string) => (v == null ? "–" : `${v >= 0 ? "+" : ""}${v.toFixed(d)}${unit}`);


type Diff = Cmp["diff"];
function compareRows(diff: Diff, a: PortfolioFigures, b: PortfolioFigures): [string, string, string, string][] {
  return [
    ["Average return (YTM)", pct(a.avgYtm), pct(b.avgYtm), sgn(diff.ytm, 2, " pp")],
    ["Average duration", a.avgDuration == null ? "–" : `${a.avgDuration.toFixed(2)} yrs`, b.avgDuration == null ? "–" : `${b.avgDuration.toFixed(2)} yrs`, sgn(diff.duration, 2, " yrs")],
    ["Expected loss on your money", pct(a.lifeLoss), pct(b.lifeLoss), sgn(diff.lifeLoss, 2, " pp")],
    ["Average risk (1–10)", a.avgRisk == null ? "–" : a.avgRisk.toFixed(1), b.avgRisk == null ? "–" : b.avgRisk.toFixed(1), sgn(diff.risk, 1, "")],
    ["Bonds", String(a.count), String(b.count), sgn(a.count - b.count, 0, "")],
    ["Issuers", String(a.issuers), String(b.issuers), sgn(a.issuers - b.issuers, 0, "")],
    ["Average spread vs Bund", a.avgSpreadBp == null ? "–" : `${Math.round(a.avgSpreadBp)} bp`, b.avgSpreadBp == null ? "–" : `${Math.round(b.avgSpreadBp)} bp`, sgn(diff.spreadBp, 0, " bp")],
    ["Risk Pay (spread ÷ expected loss)", a.riskPay == null ? "–" : `${a.riskPay.toFixed(1)}×`, b.riskPay == null ? "–" : `${b.riskPay.toFixed(1)}×`, sgn(diff.riskPay, 1, "×")],
    ["Net of expected loss", a.netBp == null ? "–" : `${Math.round(a.netBp)} bp`, b.netBp == null ? "–" : `${Math.round(b.netBp)} bp`, sgn(a.netBp == null || b.netBp == null ? null : a.netBp - b.netBp, 0, " bp")],
  ];
}

/** Admin only: this shortlist against the live efficient list of one horizon at a desired return (the Multi-year chart's curve), same expected-loss method and loss given default by debt rank for both. */
function Compare({ id, onOverlap }: { id: number; onOverlap: (isins: string[]) => void }) {
  const [years, setYears] = useState("4");
  const [target, setTarget] = useState("4.22");
  const [d, setD] = useState<Cmp | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    const t = setTimeout(async () => {
      const r = await fetch(`/api/admin/shortlists/compare?${new URLSearchParams({ id: String(id), years, target })}`, { cache: "no-store" }).catch(() => null);
      const j = await r?.json().catch(() => null);
      if (!r?.ok || !j?.mine) { setD(null); setErr(j?.error ?? "Could not compare."); onOverlap([]); return; }
      setErr(null); setD(j); onOverlap(j.overlap);
    }, 400);
    return () => clearTimeout(t);
  }, [id, years, target, onOverlap]);
  const a = d?.mine, b = d?.other;
  const rows = d && a && b ? compareRows(d.diff, a, b) : [];
  const inp = "mt-0.5 block w-20 rounded-lg border border-line bg-white px-2 py-1 text-sm text-ink";
  return (
    <div className="mt-4 rounded-lg border border-amber-300 bg-white p-3" data-testid="shortlist-compare">
      <div className="flex flex-wrap items-end gap-4">
        <h2 className="text-base font-semibold">Compare with the live {years}-year portfolio</h2>
        <label className="text-[11px] text-mute">Years<input value={years} onChange={(e) => setYears(e.target.value)} inputMode="numeric" className={inp} /></label>
        <label className="text-[11px] text-mute">Desired return %<input value={target} onChange={(e) => setTarget(e.target.value)} inputMode="decimal" className={inp} /></label>
      </div>
      <p className="mt-1 text-[11px] text-mute">The {years}-year list is the lowest-loss list of the Multi-year chart&apos;s live curve that reaches the desired return (the chart&apos;s legend row at that line). Both lists use the same method: equal weight, expected loss = default chance to maturity × loss given default by debt rank, same Bund curve{d?.bundAsOf ? ` (${d.bundAsOf.slice(0, 10)})` : ""}. Risk Pay of a list = its average spread ÷ its average expected loss per year.</p>
      {err && <p className="mt-2 text-xs text-red-600">{err}</p>}
      {d && a && b && (
        <>
          <SummaryBar name={`${d.years}-year portfolio`} sm={b} of={b.count} className="mt-3" testId="compare-bar" />
          <p className="mt-2 text-sm font-medium" data-testid="compare-verdict">{d.verdict}</p>
          <table className="mt-2 w-full max-w-3xl text-left text-xs tabular-nums">
            <thead className="text-mute"><tr><th className="py-1 font-medium" /><th className="py-1 font-medium">{d.name}</th><th className="py-1 font-medium">{d.years}-year portfolio</th><th className="py-1 font-medium">Difference</th></tr></thead>
            <tbody>{rows.map(([k, x, y, z]) => <tr key={k} className="border-t border-line"><td className="py-1 text-mute">{k}</td><td className="py-1 font-semibold">{x}</td><td className="py-1 font-semibold">{y}</td><td className="py-1">{z}</td></tr>)}</tbody>
          </table>
          <p className="mt-3 text-xs font-medium">The {d.years}-year portfolio&apos;s bonds <span className="font-normal text-mute">({d.rows.filter((r) => (r as unknown as { overlap: boolean }).overlap).length} also in {d.name}, marked ●)</span></p>
          <table className="mt-1 w-full min-w-[640px] text-left text-[11px] tabular-nums">
            <thead className="text-mute"><tr>{["", "Issuer", "ISIN", "Maturity", "Return", "Duration", "Risk", "Exp. loss (rank · LGD)"].map((h) => <th key={h} className="px-2 py-1 font-medium">{h}</th>)}</tr></thead>
            <tbody>
              {(d.rows as unknown as (ShortlistRow & { overlap: boolean })[]).map((r) => (
                <tr key={r.isin} className={`border-t border-line ${r.overlap ? "bg-green-50" : ""}`} data-testid="compare-row">
                  <td className="px-2 py-1 font-bold text-green-700">{r.overlap ? "●" : ""}</td>
                  <td className="px-2 py-1">{r.issuer ?? r.name}</td>
                  <td className="px-2 py-1"><CopyIsin isin={r.isin} /></td>
                  <td className="whitespace-nowrap px-2 py-1">{dash(r.maturity)}</td>
                  <td className="px-2 py-1 font-semibold">{pct(r.ytm)}</td>
                  <td className="px-2 py-1">{r.duration == null ? "–" : r.duration.toFixed(2)}</td>
                  <td className="px-2 py-1"><RiskBadge risk={r.risk} sp={r.sp} /></td>
                  <td className="whitespace-nowrap px-2 py-1">{r.el == null ? "–" : <><b>{r.el.toFixed(2)}%</b> <span className="text-mute">{r.rank} · {Math.round(r.lgd * 100)}%</span></>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

type Alt = {
  name: string; horizon: number; mine: PortfolioFigures; other: PortfolioFigures; diff: Diff; verdict: string | null;
  rows: ShortlistRow[]; mix: Record<string, number>; overlapIsins: string[]; overlapIssuers: string[];
  core: { shortlistEl: number; eligible: number; dropped: { structure: number; risk: number; rank: number }; best: { status: string }; seconds: number;
    targets: { target: number; status: string; ytm: number | null; el: number | null; withinLoss: boolean }[]; blockers: { label: string; ytm: number | null }[] };
};

/** Admin only: a model-selected alternative set (exact solver, real bonds of the live copy) with at least the shortlist's return targets at no more expected loss than the shortlist; built in the background, so it runs on click with a spinner. */
function Alternative({ id }: { id: number }) {
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [d, setD] = useState<Alt | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { setState("idle"); setD(null); setErr(null); }, [id]);
  useEffect(() => {
    if (state !== "busy") return;
    let stop = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const ask = async () => {
      const r = await fetch(`/api/admin/shortlists/alternative?id=${id}`, { cache: "no-store" }).catch(() => null);
      const j = await r?.json().catch(() => null);
      if (stop) return;
      if (j?.pending) { timer = setTimeout(ask, 3000); return; }
      if (!r?.ok || !j?.core) { setErr(j?.error ?? "Could not run the search."); setState("idle"); return; }
      setD(j); setState("done");
    };
    ask();
    return () => { stop = true; clearTimeout(timer); };
  }, [state, id]);
  const a = d?.mine, b = d?.other;
  const rows = d && a && b ? compareRows(d.diff, a, b) : [];
  const c = d?.core;
  return (
    <div className="mt-4 rounded-lg border border-amber-300 bg-white p-3" data-testid="shortlist-alt">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-base font-semibold">Alternative set at the same expected loss (model-selected)</h2>
        <button type="button" disabled={state === "busy"} onClick={() => { setErr(null); setState("busy"); }} className="rounded-full bg-yellow-300 px-4 py-1 text-xs font-semibold text-ink disabled:opacity-60" data-testid="alt-run">
          {state === "busy" ? <><span className="mr-1 inline-block h-3 w-3 animate-spin rounded-full border-2 border-ink border-t-transparent align-[-2px]" />Searching…</> : state === "done" ? "Run again" : "Find alternative set"}
        </button>
      </div>
      <p className="mt-1 text-[11px] text-mute">Exact solver over the live EUR bonds: 10 bonds of 10 different issuers, average duration 3.8–4.2 years (4-year horizon), every bond rated AAA to BBB+ (risk 1–4), at most 2 bonds per sector, no subordinated, AT1, Tier 2, credit-linked, equity or index-linked, structured or conditional-coupon notes, bonds with price flags already left out. Expected loss is the shortlist&apos;s own method (default chance × loss given default by debt rank). A model result for comparison, not advice or a recommendation.</p>
      {err && <p className="mt-2 text-xs text-red-600" role="alert">{err}</p>}
      {state === "busy" && <p className="mt-2 text-xs text-mute">Running the solver in the background; this takes up to a couple of minutes the first time.</p>}
      {d && a && b && c && state === "done" && (
        <>
          {d.rows.length > 0 && <SummaryBar name="Alternative set" sm={b} of={d.rows.length} className="mt-3" testId="alt-bar" />}
          <p className="mt-2 text-sm font-medium" data-testid="alt-verdict">{c.best.status === "infeasible" ? `No set of 10 reaches any return at ${d.name}'s expected loss (${c.shortlistEl.toFixed(2)}%) under these rules.` : d.verdict}</p>
          <p className="mt-1 text-xs text-mute">{c.eligible} eligible bonds (left out: {c.dropped.structure} structured or linked, {c.dropped.rank} subordinated, {c.dropped.risk} rated below BBB+ or unrated). {c.best.status === "uncertified" ? "The solver hit its time limit: this set is not proven the best. " : "Proven best under the rules. "}Took {c.seconds}s.</p>
          <table className="mt-2 w-full max-w-xl text-left text-xs tabular-nums" data-testid="alt-targets">
            <thead className="text-mute"><tr><th className="py-1 font-medium">Target return</th><th className="py-1 font-medium">Lowest expected loss that reaches it</th><th className="py-1 font-medium">At or below {d.name}&apos;s {c.shortlistEl.toFixed(2)}%?</th></tr></thead>
            <tbody>{c.targets.map((t) => (
              <tr key={t.target} className="border-t border-line"><td className="py-1 font-semibold">{t.target.toFixed(2)}%</td><td className="py-1">{t.el == null ? "not reachable under these rules" : `${t.el.toFixed(2)}% (set returns ${t.ytm!.toFixed(2)}%)`}</td><td className="py-1">{t.el == null ? "–" : t.withinLoss ? "yes" : "no"}</td></tr>
            ))}</tbody>
          </table>
          {c.blockers.length > 0 && (
            <div className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs" data-testid="alt-blockers">
              <p className="font-medium">The best return at {d.name}&apos;s expected loss is {c.best.status === "infeasible" ? "not reachable" : `${b.avgYtm?.toFixed(2)}%`}, under {c.targets[0].target.toFixed(2)}%. With one rule relaxed:</p>
              {c.blockers.map((x) => <p key={x.label} className="mt-0.5">{x.label}: {x.ytm == null ? "still not reachable" : `${x.ytm.toFixed(2)}%`}</p>)}
            </div>
          )}
          {rows.length > 0 && (
            <table className="mt-3 w-full max-w-3xl text-left text-xs tabular-nums">
              <thead className="text-mute"><tr><th className="py-1 font-medium" /><th className="py-1 font-medium">{d.name}</th><th className="py-1 font-medium">Alternative set</th><th className="py-1 font-medium">Difference</th></tr></thead>
              <tbody>{rows.map(([k, x, y, z]) => <tr key={k} className="border-t border-line"><td className="py-1 text-mute">{k}</td><td className="py-1 font-semibold">{x}</td><td className="py-1 font-semibold">{y}</td><td className="py-1">{z}</td></tr>)}</tbody>
            </table>
          )}
          {d.rows.length > 0 && (
            <>
              <p className="mt-3 text-xs">Rating mix: {Object.entries(d.mix).map(([k, n]) => `${k} ${n}`).join(" · ")}. Same bonds as {d.name}: {d.overlapIsins.length ? d.overlapIsins.join(", ") : "none"}. Same issuers: {d.overlapIssuers.length ? d.overlapIssuers.join(", ") : "none"}.</p>
              <div className="mt-1 overflow-x-auto">
                <table className="w-full min-w-[900px] text-left text-[11px] tabular-nums" data-testid="alt-table">
                  <thead className="text-mute"><tr>{["#", "Issuer", "ISIN", "Maturity", "Return", "Duration", "Risk", "Exp. loss (rank · LGD)", SPREAD_HEAD, RISKPAY_HEAD].map((h) => <th key={h} className="px-2 py-1 font-medium">{h}</th>)}</tr></thead>
                  <tbody>
                    {d.rows.map((r, i) => (
                      <tr key={r.isin} className="border-t border-line">
                        <td className="px-2 py-1 text-mute">{i + 1}</td>
                        <td className="px-2 py-1">{r.issuer ?? r.name}</td>
                        <td className="px-2 py-1"><CopyIsin isin={r.isin} /></td>
                        <td className="whitespace-nowrap px-2 py-1">{dash(r.maturity)}</td>
                        <td className="px-2 py-1 font-semibold">{pct(r.ytm)}</td>
                        <td className="px-2 py-1">{r.duration == null ? "–" : r.duration.toFixed(2)}</td>
                        <td className="px-2 py-1"><RiskBadge risk={r.risk} sp={r.sp} /></td>
                        <td className="whitespace-nowrap px-2 py-1">{r.el == null ? "–" : <><b>{r.el.toFixed(2)}%</b> <span className="text-mute">{r.rank} · {Math.round(r.lgd * 100)}%</span></>}</td>
                        <td className="px-2 py-1"><Spread ytm={r.ytm} years={r.duration} /></td>
                        <td className="px-2 py-1"><RiskPayCell isin={r.isin} ytm={r.ytm} years={r.duration} pd={r.pd} life={r.life} lgd={r.lgd} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
