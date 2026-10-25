import Link from "next/link";
import Logo from "@/components/Logo";
import { RiskBadge } from "@/components/RiskBadge";
import type { Fig, Report, Row } from "@/lib/bondReport";
import ReportActions from "./ReportActions";
import ReportTabs from "./ReportTabs";
import FinancialChart from "./FinancialChart";

const card = "report-card rounded-2xl border border-line bg-white p-4 sm:p-5";
const h3 = "text-[11px] font-semibold uppercase tracking-wide text-mute";
const STATUS: Record<Fig["status"], string> = { verified: "Verified", provisional: "Provisional", not_verified: "Not verified" };

/** A figure with its date, source and status in small print underneath. */
export function FigText({ f, big }: { f: Fig; big?: boolean }) {
  const none = f.status === "not_verified";
  return (
    <span className="block min-w-0">
      <span className={none ? "text-mute" : big ? "text-[28px] font-semibold leading-tight tracking-tight tabular-nums sm:text-[32px]" : ""}>{f.text}</span>
      <span className="block text-[11px] leading-snug text-mute">
        {[STATUS[f.status], f.kind, f.asOf, f.source].filter(Boolean).join(" · ")}
      </span>
    </span>
  );
}

function Kpi({ label, f, extra }: { label: string; f: Fig; extra?: string }) {
  return (
    <div className={`${card} min-w-0`} data-testid={`kpi-${label.toLowerCase().replace(/\W+/g, "-")}`}>
      <p className={h3}>{label}</p>
      <div className="mt-1.5 min-h-[76px]"><FigText f={f} big />{extra && <span className="mt-0.5 block text-[12px] text-mute">{extra}</span>}</div>
    </div>
  );
}

function Rows({ rows }: { rows: Row[] }) {
  return (
    <dl className="divide-y divide-line/70 text-[13px]">
      {rows.map((r) => (
        <div key={r.label} className="grid grid-cols-1 gap-0.5 py-2 sm:grid-cols-[38%_62%]">
          <dt className="text-mute">{r.label}</dt>
          <dd><FigText f={r.fig} /></dd>
        </div>
      ))}
    </dl>
  );
}

function Bars({ items }: { items: Report["scorecard"] }) {
  if (!items.length) return <p className="text-[13px] text-mute">Not verified</p>;
  return (
    <ul className="space-y-3">
      {items.map((s) => (
        <li key={s.label}>
          <div className="flex items-baseline justify-between gap-3 text-[13px]"><span>{s.label}</span><span className="font-semibold tabular-nums">{s.score}</span></div>
          <div className="mt-1 h-1.5 rounded-full bg-canvas" role="img" aria-label={`${s.label} ${s.score} out of 100`}>
            <div className="h-1.5 rounded-full bg-[#4a5a78]" style={{ width: `${s.score}%` }} />
          </div>
          <p className="mt-0.5 text-[12px] text-mute">{s.note}</p>
        </li>
      ))}
    </ul>
  );
}

function Table({ header, rows }: { header?: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        {header && <thead><tr className="text-left text-[11px] uppercase tracking-wide text-mute">{header.map((h, i) => <th key={i} scope="col" className={`py-1.5 pr-3 font-medium ${i ? "text-right" : ""}`}>{h}</th>)}</tr></thead>}
        <tbody className="divide-y divide-line/70">
          {rows.map((r, i) => <tr key={i}>{r.map((v, j) => <td key={j} className={`py-2 pr-3 ${j ? "whitespace-nowrap text-right tabular-nums" : "text-mute"}`}>{v}</td>)}</tr>)}
        </tbody>
      </table>
    </div>
  );
}

const viewTone = (t: string) => (/avoid|cautious|sell/i.test(t) ? "text-[#b42318]" : /buy|positive/i.test(t) && !/watch/i.test(t) ? "text-[#067647]" : "text-[#b54708]");

