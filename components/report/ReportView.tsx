import Link from "next/link";
import Logo from "@/components/Logo";
import { RiskBadge } from "@/components/RiskBadge";
import type { Fig, Report, Row } from "@/lib/bondReport";
import ReportActions from "./ReportActions";
import ReportNav, { type NavItem } from "./ReportNav";
import { Metric } from "./FinancialChart";
import Tip from "./Tip";

const STATUS: Record<Fig["status"], string> = { verified: "Verified", provisional: "Provisional", not_verified: "Not verified" };
const NV: Fig = { text: "Not verified", status: "not_verified" };
const lead = "text-[17px] leading-[1.6] text-ink";
const body = "text-[16px] leading-[1.65]";
const meta = "text-[13px] leading-snug text-mute";
const label = "text-[14px] font-medium text-mute";
const card = "report-card rounded-3xl border border-line bg-white p-6 sm:p-8";

const SECTIONS: NavItem[] = [
  { id: "overview", n: "01", label: "Overview" },
  { id: "thesis", n: "02", label: "Thesis" },
  { id: "credit", n: "03", label: "Credit" },
  { id: "financials", n: "04", label: "Financials" },
  { id: "protection", n: "05", label: "Protection" },
  { id: "stress", n: "06", label: "Stress" },
  { id: "yield", n: "07", label: "Yield & tax" },
  { id: "sources", n: "08", label: "Methodology" },
];

/** Provenance line under a figure: status, kind, date, source. Always shows the observation date when there is one. */
function figMeta(f: Fig) {
  return [STATUS[f.status], f.kind, f.asOf, f.source].filter(Boolean).join(" · ");
}

/** The stated value, split so a leading "≈" is drawn small and the number keeps its room on a phone. */
function BigText({ text, className = "", size }: { text: string; className?: string; size?: string }) {
  const m = text.match(/^(≈\s*)(.*)$/);
  return <span className={className} style={size ? { fontSize: size } : undefined}>{m ? <><span className="mr-1 text-[0.55em] font-medium text-mute">≈</span>{m[2]}</> : text}</span>;
}

function Section({ n, id, title, intro, band, children }: { n: string; id: string; title: string; intro?: string; band?: boolean; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className={`report-section px-5 py-[52px] sm:px-8 md:px-14 ${band ? "bg-[#f7f7f9]" : "bg-white"}`}>
      <div className="flex items-baseline gap-4 sm:gap-6">
        <span aria-hidden="true" className="select-none text-[56px] font-semibold leading-none tracking-tight text-[#d2d2d7] tabular-nums md:text-[80px]">{n}</span>
        <h2 id={`${id}-h`} className="text-[30px] font-semibold leading-[1.1] tracking-tight md:text-[40px]">{title}</h2>
      </div>
      {intro && <p className={`mt-4 max-w-[680px] ${body} text-mute`}>{intro}</p>}
      <div className="mt-8 md:mt-10">{children}</div>
    </section>
  );
}

