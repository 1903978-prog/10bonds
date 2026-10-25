import Link from "next/link";
import FocusShell, { card, head } from "@/components/FocusShell";
import { COMPANIES_IN_FOCUS, type FocusCompany } from "@/lib/companiesInFocus";

const td = "px-3 py-[3px] align-top";

/** Risk assessment, companies: same layout as the country pages, with the corporate dimensions. */
export default function CompanyFocus({ c, paid }: { c: FocusCompany; paid: boolean }) {
  const nav = COMPANIES_IN_FOCUS.map((x) => ({ key: x.isin, href: `/risk-assessment/${x.isin}`, label: x.name, current: x.isin === c.isin, locked: !x.free, free: x.free }));
  return (
    <FocusShell kind="companies" testId="company-focus" nav={nav} paid={paid} open={paid || c.free === true}
      header={{ tile: c.name.slice(0, 4).toUpperCase(), name: c.issuer, sub: `${c.name} · ${c.isin}`, score: c.score, risk: c.risk }}
      snapshot={{
        title: <>{c.name} <span className="font-normal text-mute">· corporate snapshot, {c.updated}</span> <Link href={`/report/${c.isin}`} className="ml-1 text-[12px] font-normal text-accent hover:underline">Full report</Link></>,
        text: paid || c.free ? c.summary : `Main risks: ${c.risksShort}.`,
      }}
      lockedTitle={`The full ${c.name} scoring is on paid plans`}
      lockedText="Key financials, credit scorecard, terms, tax and our view for every company in focus.">
      <Body c={c} />
    </FocusShell>
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
    <div className="mt-2 grid gap-3 md:grid-cols-2 lg:grid-cols-[1.25fr_1fr_1fr_1.3fr]">
      <div className="space-y-3">
      <section className={card}>
        <h2 className={head}>Key financials</h2>
        <Table cols={fh} rows={fin} />
        <p className="px-3 pb-2 pt-1 text-[11px] leading-snug text-mute">{c.financialsNote}</p>
      </section>
        <section className={card}>
          <h2 className={head}>Withholding tax</h2>
          <p className="px-3 pb-2 text-[11.5px] leading-snug text-mute">{c.tax}</p>
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
        <section className={card}>
          <h2 className={head}>Price and return quotes</h2>
          <Table cols={["Source", "Date", "Price", "Return"]} rows={c.quotes} />
          <p className="px-3 pb-2 pt-1 text-[11px] leading-snug text-mute">{c.quotesNote}</p>
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
          <h2 className={head}>Our view · {c.view}</h2>
          <p className="px-3 pb-2 text-[11.5px] leading-snug">{c.recommendation}</p>
        </section>
      </div>
      <div className="space-y-3">
        <section className={card}>
          <h2 className={head}>Contractual terms</h2>
          <dl className="divide-y divide-line/60 pb-1 text-[11.5px] leading-snug">
            {c.terms.map(([k, v]) => <div key={k} className="grid grid-cols-[38%_62%] px-3 py-[3px]"><dt className="text-mute">{k}</dt><dd>{v}</dd></div>)}
          </dl>
        </section>
      </div>
    </div>
  );
}
