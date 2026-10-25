import FocusShell, { card, head } from "@/components/FocusShell";
import { COUNTRIES_IN_FOCUS, YEARS, type CountryFocus as Country } from "@/lib/countriesInFocus";
import { riskOfLr } from "@/lib/ratings";

/** Risk assessment, countries: the 10bonds.com rating highlight and the full snapshot (paid plans, or the free example). */
export default function CountryFocus({ c, paid }: { c: Country; paid: boolean }) {
  const nav = COUNTRIES_IN_FOCUS.map((x) => ({ key: x.slug, href: `/risk-assessment/countries/${x.slug}`, label: x.name, current: x.slug === c.slug, locked: !x.free, free: x.free }));
  return (
    <FocusShell kind="countries" testId="country-focus" nav={nav} paid={paid} open={paid || c.free === true}
      header={{ tile: c.name.slice(0, 3).toUpperCase(), name: c.name, sub: "Sovereign risk · country", score: c.score, risk: riskOfLr(c.score) ?? 5 }}
      snapshot={{ title: <>{c.name} <span className="font-normal text-mute">· sovereign snapshot, 12 Oct 2026</span></>, text: c.headline }}
      lockedTitle={`The full ${c.name} scoring is on paid plans`}
      lockedText="Key indicators, the path to 2047, early warnings, buffers and risks for every country in focus.">
      <Body c={c} />
    </FocusShell>
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
