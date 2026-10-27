import Link from "next/link";
import TrackView from "@/components/TrackView";
import { DEMO_COST_PCT, DEMO_MIN_GAIN, demoTotals, runDemo } from "@/lib/proDemo";
import { PRO_TRIAL_DAYS } from "@/lib/pro";
import { euro as eurFmt, priceCents } from "@/lib/plans";

const eur = (n: number) => `€${n.toLocaleString("en-GB")}`;

/** Pitch for regulated wealth managers: what the Bond Replacement Engine does, a demo on a fictional portfolio, how access works. */
export default function ProLanding({ cta }: { cta: React.ReactNode }) {
  const lines = runDemo();
  const t = demoTotals(lines);
  return (
    <div className="mx-auto max-w-4xl space-y-6" data-testid="pro-landing">
      <TrackView kind="pro_page_view" />
      <section className="rounded-lg border border-line bg-white p-7 sm:p-10">
        <p className="text-sm font-medium text-accent">For regulated wealth managers and family offices</p>
        <h1 className="mt-1 text-[32px] font-semibold tracking-tight sm:text-[38px]">Bond Replacement Engine</h1>
        <p className="mt-3 max-w-2xl text-[16px] text-mute">
          Upload a client bond portfolio. For each holding, the engine screens the bond universe for a similar-duration alternative with a higher yield or a lower risk level,
          and shows the net gain after trading costs. Fixed rules, shown on screen, applied the same way every time.
        </p>
        <ul className="mt-5 grid gap-3 text-[14px] sm:grid-cols-3">
          <li className="rounded-2xl bg-canvas p-4"><b>1 · Upload</b><br />A CSV or Excel file with ISIN and amount. Portfolios are never stored.</li>
          <li className="rounded-2xl bg-canvas p-4"><b>2 · Screen</b><br />Duration within ±0.5 years, same or better rating, one bond per issuer, issuer cap, net of cost.</li>
          <li className="rounded-2xl bg-canvas p-4"><b>3 · Review</b><br />Keep or Replace for each line, the reason in plain words, and an Excel file for your file note.</li>
        </ul>
        <div className="mt-6">{cta}</div>
      </section>

      <section className="rounded-lg border border-line bg-white p-7 sm:p-10" data-testid="pro-demo">
        <TrackView kind="pro_demo_view" />
        <h2 className="text-[22px] font-semibold tracking-tight">Demo on a sample portfolio</h2>
        <p className="mt-1 text-sm text-mute">Fictional portfolio, fictional bonds and fictional prices, only to show how the screen reads. Not real securities.</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-[13px]">
            <thead>
              <tr className="text-xs text-mute">
                <th className="pb-2 pr-3 font-medium">Held bond</th><th className="pb-2 pr-3 text-right font-medium">Amount</th><th className="pb-2 pr-3 text-right font-medium">Yield</th>
                <th className="pb-2 pr-3 text-right font-medium">Duration</th><th className="pb-2 pr-3 text-right font-medium">Risk</th><th className="pb-2 pr-3 font-medium">Result</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => (
                <tr key={l.held.name} className="border-t border-line align-top">
                  <td className="py-2 pr-3">{l.held.name}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{eur(l.held.amount)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{l.held.yield.toFixed(2)}%</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{l.held.duration.toFixed(1)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{l.held.risk}</td>
                  <td className="py-2 pr-3">
                    {l.action === "keep" ? (
                      <><span className="rounded-full bg-canvas px-2 py-0.5 text-xs font-medium">Keep</span><span className="mt-1 block text-xs text-mute">{l.why}</span></>
                    ) : (
                      <><span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">Replace</span>
                        <span className="mt-1 block">Alternative: {l.alt.name} · {l.alt.yield.toFixed(2)}% · duration {l.alt.duration.toFixed(1)} · risk {l.alt.risk}</span>
                        <span className="block text-xs text-mute">Net gain {l.netGain.toFixed(2)}% a year. {l.why}</span></>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-sm" data-testid="pro-demo-total">
          Portfolio yield of {eur(t.total)}: <b>{t.before.toFixed(2)}%</b> held, <b>{t.after.toFixed(2)}%</b> if every listed alternative were used, before taxes and before the checks below.
        </p>
        <p className="mt-1 text-xs text-mute">
          Rules in this demo: round-trip cost {DEMO_COST_PCT}% spread over the duration; a Replace line needs a net gain of at least {DEMO_MIN_GAIN}% a year, the same or a lower risk level and a duration within 0.5 years.
          Real results use live bond data and your own settings. Prices, liquidity and suitability are for you to check before any trade.
        </p>
      </section>

      <section className="rounded-lg border border-line bg-white p-7 sm:p-10">
        <h2 className="text-[22px] font-semibold tracking-tight">Access for verified professionals</h2>
        <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-[14px]">
          <li>Create a free account and send three details: firm name, regulator, registration number.</li>
          <li>We match them to the public register of your regulator, by hand. This usually takes one working day.</li>
          <li>Once verified, you get a free {PRO_TRIAL_DAYS}-day trial of the full engine. No card is needed and nothing renews on its own.</li>
          <li>After the trial, Pro is {eurFmt(priceCents("pro", "month"))} a month (VAT shown at checkout, business customers can add a VAT number). Cancel any time.</li>
        </ol>
        <p className="mt-4 text-sm text-mute">
          For firms authorised to provide investment services, acting for professional clients or eligible counterparties.
          Read the <Link href="/pro/terms" className="text-accent">business terms for Pro</Link> before you apply. Results are screening information, not a personal recommendation.
        </p>
      </section>
    </div>
  );
}
