import Link from "next/link";
import type { Metadata } from "next";
import { OG_IMAGES } from "@/lib/ogImage";
import { priceFreshnessReport } from "@/lib/bonds";
import { PORTFOLIO_SPEC } from "@/lib/portfolioSpec";
import { LOSS_GIVEN_DEFAULT } from "@/lib/expectedLoss";
import { RISK_WARNING } from "@/lib/riskWarning";

const DESC = "How 10BONDS calculates its lists of 10 bonds: the method step by step, where the data comes from and when each part is updated.";

export const metadata: Metadata = {
  title: "How we calculate · 10BONDS",
  description: DESC,
  alternates: { canonical: "/how-we-calculate" },
  openGraph: { images: OG_IMAGES, title: "How we calculate · 10BONDS", description: DESC, url: "/how-we-calculate" },
};
export const dynamic = "force-dynamic";

/** Public: the method in plain steps, the data sources and the update times, with the real time of the last price update. */
export default async function HowWeCalculate() {
  const report = await priceFreshnessReport().catch(() => null);
  const times = (report?.rows ?? []).map((r) => r.lastPush).filter((x): x is string => !!x).sort();
  const last = times.length ? new Date(times[times.length - 1]).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" }) + " (Rome time)" : "not available right now";
  const h = "mt-6 font-semibold";
  return (
    <article className="mx-auto max-w-3xl rounded-lg border border-line bg-white p-7 text-[15px] leading-relaxed sm:p-10" data-testid="how-we-calculate">
      <h1 className="text-3xl font-semibold tracking-tight">How we calculate</h1>
      <p className="mt-5">10BONDS builds lists of 10 bonds with one fixed method, applied in the same way to every bond. It is information only, not investment advice. {RISK_WARNING.en}</p>

      <h2 className={h}>The method, step by step</h2>
      <ol className="mt-2 list-decimal space-y-1.5 pl-5">
        <li><b>Start from the public bond data.</b> Euro and US dollar bonds with a price, a coupon and a maturity date.</li>
        <li><b>Leave out what does not fit.</b> Prices older than {PORTFOLIO_SPEC.staleTradingDays} trading days, defaulted bonds, subordinated, hybrid and perpetual bonds, callable and amortising bonds, and prices that are far from comparable bonds.</li>
        <li><b>Give each issuer a risk level from 1 to 10.</b> It is our own assessment, not a credit rating.</li>
        <li><b>Work out the expected credit loss.</b> From our default table, with a loss of {Math.round(LOSS_GIVEN_DEFAULT * 100)}% of the amount if an issuer defaults.</li>
        <li><b>Compare the yield with the official benchmark curve</b> and subtract the expected loss. This gives the net spread.</li>
        <li><b>Pick 10 bonds from 10 different issuers</b> with the highest net spread that respects the limits on duration, sectors and risk.</li>
      </ol>
      <p className="mt-2">The full description is in the <Link className="text-accent underline" href="/selection-methodology">selection methodology</Link> and the <a className="text-accent underline" href="/methodology/10bonds-quant-methodology.pdf">scientific methodology (PDF)</a>.</p>

      <h2 className={h}>Where the data comes from</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        <li>Prices, coupons and maturities: public market data on listed bonds.</li>
        <li>Euro benchmark curve: Deutsche Bundesbank. US dollar benchmark curve: US Federal Reserve.</li>
        <li>Default probabilities: our own table, based on public historical default studies.</li>
      </ul>

      <h2 className={h}>When it is updated</h2>
      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5">
        <dt className="font-medium">Last price update</dt><dd data-testid="how-last-update">{last}</dd>
        <dt className="font-medium">Bond prices</dt><dd>Every day. The nightly update finishes between 01:10 and 05:00 CET.</dd>
        <dt className="font-medium">Lists of 10 bonds</dt><dd>Rebuilt after each nightly price update.</dd>
        <dt className="font-medium">Benchmark curves</dt><dd>Every week, on Monday.</dd>
        <dt className="font-medium">Stale prices</dt><dd>A bond whose price is more than {PORTFOLIO_SPEC.staleTradingDays} trading days old is left out until it is refreshed.</dd>
      </dl>
      <p className="mt-6 text-[13px] text-mute">Return figures are gross, before taxes and costs.</p>
    </article>
  );
}
