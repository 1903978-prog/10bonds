"use client";

import { useState } from "react";
import { DEFAULT_SETTINGS, type EngineResult, type EngineSettings, type Line, type PortfolioStats } from "@/lib/replacement";
import { downloadXlsx } from "@/lib/xlsx";
import { browserInflate, readXlsxRows } from "@/lib/xlsxRead";
import type { PortfolioAnalysis } from "@/lib/portfolioAnalysis";
import PortfolioCheck from "./PortfolioCheck";
import { SpSlot } from "./RiskBadge";

type Response = EngineResult & { analysis?: PortfolioAnalysis; skipped: { line: number; text: string; why: string }[]; source: "live" | "sample"; asOf: string | null };

const card = "rounded-lg border border-line bg-white p-6 sm:p-8";
const pct = (n: number | null | undefined) => (n === null || n === undefined ? "—" : `${n.toFixed(2)}%`);
const yrs = (n: number | null | undefined) => (n === null || n === undefined ? "—" : `${n.toFixed(1)} yrs`);
const eur = (n: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
const TEMPLATE = "ISIN;Bond name;Quantity\nXS0000000000;Example issuer 3% 2030;250000\nDE0000000000;Example issuer 2.5% 2033;100000\n";
const XLSX_TEMPLATE = [
  ["ISIN", "Bond name", "Quantity (nominal)"],
  ["XS0000000000", "Example issuer 3% 2030", 250000],
  ["DE0000000000", "Example issuer 2.5% 2033", 100000],
];

export default function ReplacementEngine() {
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [settings, setSettings] = useState<EngineSettings>(DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Response | null>(null);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/pro/replace", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ portfolio: text, settings }) });
      const b = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(b.error ?? "Something went wrong.");
      setData(b);
      setTimeout(() => document.getElementById("results")?.scrollIntoView({ behavior: "smooth" }), 50);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function readFile(f: File | undefined) {
    if (!f) return;
    if (/\.xlsx$/i.test(f.name)) {
      f.arrayBuffer()
        .then((buf) => readXlsxRows(new Uint8Array(buf), browserInflate))
        .then((rows) => {
          setText(rows.map((r) => r.join("\t")).join("\n"));
          setFileName(f.name);
          setError(null);
        })
        .catch(() => setError("We could not read this Excel file. Please use our template, or save it as CSV."));
      return;
    }
    if (/\.xls$/i.test(f.name)) {
      setError("This is an old Excel format. Please save it as .xlsx (or CSV) and upload it again.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setText(String(reader.result ?? ""));
      setFileName(f.name);
      setError(null);
    };
    reader.readAsText(f);
  }

  const set = <K extends keyof EngineSettings>(k: K, v: EngineSettings[K]) => setSettings((s) => ({ ...s, [k]: v }));

  return (
    <div className="space-y-6">
      <section className={card}>
        <p className="text-sm font-medium text-accent">For professional wealth managers</p>
        <h1 className="mt-1 text-[32px] font-semibold leading-[1.1] tracking-tight sm:text-[40px]">Bond Replacement Engine</h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-mute sm:text-base">
          Upload a client portfolio. We compare every bond with similar bonds in our data and show, one by one, any alternative with a higher yield or lower risk and how it differs. The decision stays with you.
          A swap is only shown when the gain is clear after trading costs. Otherwise we show <strong className="text-ink">no alternative</strong>.
        </p>

        <form onSubmit={run} className="mt-6 space-y-4">
          <label
            className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-line px-4 py-8 text-center hover:border-accent"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              readFile(e.dataTransfer.files[0]);
            }}
          >
            <span className="text-[15px] font-medium">{fileName ? `Loaded: ${fileName}` : "Drop an Excel or CSV file here, or tap to choose one"}</span>
            <span className="mt-1 text-xs text-mute">One line per bond: ISIN, bond name and quantity (nominal). Any column order.</span>
            <input type="file" accept=".xlsx,.csv,.txt,text/csv,text/plain,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="hidden" onChange={(e) => readFile(e.target.files?.[0])} data-testid="pro-file" />
          </label>

          <details className="group">
            <summary className="cursor-pointer text-sm text-accent">Or paste the positions</summary>
            <textarea
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setFileName(null);
              }}
              rows={6}
              placeholder={"XS1234567890; 250000\nIT0005123456; 100000"}
              className="mt-2 w-full rounded-xl border border-line px-4 py-3 font-mono text-sm outline-none focus:border-accent"
              data-testid="pro-paste"
            />
          </details>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <button type="button" onClick={() => downloadXlsx(XLSX_TEMPLATE, "10bonds-portfolio-template.xlsx", "Portfolio")} className="text-accent" data-testid="pro-template-xlsx">
              Excel template
            </button>
            <a href={`data:text/csv;charset=utf-8,${encodeURIComponent(TEMPLATE)}`} download="10bonds-portfolio-template.csv" className="text-accent">
              CSV template
            </a>
            <button type="button" onClick={() => setShowSettings((v) => !v)} className="text-accent">
              {showSettings ? "Hide settings" : "Settings"}
            </button>
          </div>

          {showSettings && (
            <div className="grid gap-4 rounded-lg bg-canvas p-4 sm:grid-cols-2">
              <label className="text-sm sm:col-span-2">
                <span className="text-mute">Goal</span>
                <select value={settings.mode} onChange={(e) => set("mode", e.target.value as EngineSettings["mode"])} className="mt-1 block w-full rounded-xl border border-line bg-white px-3 py-2">
                  <option value="both">Higher yield or lower risk (best of both)</option>
                  <option value="yield">Higher yield, same or lower risk</option>
                  <option value="risk">Lower risk, similar yield</option>
                </select>
              </label>
              <Num label="Round-trip trading cost (%)" value={settings.costPct} step={0.05} onChange={(v) => set("costPct", v)} />
              <Num label="Max share of one issuer (%)" value={settings.maxIssuerPct} step={1} onChange={(v) => set("maxIssuerPct", v)} />
              <Num label="Similar duration: within (years)" value={settings.durationTolerance} step={0.1} onChange={(v) => set("durationTolerance", v)} />
              <Num label="Min. extra yield after costs (% a year)" value={settings.minPickupPct} step={0.05} onChange={(v) => set("minPickupPct", v)} />
              <Num label="Lower-risk swap: max yield given up (% a year)" value={settings.maxGiveUpPct} step={0.05} onChange={(v) => set("maxGiveUpPct", v)} />
            </div>
          )}

          <button disabled={busy || !text.trim()} className="w-full rounded-full bg-accent px-5 py-3 text-[15px] font-medium text-white hover:bg-[#0077ed] disabled:opacity-50 sm:w-auto sm:px-8" data-testid="pro-run">
            {busy ? "Checking every bond…" : "Find better bonds"}
          </button>
          {/* An error takes this line's place, so the button and the text below it never move. */}
          {error ? (
            <p className="text-xs text-red-700" role="alert" data-testid="pro-error">{error}</p>
          ) : (
            <p className="text-xs text-mute">The portfolio is used for this answer only. We do not store it.</p>
          )}
        </form>
      </section>

      {data && <Results data={data} />}
      <ProNotice />
    </div>
  );
}