/** The full report page body. `open` = this reader may see the research (paid plan, or the free example). */
export default function ReportView({ r, open }: { r: Report; open: boolean }) {
  const title = `${r.issuer}${r.maturityYear ? ` ${r.maturityYear}` : ""}`;
  const identity = [r.isin, r.currency, r.seniority, r.couponType].filter(Boolean).join(" · ");
  return (
    <article className="report mx-auto max-w-6xl" data-testid="bond-report">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="hidden print:block"><Logo className="mb-2 h-6 w-auto" /></div>
          <nav aria-label="Breadcrumb" className="text-[12px] text-mute print:hidden"><Link href="/risk-assessment" className="hover:text-ink">Companies in focus</Link> › Report</nav>
          <h1 className="mt-0.5 break-words text-[26px] font-semibold leading-tight tracking-tight sm:text-[32px]">{title}</h1>
          <p className="mt-0.5 break-all text-[13px] text-mute" data-testid="report-identity">{identity}</p>
          <p className={`mt-1 text-[12px] ${r.freshness.stale ? "text-[#b54708]" : "text-mute"}`} data-testid="freshness">{r.freshness.label}</p>
        </div>
        <ReportActions isin={r.isin} />
      </header>

      <section aria-label="Key figures" className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Investment score" f={open ? r.kpis.score : { text: "Plans", status: "not_verified" }} />
        <Kpi label="Return (gross)" f={open ? r.kpis.ret : { text: "Plans", status: "not_verified" }} />
        <Kpi label="Withholding tax" f={open ? r.kpis.wht : { text: "Plans", status: "not_verified" }} />
        <Kpi label="Maturity" f={r.kpis.maturity} extra={r.kpis.maturityNote} />
      </section>

      {!open ? (
        <section className={`${card} mt-3 py-8 text-center`} data-testid="report-locked">
          <p className="text-[15px] font-medium">The full report is on paid plans</p>
          <p className="mx-auto mt-1 max-w-md text-[12px] text-mute">Credit scorecard, financials, bond terms, tax and sources for every bond we cover.</p>
          <Link href="/pricing" className="mt-3 inline-block rounded-full bg-accent px-5 py-2 text-[13px] font-medium text-white">See plans</Link>
        </section>
      ) : (
        <>
          <Conclusion r={r} />
          <ReportTabs
            tabs={[
              { id: "overview", label: "Overview", panel: <Overview r={r} /> },
              { id: "credit", label: "Credit & Risks", panel: <Credit r={r} /> },
              { id: "financials", label: "Financials", panel: <Financials r={r} /> },
              { id: "terms", label: "Bond Terms", panel: <Terms r={r} /> },
              { id: "tax", label: "Tax & Sources", panel: <Tax r={r} /> },
            ]}
          />
        </>
      )}
    </article>
  );
}

function Conclusion({ r }: { r: Report }) {
  const c = r.conclusion;
  const o = c.outlook;
  return (
    <section className={`${card} mt-3`} aria-labelledby="concl" data-testid="conclusion">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p id="concl" className={h3}>Our view</p>
          <p className={`mt-1 text-[22px] font-semibold leading-tight ${c.view.status === "not_verified" ? "text-mute" : viewTone(c.view.text)}`}>{c.view.text}</p>
          <p className="mt-0.5 text-[11px] text-mute">{[STATUS[c.view.status], c.view.kind, c.view.asOf].filter(Boolean).join(" · ")}</p>
        </div>
        <div className="min-w-[200px]">
          <p className={h3}>Outlook, −10 to +10</p>
          {o === null ? <p className="mt-1 text-mute">Not verified</p> : (
            <>
              <p className="mt-1 text-[22px] font-semibold tabular-nums">{o > 0 ? "+" : o < 0 ? "−" : ""}{Math.abs(o)}</p>
              <div className="relative mt-1 h-1.5 rounded-full bg-canvas" aria-hidden="true">
                <div className="absolute left-1/2 top-0 h-1.5 w-px bg-mute" />
                <div className="absolute top-[-3px] h-3 w-3 -translate-x-1/2 rounded-full bg-[#4a5a78]" style={{ left: `${(o + 10) * 5}%` }} />
              </div>
              <p className="mt-1 text-[12px] text-mute">{c.outlookNote}</p>
            </>
          )}
        </div>
        <div>
          <p className={h3}>Return after tax</p>
          <div className="mt-1 text-[13px]"><FigText f={r.netReturn} /></div>
        </div>
      </div>
      {c.summary ? <p className="mt-3 max-w-3xl text-[14px] leading-relaxed">{c.summary}</p> : <p className="mt-3 text-[13px] text-mute">Executive summary: Not verified</p>}
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <h2 className={h3}>Strengths</h2>
          {c.strengths.length ? <ul className="mt-1.5 list-disc space-y-1 pl-4 text-[13px]">{c.strengths.map((s) => <li key={s}>{s}</li>)}</ul> : <p className="mt-1.5 text-[13px] text-mute">Not verified</p>}
        </div>
        <div>
          <h2 className={h3}>Main risks</h2>
          {c.risks.length ? <ul className="mt-1.5 list-disc space-y-1 pl-4 text-[13px]">{c.risks.map(([k, v]) => <li key={k}><span className="font-medium">{k}.</span> <span className="text-mute">{v}</span></li>)}</ul> : <p className="mt-1.5 text-[13px] text-mute">Not verified</p>}
        </div>
      </div>
      <h2 className={`${h3} mt-4`}>Analyst conclusion</h2>
      <p className="mt-1 max-w-3xl text-[13px] leading-relaxed">{c.analyst ?? <span className="text-mute">Not verified</span>}</p>
      <p className="mt-3 text-[12px] text-mute" data-testid="research-status">{c.status}</p>
    </section>
  );
}