function Rows({ rows }: { rows: Row[] }) {
  return (
    <dl className="divide-y divide-line/80">
      {rows.map((r) => (
        <div key={r.label} className="grid grid-cols-1 gap-1 py-4 sm:grid-cols-[38%_minmax(0,1fr)] sm:gap-5">
          <dt className="text-[16px] text-mute">{r.label}</dt>
          <dd className="min-w-0">
            <span className={`block break-words text-[17px] leading-snug ${r.fig.status === "not_verified" ? "text-mute" : "font-medium"}`}>{r.fig.text}</span>
            {r.fig.status !== "not_verified" && <span className={`mt-0.5 block break-words ${meta}`}>{figMeta(r.fig)}</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function Details({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <details className={`group report-details rounded-2xl border border-line bg-white ${className}`}>
      <summary className="flex min-h-[56px] cursor-pointer list-none items-center justify-between gap-4 px-5 py-3 text-[16px] font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent [&::-webkit-details-marker]:hidden">
        {title}
        <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-canvas text-[20px] leading-none text-mute transition-transform duration-200 motion-reduce:transition-none group-open:rotate-45">+</span>
      </summary>
      <div className="border-t border-line/80 px-5 py-5">{children}</div>
    </details>
  );
}

function Table({ header, rows }: { header?: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[15px]">
        {header && <thead><tr className="text-left text-[13px] text-mute">{header.map((h, i) => <th key={i} scope="col" className={`py-2 pr-4 font-medium ${i ? "text-right" : ""}`}>{h}</th>)}</tr></thead>}
        <tbody className="divide-y divide-line/80">
          {rows.map((r, i) => <tr key={i}>{r.map((v, j) => <td key={j} className={`py-3 pr-4 ${j ? "text-right tabular-nums sm:whitespace-nowrap" : "text-ink"}`}>{v}</td>)}</tr>)}
        </tbody>
      </table>
    </div>
  );
}

function Kpi({ title, f, tip, right }: { title: string; f: Fig; tip?: React.ReactNode; right?: boolean }) {
  const none = f.status === "not_verified";
  return (
    <div className="report-card min-w-0 rounded-3xl border border-line bg-white p-4 sm:p-7" style={{ containerType: "inline-size" }} data-testid={`kpi-${title.toLowerCase().replace(/\W+/g, "-")}`}>
      <p className={label}>{title}{tip && <Tip term={title} right={right}>{tip}</Tip>}</p>
      <BigText text={f.text} className={`mt-3 block whitespace-nowrap font-semibold leading-none tracking-tight tabular-nums ${none ? "text-[24px] text-mute md:text-[36px]" : ""}`} size={none ? undefined : "clamp(26px, 22cqi, 56px)"} />
      <p className={`mt-3 ${meta}`}>{figMeta(f)}</p>
    </div>
  );
}

type Tone = "buy" | "watch" | "avoid" | "none";
/** BUY / WATCH / AVOID read from the stated view; anything else is shown as it is. */
function verdict(v: Fig): { word: string; tone: Tone } {
  if (v.status === "not_verified") return { word: "Not verified", tone: "none" };
  if (/avoid|sell|cautious/i.test(v.text)) return { word: "AVOID", tone: "avoid" };
  if (/watch/i.test(v.text)) return { word: "WATCH", tone: "watch" };
  if (/buy|positive/i.test(v.text)) return { word: "BUY", tone: "buy" };
  return { word: v.text, tone: "none" };
}
const TONE: Record<Tone, string> = {
  buy: "bg-[#e7f6ee] text-[#067647]",
  watch: "bg-[#fff1dc] text-[#b54708]",
  avoid: "bg-[#fde8e6] text-[#b42318]",
  none: "bg-canvas text-mute",
};

function barColor(score: number) {
  return score >= 85 ? "#2f9e6e" : score >= 50 ? "#c77a12" : "#c0392b";
}

/** The report: one scrolling page, eight numbered sections. `open` = this reader may see the research (paid plan, or the free example). */
export default function ReportView({ r, open, admin = false }: { r: Report; open: boolean; admin?: boolean }) {
  const title = r.maturityYear && !r.name.includes(r.maturityYear) ? `${r.name} ${r.maturityYear}` : r.name;
  const c = r.conclusion;
  const v = verdict(c.view);
  const identity = [r.currency, r.couponType].filter(Boolean).join(" · ");
  const term = (l: string) => r.terms.find((t) => t.label === l)?.fig ?? NV;
  const weak = [...r.scorecard].sort((a, b) => a.score - b.score).slice(0, 3);

  return (
    <div className="report-wide" data-testid="report-wrap">
      <div className="report-inner">
        <article className="report" data-testid="bond-report">
          {open && <ReportNav items={SECTIONS} />}

          {/* 01 Hero */}
          <section id="overview" aria-label="Overview" className={`report-section bg-white px-5 pb-[52px] pt-8 sm:px-8 md:px-14 md:pb-[64px] md:pt-12 ${open ? "" : "rounded-[28px]"}`}>
            <div className="hidden print:block"><Logo className="mb-4 h-7 w-auto" /></div>
            <nav aria-label="Breadcrumb" className="text-[14px] text-mute print:hidden"><Link href="/risk-assessment" className="hover:text-ink">Companies in focus</Link> › Bond report</nav>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <span className={`inline-flex min-h-[40px] items-center rounded-full px-5 text-[15px] font-semibold tracking-wide ${TONE[v.tone]}`} data-testid="verdict">{v.word}</span>
              {v.tone !== "none" && <span className="text-[15px] text-mute">{c.view.text}</span>}
            </div>
            <h1 className="mt-5 break-words text-[36px] font-semibold leading-[1.05] tracking-tight md:text-[60px]" data-testid="report-title">{title}</h1>
            <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-[16px] text-mute" data-testid="report-identity">
              <span className="font-medium text-ink">{r.isin}</span>
              {r.issuer !== r.name && <span>· {r.issuer}</span>}
              {r.seniority && <span>· {r.seniority}</span>}
              {identity && <span>· {identity}</span>}
            </p>
            {admin && <p className={`mt-1 ${r.freshness.stale ? "text-[14px] text-[#b54708]" : "text-[14px] text-mute"}`} data-testid="freshness">{r.freshness.label}</p>}

            {open && c.summary && <p className={`mt-6 max-w-[760px] text-[18px] leading-[1.6] md:text-[20px]`}>{c.summary}</p>}

            <div className="mt-8 grid grid-cols-2 gap-3 md:gap-5">
              <Kpi title="Investment score" f={open ? r.kpis.score : { text: "Plans", status: "not_verified" }} tip="Our own 0–100 rating of how safely the issuer can pay coupons and repay. It is a ranking aid, not a probability of default." />
              <Kpi title="Return (gross)" f={open ? r.kpis.ret : { text: "Plans", status: "not_verified" }} right tip="Yearly return if you hold to maturity, before tax and costs. Not a promise." />
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-6 rounded-3xl border border-line bg-white p-5 sm:p-7 md:mt-5 lg:grid-cols-4">
              <HeroFact title="Return after tax" f={open ? r.netReturn : NV} />
              <HeroFact title="Maturity" f={r.kpis.maturity} note={r.kpis.maturityNote} />
              <HeroFact title="Seniority" f={r.seniority ? { text: r.seniority, status: "verified" } : NV} plain />
              <div>
                <dt className={label}>10bonds risk</dt>
                <dd className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1"><RiskBadge risk={r.risk} size="lg" /><span className={meta}>1 lowest · 10 highest</span></dd>
              </div>
            </dl>

            <div className="mt-8 flex flex-wrap items-center gap-3 print:hidden">
              <Link href="/?intro=0" data-testid="compare-safer" className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-ink px-6 text-[15px] font-medium text-white hover:bg-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent">Compare with safer alternatives</Link>
              <ReportActions isin={r.isin} />
            </div>
          </section>

          {!open ? (
            <section className="report-section rounded-b-[28px] bg-[#f7f7f9] px-5 py-14 text-center sm:px-8" data-testid="report-locked">
              <p className="text-[22px] font-semibold tracking-tight">The full report is on paid plans</p>
              <p className="mx-auto mt-2 max-w-md text-[16px] text-mute">Investment thesis, credit assessment, financials, contractual protection, stress scenarios, and tax for every bond we cover.</p>
              <Link href="/pricing" className="mt-6 inline-flex min-h-[48px] items-center rounded-full bg-accent px-7 text-[15px] font-medium text-white">See plans</Link>
            </section>
          ) : (
            <>
              <Thesis r={r} weak={weak} />
              <Credit r={r} />
              <Financials r={r} />
              <Protection r={r} term={term} />
              <Stress r={r} />
              <Yield r={r} term={term} />
              <Sources r={r} admin={admin} />
            </>
          )}
        </article>
      </div>
    </div>
  );
}

function HeroFact({ title, f, note, plain }: { title: string; f: Fig; note?: string; plain?: boolean }) {
  const none = f.status === "not_verified";
  return (
    <div className="min-w-0">
      <dt className={label}>{title}</dt>
      <dd className="mt-2">
        <span className={`block ${none ? "text-[20px] text-mute" : "text-[22px] font-semibold leading-tight tracking-tight md:text-[24px]"}`}>{f.text}</span>
        <span className={`mt-1 block ${meta}`}>{note ?? (plain ? "" : figMeta(f))}</span>
      </dd>
    </div>
  );
}

function Thesis({ r, weak }: { r: Report; weak: Report["scorecard"] }) {
  const c = r.conclusion;
  return (
    <Section n="02" id="thesis" title="Investment thesis" intro="Should I consider buying this bond? The short answer first, then the case for and against.">
      <div className={`${card} bg-[#f7f7f9]`} data-testid="conclusion">
        <p className={label}>Our view</p>
        <p className="mt-2 text-[28px] font-semibold leading-tight tracking-tight md:text-[34px]">{c.view.status === "not_verified" ? "Not verified" : c.view.text}</p>
        <p className={`mt-2 ${meta}`}>{[STATUS[c.view.status], c.view.kind, c.view.asOf].filter(Boolean).join(" · ")}</p>
        {c.analyst ? <p className={`mt-6 max-w-[760px] ${lead}`}>{c.analyst}</p> : <p className={`mt-6 ${body} text-mute`}>Analyst conclusion: Not verified</p>}
      </div>

      <div className="mt-8 grid gap-8 md:grid-cols-2 md:gap-10">
        <div>
          <h3 className="text-[20px] font-semibold tracking-tight text-[#067647]">Reasons to buy</h3>
          {c.strengths.length ? <ul className={`mt-4 space-y-3 ${body}`}>{c.strengths.map((s) => <li key={s} className="border-l-2 border-[#2f9e6e] pl-4">{s}</li>)}</ul> : <p className={`mt-4 ${body} text-mute`}>Not verified</p>}
        </div>
        <div>
          <h3 className="text-[20px] font-semibold tracking-tight text-[#b54708]">Reasons to avoid</h3>
          {weak.length ? <ul className={`mt-4 space-y-3 ${body}`}>{weak.map((s) => <li key={s.label} className="border-l-2 border-[#c77a12] pl-4">{s.label}: {s.note}</li>)}</ul> : <p className={`mt-4 ${body} text-mute`}>Not verified</p>}
          <p className={`mt-3 ${meta}`}>Taken from the weakest credit factors in section 03.</p>
        </div>
      </div>

      <h3 className="mt-14 text-[24px] font-semibold tracking-tight">Three critical risks</h3>
      {c.risks.length ? (
        <ol className="mt-5 grid gap-4 md:grid-cols-3">
          {c.risks.slice(0, 3).map(([k, t], i) => (
            <li key={k} className={`${card} !p-6`}>
              <span className="text-[14px] font-semibold tabular-nums text-mute">{i + 1}</span>
              <p className="mt-2 text-[19px] font-semibold leading-snug tracking-tight">{k}</p>
              <p className={`mt-2 text-[15px] leading-[1.6] text-mute`}>{t}</p>
            </li>
          ))}
        </ol>
      ) : <p className={`mt-4 ${body} text-mute`}>Not verified</p>}
    </Section>
  );
}

function Credit({ r }: { r: Report }) {
  const o = r.conclusion.outlook;
  return (
    <Section n="03" id="credit" title="Credit assessment" band intro="How safe is my principal? Six factors, each scored 0 to 100 by our own research. Higher is safer.">
      {r.scorecard.length ? (
        <ul className="space-y-7">
          {r.scorecard.map((s) => (
            <li key={s.label}>
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-[18px] font-medium tracking-tight">{s.label}</span>
                <span className="text-[28px] font-semibold tabular-nums leading-none">{s.score}</span>
              </div>
              <div className="mt-3 h-3 rounded-full bg-[#e5e5ea]" role="img" aria-label={`${s.label} ${s.score} out of 100`}>
                <div className="h-3 rounded-full" style={{ width: `${s.score}%`, background: barColor(s.score) }} />
              </div>
              <p className="mt-2 text-[15px] text-mute">{s.note}</p>
            </li>
          ))}
        </ul>
      ) : <p className={`${body} text-mute`}>Not verified. No six-factor scorecard is on file for this bond.</p>}

      <div className="mt-12 grid gap-5 md:grid-cols-2 print:grid-cols-1">
        <div className={card}>
          <h3 className="text-[20px] font-semibold tracking-tight">Score methodology</h3>
          <p className={`mt-3 ${body} text-mute`}>{r.scorecardNote}</p>
          <p className={`mt-3 ${body} text-mute`}>The 10bonds risk score (1 lowest, 10 highest) is shown beside the name at the top of the page.</p>
        </div>
        <div className={card}>
          <h3 className="text-[20px] font-semibold tracking-tight">Outlook, −10 to +10<Tip term="Outlook" right>Our view of where the credit is heading over the next 24 months. Below zero means the trend is weakening, above zero improving.</Tip></h3>
          {o === null ? <p className={`mt-4 ${body} text-mute`}>Not verified</p> : (
            <>
              <p className="mt-3 text-[44px] font-semibold leading-none tracking-tight tabular-nums">{o > 0 ? "+" : o < 0 ? "−" : ""}{Math.abs(o)}</p>
              <div className="relative mt-5 h-3 rounded-full bg-[#e5e5ea]" aria-hidden="true">
                <div className="absolute left-1/2 top-[-4px] h-5 w-0.5 bg-mute" />
                <div className="absolute top-[-4px] h-5 w-5 -translate-x-1/2 rounded-full border-2 border-white bg-[#1f2d4d] shadow-[0_1px_4px_rgba(0,0,0,0.25)]" style={{ left: `${(o + 10) * 5}%` }} />
              </div>
              <p className={`mt-4 text-[15px] text-mute`}>{r.conclusion.outlookNote}</p>
            </>
          )}
        </div>
      </div>
    </Section>
  );
}

function Financials({ r }: { r: Report }) {
  const f = r.financials;
  return (
    <Section n="04" id="financials" title="Financial strength" intro="Can the issuer keep paying? Latest company results, compared with the same period a year earlier.">
      {!f ? <p className={`${body} text-mute`}>Not verified. No company results are on file for this bond.</p> : (
        <>
          <div className="grid gap-4 md:grid-cols-2 md:gap-5" data-testid="fin-chart">
            {f.rows.map((row) => <Metric key={row[0]} header={f.header} row={row} />)}
          </div>
          <p className={`mt-6 max-w-[760px] ${body} text-mute`}>{f.note}</p>
          <Details title="Results table: latest two half-years" className="mt-6">
            <Table header={f.header} rows={f.rows} />
            <p className={`mt-4 ${meta}`}>Three years of annual results: Not verified. Only the latest two half-year periods are on file. Source: company half-year reports.</p>
          </Details>
        </>
      )}
    </Section>
  );
}

const PROTECTION_SCHEDULE = ["Coupon", "Coupon type", "Payment frequency", "Fixed / floating periods and reset formula", "Issue date"];
const PROTECTION_REPAY = ["Final maturity", "Redemption", "Call rights", "Guarantees", "Seniority", "Minimum denomination", "Currency", "Prospectus and Final Terms"];

function Protection({ r, term }: { r: Report; term: (l: string) => Fig }) {
  const pick = (labels: string[]): Row[] => labels.map((l) => ({ label: l, fig: term(l) }));
  const other = r.terms.filter((t) => ![...PROTECTION_SCHEDULE, ...PROTECTION_REPAY, "ISIN"].includes(t.label));
  return (
    <Section n="05" id="protection" title="Contractual protection" band intro="What contractual protection do I have? Coupons, ranking in a default, early redemption and repayment.">
      <div className="grid gap-5 md:grid-cols-2 print:grid-cols-1">
        <div className={card}>
          <h3 className="text-[20px] font-semibold tracking-tight">Coupon schedule</h3>
          <div className="mt-2"><Rows rows={pick(PROTECTION_SCHEDULE)} /></div>
        </div>
        <div className={card}>
          <h3 className="text-[20px] font-semibold tracking-tight">Maturity, calls and guarantees<Tip term="call right" right>A call right lets the issuer repay the bond early. If it does, you get your money back sooner and stop earning the coupon.</Tip></h3>
          <div className="mt-2"><Rows rows={pick(PROTECTION_REPAY)} /></div>
        </div>
      </div>

      <div className={`${card} mt-5`}>
        <h3 className="text-[20px] font-semibold tracking-tight">Creditor seniority<Tip term="seniority">Seniority decides who is repaid first if the issuer fails. Senior unsecured bondholders rank above subordinated bondholders and shareholders.</Tip></h3>
        <p className={`mt-2 ${body} text-mute`}>Where this bond ranks if the issuer cannot pay. Safest at the top.</p>
        {r.capital.length ? (
          <ol className="mt-6 divide-y divide-line/80 overflow-hidden rounded-2xl border border-line">
            {r.capital.map(([layer, risk, mark]) => {
              const here = /this bond/i.test(mark);
              return (
                <li key={layer} className={`flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-5 py-4 ${here ? "bg-[#eef4fb]" : "bg-white"}`} aria-current={here ? "true" : undefined}>
                  <span className={`text-[16px] ${here ? "font-semibold" : ""}`}>{layer}</span>
                  <span className="flex items-center gap-4 text-[15px]">
                    <span className="text-mute">{risk} risk</span>
                    {mark !== "–" && <span className={`min-w-[74px] text-right font-medium ${here ? "text-accent" : "text-mute"}`}>{mark}</span>}
                  </span>
                </li>
              );
            })}
          </ol>
        ) : <p className={`mt-4 ${body}`}>Seniority classification: {r.seniority ?? "Not verified"}</p>}
      </div>

      {other.length > 0 && <Details title="More bond terms" className="mt-5"><Rows rows={other} /></Details>}
    </Section>
  );
}

const SCENARIOS = [
  { name: "Base case", text: "Conditions stay close to today." },
  { name: "Adverse case", text: "Conditions worsen moderately." },
  { name: "Severe case", text: "Conditions worsen sharply." },
];

function Stress({ r }: { r: Report }) {
  const sc = (l: string) => r.scorecard.find((s) => s.label === l);
  const ext = [
    { title: "Legislative and regulatory", s: sc("Legal / regulatory") },
    { title: "Geopolitical and external", s: sc("Geopolitical / external") },
  ];
  return (
    <Section n="06" id="stress" title="Stress scenarios" intro="What could go wrong? Three cases for the issuer's ability to repay, and the outside risks specific to this company.">
      <div className="grid gap-4 md:grid-cols-3 md:gap-5">
        {SCENARIOS.map((s) => (
          <div key={s.name} className={`${card} !p-6`} data-testid="scenario">
            <p className="text-[19px] font-semibold tracking-tight">{s.name}</p>
            <p className="mt-2 text-[15px] text-mute">{s.text}</p>
            <p className="mt-5 text-[20px] font-medium text-mute">Not verified</p>
            <p className={`mt-1 ${meta}`}>No modelled result on file.</p>
          </div>
        ))}
      </div>

      <h3 className="mt-14 text-[24px] font-semibold tracking-tight">Issuer-specific outside risks</h3>
      <div className="mt-5 grid gap-5 md:grid-cols-2 print:grid-cols-1">
        {ext.map(({ title, s }) => (
          <div key={title} className={card}>
            <p className="text-[19px] font-semibold tracking-tight">{title}</p>
            {s ? (
              <>
                <p className="mt-3 text-[15px] text-mute">{s.note}</p>
                <p className="mt-4 flex items-baseline gap-2"><span className="text-[36px] font-semibold leading-none tabular-nums" style={{ color: barColor(s.score) }}>{s.score}</span><span className="text-[14px] text-mute">out of 100, higher is safer</span></p>
              </>
            ) : <p className="mt-3 text-[17px] text-mute">Not verified</p>}
          </div>
        ))}
      </div>

      {r.conclusion.risks.length > 0 && (
        <div className="mt-8 space-y-3">
          <h3 className="text-[20px] font-semibold tracking-tight">Risk explanations</h3>
          {r.conclusion.risks.map(([k, t]) => <Details key={k} title={k}><p className={`${body} text-mute`}>{t}</p></Details>)}
        </div>
      )}

      <div className={`${card} mt-8`}>
        <h3 className="text-[20px] font-semibold tracking-tight">Share-price early-warning signals<Tip term="early-warning signals">A falling share price often warns of credit trouble before bond prices or ratings react. We watch for it.</Tip></h3>
        <p className="mt-3 text-[17px] text-mute">Not verified</p>
        <p className={`mt-1 ${meta}`}>No equity indicators on file for this issuer.</p>
      </div>
    </Section>
  );
}

function Yield({ r, term }: { r: Report; term: (l: string) => Fig }) {
  const flow: Row[] = [
    { label: "Coupon", fig: term("Coupon") },
    { label: "Payment frequency", fig: term("Payment frequency") },
    { label: "Redemption", fig: term("Redemption") },
    { label: "Final maturity", fig: term("Final maturity") },
    { label: "Minimum denomination", fig: term("Minimum denomination") },
  ];
  return (
    <Section n="07" id="yield" title="Yield and taxation" band intro="What yield will I earn? From the gross return to what is left after withholding tax. Your own country's tax is not included.">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 md:gap-5">
        <Kpi title="Return (gross)" f={r.kpis.ret} tip="Yearly return if held to maturity, before any tax and costs." />
        <Kpi title="Withholding tax" f={r.kpis.wht} tip="Tax the bond's home country may take from the interest before you receive it. Often removable with the right custodian papers." />
        <Kpi title="Return after tax" f={r.netReturn} right tip="Gross return once withholding tax is taken off. It still ignores tax in your own country of residence." />
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-2 print:grid-cols-1">
        <div className={card}>
          <h3 className="text-[20px] font-semibold tracking-tight">Execution costs</h3>
          <Rows rows={[
            { label: "Broker fees and bid-ask spread", fig: NV },
            { label: "Custodian-specific assumptions", fig: NV },
          ]} />
        </div>
        <div className={card}>
          <h3 className="text-[20px] font-semibold tracking-tight">Cash-flow assumptions</h3>
          <Rows rows={flow} />
        </div>
      </div>

      <Details title="Withholding-tax review" className="mt-5">
        <p className={`${body} text-mute`}>{r.tax.text ?? "No withholding-tax review on file."}</p>
        <p className={`mt-3 ${meta}`}>Tax in your own country of residence is not included.</p>
      </Details>
    </Section>
  );
}

function Sources({ r, admin }: { r: Report; admin: boolean }) {
  const nv = (v: string) => (v === "–" || !v ? "Not verified" : v);
  return (
    <Section n="08" id="sources" title="Methodology" intro="What evidence supports the conclusion? Every figure carries a verification mark.">
      {admin && (
        <div className={`${card} mb-5`}>
          <h3 className="text-[20px] font-semibold tracking-tight">Dated price observations <span className="text-[13px] font-medium text-mute">Admin only</span></h3>
          <div className="mt-4">
            {r.sources.length ? <Table header={["Source", "Observed", "Price", "Return"]} rows={r.sources.map((s) => [s.source, nv(s.date), nv(s.price), nv(s.ret)])} /> : <p className={`${body} text-mute`}>Not verified</p>}
          </div>
          <p className={`mt-4 text-[15px] text-mute`}>{r.sourcesNote}</p>
        </div>
      )}

      <div className="mt-5 grid gap-5 md:grid-cols-2 print:grid-cols-1">
        <div className={card}>
          <h3 className="text-[20px] font-semibold tracking-tight">Research coverage</h3>
          <p className={`mt-3 ${body} text-mute`} data-testid="research-status">{r.conclusion.status}</p>
          {admin && <p className={`mt-3 ${meta}`}>{r.freshness.label}</p>}
        </div>
        <div className={card}>
          <h3 className="text-[20px] font-semibold tracking-tight">Verification status</h3>
          <p className={`mt-3 ${body} text-mute`}>Every figure carries one of three marks: Verified, Provisional or Not verified. Nothing is estimated to fill a gap.</p>
        </div>
      </div>

      <Details title={`Verification warnings (${r.unavailable.length})`} className="mt-5">
        <ul className="list-disc space-y-1.5 pl-5 text-[15px] text-mute">
          {r.unavailable.map((u) => <li key={u}>{u}: Not verified</li>)}
        </ul>
      </Details>
    </Section>
  );
}
