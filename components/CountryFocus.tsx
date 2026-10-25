import Link from "next/link";
import FocusTabs from "@/components/FocusTabs";
import { RiskBadge } from "@/components/RiskBadge";
import { COUNTRIES_IN_FOCUS, YEARS, type CountryFocus as Country } from "@/lib/countriesInFocus";
import { riskOfLr } from "@/lib/ratings";

const card = "overflow-hidden rounded-2xl bg-white shadow-[0_2px_20px_rgba(0,0,0,0.04)]";
const head = "px-3 pb-1 pt-2.5 text-[11px] font-semibold uppercase tracking-wide text-mute";

/** Risk assessment, countries: the country tabs, the 10bonds.com rating and the full snapshot (paid plans, or the free example). */
export default function CountryFocus({ c, paid }: { c: Country; paid: boolean }) {
  const open = paid || c.free === true;
  return (
    <article className="mx-auto max-w-6xl" data-testid="country-focus">
      <div className="mt-1 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Countries in focus</h1>
        <FocusTabs active="countries" />
        <p className="text-[12px] text-mute">Free plan: one full example. <Link href="/pricing" className="text-accent hover:underline">Paid plans</Link> have access to all scorings.</p>
      </div>
      <nav className="mt-2 flex flex-wrap gap-1.5 text-[12px]" aria-label="Countries">
        {COUNTRIES_IN_FOCUS.map((x) => (
          <Link key={x.slug} href={`/risk-assessment/countries/${x.slug}`} data-testid="country-tab"
            className={`rounded-full px-2.5 py-0.5 ${x.slug === c.slug ? "bg-ink text-white" : "bg-white text-ink shadow-[0_1px_6px_rgba(0,0,0,0.06)] hover:bg-line/40"}`}>
            {x.name}{!paid && !x.free ? " 🔒" : x.free && !paid ? " · free" : ""}
          </Link>
        ))}
      </nav>

      <section className={`${card} mt-2 flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2.5`}>
        <div className="min-w-0 flex-1 basis-64">
          <p className="text-[15px] font-semibold leading-tight">{c.name} <span className="font-normal text-mute">· sovereign snapshot, 12 Oct 2026</span></p>
          <p className="mt-0.5 text-[12px] leading-snug text-mute">{c.headline}</p>
        </div>
        <div className="flex w-full items-center gap-3 sm:w-auto">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-mute">10bonds.com rating</p>
            <p className="text-2xl font-semibold leading-tight tabular-nums">{c.score}<span className="text-[12px] font-normal text-mute">/100</span></p>
          </div>
          <div className="w-40" aria-hidden>
            <div className="h-2 rounded-full bg-line/70"><div className="h-2 rounded-full bg-accent" style={{ width: `${c.score}%` }} /></div>
            <p className="mt-0.5 flex justify-between text-[9px] text-mute"><span>riskier</span><span>safer</span></p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-mute">Risk</p>
            <RiskBadge risk={riskOfLr(c.score)} size="lg" />
          </div>
        </div>
      </section>

      {open ? <Body c={c} /> : (
        <section className={`${card} mt-3 px-4 py-6 text-center`} data-testid="focus-locked">
          <p className="text-[15px] font-medium">The full {c.name} scoring is on paid plans</p>
          <p className="mt-1 text-[12px] text-mute">Key indicators, the path to 2047, early warnings, buffers and risks for every country in focus.</p>
          <Link href="/pricing" className="mt-3 inline-block rounded-full bg-accent px-5 py-2 text-[13px] font-medium text-white">See plans</Link>
        </section>
      )}
    </article>
  );
}

function Body({ c }: { c: Country }) {
  return (
    <div className="mt-2 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
      <section className={card}>
        <h2 className={head}>Key indicators</h2>
        <dl className="divide-y divide-line/60 pb-1 text-[11.5px] leading-snug">
          {c.indicators.map(([k, v]) => <div key={k} className="flex justify-between gap-2 px-3 py-[3px]"><dt className="text-mute">{k}</dt><dd className="whitespace-nowrap font-medium tabular-nums">{v}</dd></div>)}
        </dl>
      </section>
      <section className={card}>
        <h2 className={head}>Path to 2047</h2>
        <table className="w-full text-[11.5px] leading-snug">
          <thead><tr className="text-[10px] uppercase tracking-wide text-mute"><th className="px-3 py-[3px] text-left font-medium">Year</th><th className="px-3 py-[3px] text-right font-medium">Rating</th><th className="px-3 py-[3px] text-right font-medium">Debt/GDP</th></tr></thead>
          <tbody className="divide-y divide-line/60">
            {YEARS.map((y, i) => (
              <tr key={y}><td className="px-3 py-[3px] text-mute">{y}</td><td className="px-3 py-[3px] text-right font-semibold tabular-nums">{c.path.score[i]}</td><td className="px-3 py-[3px] text-right tabular-nums">{c.path.debt[i]}</td></tr>
            ))}
          </tbody>
        </table>
        <p className="px-3 pb-2 pt-1 text-[11px] leading-snug text-mute">{c.pathNote} Provisional: missing inputs ({c.neutralShare} of the weight) use a neutral 50 and the default-history adjustment is not final.</p>
      </section>
      <div className="space-y-3">
        <section className={card}>
          <h2 className={head}>Early warnings</h2>
          <ul className="space-y-0.5 px-3 pb-2 text-[11.5px] leading-snug">
            {c.warnings.length ? c.warnings.map((w) => <li key={w} className="font-medium text-[#dc2626]">{w}</li>) : <li className="text-mute">No threshold above its limit on verified data.</li>}
          </ul>
        </section>
        <section className={card}>
          <h2 className={head}>Buffers</h2>
          <dl className="space-y-1 px-3 pb-2 text-[11.5px] leading-snug">
            {c.buffers.map(([k, v]) => <div key={k}><dt className="font-medium">{k}</dt><dd className="text-mute">{v}</dd></div>)}
          </dl>
        </section>
      </div>
      <div className="space-y-3">
        <section className={card}>
          <h2 className={head}>Geopolitical risks</h2>
          <p className="px-3 pb-2 text-[11.5px] leading-snug"><span className="font-medium">{c.nato ? "NATO member: collective defence is a deterrent." : "Not a NATO member."}</span> <span className="text-mute">{c.geo}</span></p>
        </section>
        <section className={card}>
          <h2 className={head}>Currency risks · {c.currency}</h2>
          <p className="px-3 pb-2 text-[11.5px] leading-snug text-mute">{c.fx}</p>
        </section>
      </div>
    </div>
  );
}