function Overview({ r }: { r: Report }) {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <section className={card}><h3 className={`${h3} mb-3`}>Credit scorecard</h3><Bars items={r.scorecard} /><p className="mt-3 text-[12px] text-mute">{r.scorecardNote}</p></section>
      <div className="space-y-3">
        <section className={card}>
          <h3 className={h3}>Risk and ranking</h3>
          <div className="mt-2 flex items-center gap-3 text-[13px]"><RiskBadge risk={r.risk} size="lg" /><span className="text-mute">10bonds risk score, 1 (lowest) to 10</span></div>
          {r.capital.length > 0 ? <div className="mt-3"><Table rows={r.capital} /></div> : <p className="mt-3 text-[13px] text-mute">Seniority classification: {r.seniority ?? "Not verified"}</p>}
        </section>
        <section className={card}>
          <h3 className={h3}>Yield, maturity and repayment</h3>
          <Rows rows={[
            { label: "Return (gross)", fig: r.kpis.ret },
            { label: "Maturity", fig: r.kpis.maturity },
            { label: "Redemption", fig: r.terms.find((t) => t.label === "Redemption")?.fig ?? { text: "Not verified", status: "not_verified" } },
          ]} />
        </section>
      </div>
    </div>
  );
}

const RISK_AREAS = [
  "Liquidity and refinancing", "Debt-service capacity", "Balance-sheet solvency", "Earnings resilience", "Legal / regulatory", "Geopolitical / external",
];

function Credit({ r }: { r: Report }) {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <section className={card}>
        <h3 className={`${h3} mb-3`}>Six-factor scorecard</h3>
        <Bars items={r.scorecard} />
        <p className="mt-3 text-[12px] text-mute">Internal scores, not default probabilities. {r.scorecardNote}</p>
        {!r.scorecard.length && <p className="mt-2 text-[12px] text-mute">Areas covered once researched: {RISK_AREAS.join(", ")}.</p>}
      </section>
      <div className="space-y-3">
        <section className={card}>
          <h3 className={`${h3} mb-1`}>Risk explanations</h3>
          {r.conclusion.risks.length ? (
            <div className="divide-y divide-line/70">
              {r.conclusion.risks.map(([k, v]) => (
                <details key={k} className="group py-2" open={false}>
                  <summary className="flex min-h-[36px] cursor-pointer list-none items-center justify-between gap-3 text-[13px] font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent">
                    {k}<span aria-hidden="true" className="text-mute group-open:rotate-45">+</span>
                  </summary>
                  <p className="pb-1 text-[13px] leading-relaxed text-mute">{v}</p>
                </details>
              ))}
            </div>
          ) : <p className="text-[13px] text-mute">Not verified</p>}
        </section>
        <section className={card}>
          <h3 className={`${h3} mb-2`}>Stress scenarios</h3>
          <p className="text-[13px] text-mute">Not verified</p>
          <h3 className={`${h3} mb-2 mt-4`}>Share-price early-warning indicators</h3>
          <p className="text-[13px] text-mute">Not verified</p>
        </section>
      </div>
    </div>
  );
}

function Financials({ r }: { r: Report }) {
  const f = r.financials;
  if (!f) return <section className={card}><h3 className={h3}>Financials</h3><p className="mt-2 text-[13px] text-mute">Not verified. No company results are on file for this bond.</p></section>;
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <section className={card}>
        <h3 className={`${h3} mb-1`}>Latest results</h3>
        <Table header={f.header} rows={f.rows} />
        <p className="mt-2 text-[12px] leading-relaxed text-mute">{f.note}</p>
      </section>
      <section className={card}>
        <h3 className={`${h3} mb-2`}>Chart</h3>
        <FinancialChart header={f.header} rows={f.rows} />
        <p className="mt-3 text-[12px] text-mute">Only the latest two half-year periods are on file; three-year annual history: Not verified. Sources: company half-year reports, dated above.</p>
      </section>
    </div>
  );
}

function Terms({ r }: { r: Report }) {
  return <section className={card}><h3 className={`${h3} mb-1`}>Bond terms</h3><Rows rows={r.terms} /></section>;
}

function Tax({ r }: { r: Report }) {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <section className={card}>
        <h3 className={`${h3} mb-1`}>Return and tax</h3>
        <Rows rows={[
          { label: "Return (gross)", fig: r.kpis.ret },
          { label: "Source-country withholding tax, no treaty relief", fig: r.kpis.wht },
          { label: "Return after withholding tax", fig: r.netReturn },
          { label: "Custodian-specific assumptions", fig: { text: "Not verified", status: "not_verified" } },
          { label: "Broker fees and bid-ask spread", fig: { text: "Not verified", status: "not_verified" } },
        ]} />
        <p className="mt-2 text-[12px] leading-relaxed text-mute">{r.tax.text ?? "No withholding-tax review on file."}</p>
        <p className="mt-2 text-[12px] text-mute">Tax in your own country of residence is not included.</p>
      </section>
      <section className={card}>
        <h3 className={`${h3} mb-1`}>Source register</h3>
        {r.sources.length ? <Table header={["Source", "Date", "Price", "Return"]} rows={r.sources.map((s) => [s.source, s.date, s.price, s.ret])} /> : <p className="text-[13px] text-mute">Not verified</p>}
        <p className="mt-2 text-[12px] leading-relaxed text-mute">{r.sourcesNote}</p>
        <h3 className={`${h3} mb-1 mt-4`}>Verification warnings</h3>
        <ul className="list-disc space-y-0.5 pl-4 text-[12px] text-mute">
          {r.unavailable.map((u) => <li key={u}>{u}: Not verified</li>)}
        </ul>
      </section>
    </div>
  );
}