function Num({ label, value, step, onChange }: { label: string; value: number; step: number; onChange: (v: number) => void }) {
  return (
    <label className="text-sm">
      <span className="text-mute">{label}</span>
      <input type="number" inputMode="decimal" step={step} min={0} value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-1 block w-full rounded-xl border border-line bg-white px-3 py-2" />
    </label>
  );
}

function Results({ data }: { data: Response }) {
  const keeps = data.lines.filter((l) => l.action === "keep").length;
  const unknown = data.lines.filter((l) => l.action === "unknown").length;
  return (
    <section id="results" className="space-y-4" data-testid="pro-results">
      {data.source === "sample" && <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">Sample data: these bonds are invented, for testing only.</p>}
      {data.analysis && <PortfolioCheck a={data.analysis} />}

      <div className={card}>
        <h2 className="text-xl font-semibold tracking-tight">
          {data.swaps === 0 ? "No alternative meets the rules" : `${data.swaps} ${data.swaps === 1 ? "alternative" : "alternatives"} found`}
        </h2>
        <p className="mt-1 text-sm text-mute">
          {data.lines.length} bonds checked · {data.swaps} with an alternative · {keeps} without{unknown ? ` · ${unknown} not in our data` : ""}
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Compare label="Yield (YTM)" before={pct(data.before.ytm)} after={pct(data.after.ytm)} />
          <Compare label="Duration" before={yrs(data.before.duration)} after={yrs(data.after.duration)} />
          <Compare label="Average risk (1 lowest, 10 highest)" before={data.before.risk === null ? "—" : String(data.before.risk)} after={data.after.risk === null ? "—" : String(data.after.risk)} />
          <Compare label="Largest issuer" before={issuer(data.before)} after={issuer(data.after)} />
        </div>
        {data.swaps > 0 && (
          <p className="mt-4 text-[15px]">
            About <strong>{eur(data.extraIncomePerYear)}</strong> more yield a year, for a one-off trading cost of about <strong>{eur(data.tradingCost)}</strong>.
          </p>
        )}
        <div className="mt-4 flex gap-4"><button onClick={() => downloadExcel(data)} className="text-sm text-accent" data-testid="pro-excel">Download Excel</button><button onClick={() => downloadCsv(data)} className="text-sm text-accent">Download as CSV</button></div>
      </div>

      {data.lines.map((l, i) => <LineCard key={i} line={l} />)}

      {data.skipped.length > 0 && (
        <div className="rounded-lg border border-line bg-white p-5 text-sm text-mute">
          <p className="font-medium text-ink">Lines we could not read</p>
          <ul className="mt-2 space-y-1">
            {data.skipped.slice(0, 20).map((s, i) => <li key={i}>{s.line ? `Line ${s.line}: ` : ""}{s.text} ({s.why})</li>)}
          </ul>
        </div>
      )}
    </section>
  );
}

const issuer = (s: PortfolioStats) => (s.largestIssuer ? `${s.largestIssuer.pct.toFixed(0)}%` : "—");

function Compare({ label, before, after }: { label: string; before: string; after: string }) {
  return (
    <div className="rounded-lg bg-canvas p-4">
      <p className="text-xs text-mute">{label}</p>
      <p className="mt-1 text-[15px]">
        <span className="text-mute">{before}</span> <span className="text-mute">→</span> <strong>{after}</strong>
      </p>
    </div>
  );
}

function LineCard({ line }: { line: Line }) {
  if (line.action === "unknown")
    return (
      <div className="rounded-lg border border-line bg-white p-5">
        <Badge tone="gray">Not covered</Badge>
        <p className="mt-2 font-mono text-sm">{line.isin} · {eur(line.amount)}</p>
        <p className="mt-1 text-sm text-mute">{line.reason}</p>
      </div>
    );
  if (line.action === "keep")
    return (
      <div className="rounded-lg border border-line bg-white p-5" data-testid="pro-keep">
        <Badge tone="gray">No alternative</Badge>
        <BondRow b={line.sell} amount={line.amount} />
        <p className="mt-2 text-sm text-mute">{line.reason}</p>
      </div>
    );
  return (
    <div className="rounded-lg border border-line bg-white p-5 sm:p-6" data-testid="pro-swap">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={line.kind === "yield" ? "green" : "blue"}>{line.kind === "yield" ? "Higher yield" : "Lower risk"}</Badge>
        <span className="text-sm text-mute">
          {line.netYtmChange >= 0 ? "+" : "−"}{Math.abs(line.netYtmChange).toFixed(2)}% a year after costs
          {line.riskBetter > 0 ? ` · risk ${line.riskBetter} ${line.riskBetter === 1 ? "step" : "steps"} lower` : ""}
        </span>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg bg-red-50/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-red-700">Held</p>
          <BondRow b={line.sell} amount={line.amount} />
        </div>
        <div className="rounded-lg bg-green-50/70 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-green-700">Alternative</p>
          <BondRow b={line.buy} />
        </div>
      </div>
      <p className="mt-4 text-sm font-medium">Why</p>
      <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-mute">
        {line.rationale.map((r, i) => <li key={i}>{r}</li>)}
      </ul>
    </div>
  );
}

function BondRow({ b, amount }: { b: { name: string; issuer: string; isin: string; risk: number | null; sp?: string | null; ytm: number; duration: number; maturity: string | null }; amount?: number }) {
  return (
    <div className="mt-1">
      <p className="text-[15px] font-medium">{b.issuer}</p>
      <p className="text-xs text-mute">{b.name} · <span className="font-mono">{b.isin}</span></p>
      <p className="mt-1 text-sm">
        {pct(b.ytm)} YTM · {yrs(b.duration)} · risk {b.risk ?? "—"}{b.sp !== undefined && <> <SpSlot sp={b.sp} /></>}{b.maturity ? ` · ${b.maturity.slice(0, 4)}` : ""}{amount !== undefined ? ` · ${eur(amount)}` : ""}
      </p>
    </div>
  );
}

function Badge({ tone, children }: { tone: "green" | "blue" | "gray"; children: React.ReactNode }) {
  const c = tone === "green" ? "bg-green-100 text-green-800" : tone === "blue" ? "bg-accent/10 text-accent" : "bg-canvas text-mute";
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${c}`}>{children}</span>;
}

export function ProNotice() {
  return (
    <p className="rounded-lg border border-line bg-white px-5 py-4 text-xs leading-relaxed text-mute">
      For professional clients and eligible counterparties only (MiFID II). Results are produced by fixed screening rules from indicative,
      end-of-day data. They are not a personal recommendation and do not take a client&apos;s objectives, tax position or restrictions into account.
      Prices, liquidity (bid/ask, issue size) and trading costs are not in our data: check them with your broker before any trade. You remain
      responsible for the suitability of every transaction.
    </p>
  );
}

function swapRows(data: Response): string[][] {
  const rows = [["Result", "Type", "Amount EUR", "Held ISIN", "Held bond", "Held YTM", "Held duration", "Held risk", "Alternative ISIN", "Alternative bond", "Alternative YTM", "Alternative duration", "Alternative risk", "Net yield change % a year", "Reason"]];
  for (const l of data.lines) {
    if (l.action === "swap")
      rows.push(["Alternative", l.kind === "yield" ? "Higher yield" : "Lower risk", String(l.amount), l.sell.isin, l.sell.name, l.sell.ytm.toFixed(2), l.sell.duration.toFixed(2), l.sell.risk === null ? "" : String(l.sell.risk), l.buy.isin, l.buy.name, l.buy.ytm.toFixed(2), l.buy.duration.toFixed(2), l.buy.risk === null ? "" : String(l.buy.risk), l.netYtmChange.toFixed(2), l.rationale.join(" ")]);
    else if (l.action === "keep") rows.push(["No alternative", "", String(l.amount), l.sell.isin, l.sell.name, l.sell.ytm.toFixed(2), l.sell.duration.toFixed(2), l.sell.risk === null ? "" : String(l.sell.risk), "", "", "", "", "", "", l.reason]);
    else rows.push(["Not covered", "", String(l.amount), l.isin, "", "", "", "", "", "", "", "", "", "", l.reason]);
  }
  return rows;
}

function downloadExcel(data: Response) {
  const [head, ...body] = swapRows(data);
  const num = (c: string) => (c !== "" && /^-?\d+(\.\d+)?$/.test(c) ? Number(c) : c);
  downloadXlsx([head, ...body.map((r) => r.map(num))], "10bonds-replacement.xlsx", "Swaps");
}

function downloadCsv(data: Response) {
  const rows = swapRows(data);
  const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(";")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
  a.download = "10bonds-replacement.csv";
  a.click();
  URL.revokeObjectURL(a.href);
}
