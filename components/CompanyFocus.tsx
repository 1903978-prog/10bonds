import Link from "next/link";
import { RiskBadge } from "@/components/RiskBadge";
import { COMPANIES_IN_FOCUS, type FocusCompany } from "@/lib/companiesInFocus";

const card = "overflow-hidden rounded-2xl bg-white shadow-[0_2px_20px_rgba(0,0,0,0.04)]";
const head = "px-3 pb-1 pt-2.5 text-[11px] font-semibold uppercase tracking-wide text-mute";
const td = "px-3 py-[3px] align-top";

/** Risk assessment page body: the company tabs, the headline facts and the full scoring (paid plans, or the free example). */
export default function CompanyFocus({ c, paid }: { c: FocusCompany; paid: boolean }) {
  const open = paid || c.free === true;
  const stats: [string, React.ReactNode][] = [
    ["Credit score", <span key="s" className="text-xl font-semibold tabular-nums">{c.score}<span className="text-[12px] font-normal text-mute">/100</span></span>],
    ["Risk", <RiskBadge key="r" risk={c.risk} size="lg" />],
    ["Our view", c.view],
    ["Return (per year), gross", c.ytm],
    ["Outlook", c.outlook],
    ["Seniority", c.seniority],
    ["Maturity", c.maturity],
  ];
  return (
    <article className="mx-auto max-w-6xl" data-testid="company-focus">
      <div className="mt-1 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Companies in focus</h1>
        <p className="text-[12px] text-mute">Free plan: one full example. <Link href="/pricing" className="text-accent hover:underline">Paid plans</Link> have access to all scorings.</p>
      </div>
      <nav className="mt-2 flex flex-wrap gap-1.5 text-[12px]" aria-label="Companies">
        {COMPANIES_IN_FOCUS.map((x) => (
          <Link key={x.isin} href={`/risk-assessment/${x.isin}`} data-testid="focus-tab"
            className={`rounded-full px-3 py-1 ${x.isin === c.isin ? "bg-ink text-white" : "bg-white text-ink shadow-[0_1px_6px_rgba(0,0,0,0.06)] hover:bg-line/40"}`}>
            {x.name}{!paid && !x.free ? " 🔒" : x.free && !paid ? " · free" : ""}
          </Link>
        ))}
      </nav>

      <section className={`${card} mt-2 px-4 py-2`}>
        <p className="text-[15px] font-semibold leading-tight">{c.name} <span className="font-normal text-mute">· {c.isin} · {c.issuer} · updated {c.updated}</span></p>
        <dl className="mt-1.5 grid grid-cols-2 gap-x-5 gap-y-1.5 sm:grid-cols-4 lg:grid-cols-7">
          {stats.map(([k, v]) => (
            <div key={k} className="min-w-0">
              <dt className="text-[10px] uppercase tracking-wide text-mute">{k}</dt>
              <dd className="flex h-7 items-center text-[13px] font-medium leading-tight">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-1 text-[12px] leading-snug text-mute">{open ? c.summary : `Main risks: ${c.risksShort}.`}</p>
      </section>

      {open ? <Body c={c} /> : (
        <section className={`${card} mt-3 px-4 py-6 text-center`} data-testid="focus-locked">
          <p className="text-[15px] font-medium">The full {c.name} scoring is on paid plans</p>
          <p className="mt-1 text-[12px] text-mute">Terms, prices, financials, credit scorecard, tax and our view for every company in focus.</p>
          <Link href="/pricing" className="mt-3 inline-block rounded-full bg-accent px-5 py-2 text-[13px] font-medium text-white">See plans</Link>
        </section>
      )}
    </article>
  );
}

function Table({ rows, cols }: { rows: (string | number)[][]; cols?: string[] }) {
  return (
    <table className="w-full text-[11.5px] leading-snug">
      {cols && <thead><tr className="text-left text-[10px] uppercase tracking-wide text-mute">{cols.map((h, i) => <th key={i} className={`${td} font-medium ${i ? "text-right" : ""}`}>{h}</th>)}</tr></thead>}
      <tbody className="divide-y divide-line/60">
        {rows.map((r, i) => (
          <tr key={i}>{r.map((v, j) => <td key={j} className={`${td} ${j ? "whitespace-nowrap text-right tabular-nums" : "text-mute"}`}>{v}</td>)}</tr>
        ))}
      </tbody>
    </table>
  );
}

function Body({ c }: { c: FocusCompany }) {
  const [fh, ...fin] = c.financials;
  return (
    <div className="mt-2 grid gap-3 md:grid-cols-2 lg:grid-cols-[1fr_1.1fr_1fr_1fr]">
      <div className="space-y-3">
        <section className={card}>
          <h2 className={head}>Contractual terms</h2>
          <dl className="divide-y divide-line/60 pb-1 text-[11.5px] leading-snug">
            {c.terms.map(([k, v]) => <div key={k} className="grid grid-cols-[38%_62%] px-3 py-[3px]"><dt className="text-mute">{k}</dt><dd>{v}</dd></div>)}
          </dl>
        </section>
        <section className={card}>
          <h2 className={head}>Where it ranks</h2>
          <div className="pb-1"><Table rows={c.capital} /></div>
        </section>
      </div>
      <div className="space-y-3">
        <section className={card}>
          <h2 className={head}>Financial strength</h2>
          <Table cols={fh} rows={fin} />
          <p className="px-3 pb-2 pt-1 text-[11px] leading-snug text-mute">{c.financialsNote}</p>
        </section>
        <section className={card}>
          <h2 className={head}>Price and return quotes</h2>
          <Table cols={["Source", "Date", "Price", "Return"]} rows={c.quotes} />
          <p className="px-3 pb-2 pt-1 text-[11px] leading-snug text-mute">{c.quotesNote}</p>
        </section>
      </div>
      <div className="space-y-3">
        <section className={card}>
          <h2 className={head}>Credit scorecard</h2>
          <ul className="divide-y divide-line/60 text-[11.5px] leading-snug">
            {c.scorecard.map(([k, note, s]) => (
              <li key={k} className="flex items-center gap-2 px-3 py-[3px]">
                <div className="min-w-0 flex-1"><p>{k}</p><p className="text-[10.5px] text-mute">{note}</p></div>
                <span className="w-7 text-right font-semibold tabular-nums">{s}</span>
              </li>
            ))}
          </ul>
          <p className="px-3 pb-2 pt-1 text-[11px] leading-snug text-mute">{c.scorecardNote} Composite {c.score}/100; outlook {c.outlook}, {c.outlookNote.toLowerCase()}.</p>
        </section>
      </div>
      <div className="space-y-3">
        <section className={card}>
          <h2 className={head}>Main risks</h2>
          <ul className="space-y-1 px-3 pb-2 text-[11.5px] leading-snug">
            {c.risks.map(([k, v]) => <li key={k}><span className="font-medium">{k}.</span> <span className="text-mute">{v}</span></li>)}
          </ul>
        </section>
        <section className={card}>
          <h2 className={head}>Withholding tax</h2>
          <p className="px-3 pb-2 text-[11.5px] leading-snug text-mute">{c.tax}</p>
        </section>
        <section className={card}>
          <h2 className={head}>Our view</h2>
          <p className="px-3 pb-2 text-[11.5px] leading-snug">{c.recommendation}</p>
        </section>
      </div>
    </div>
  );
}
