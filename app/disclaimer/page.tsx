import type { Metadata } from "next";

export const metadata: Metadata = { title: "Disclaimer · 10BONDS" };

export default function Disclaimer() {
  return (
    <article className="mx-auto max-w-2xl rounded-[28px] bg-white p-7 text-[15px] leading-relaxed shadow-[0_2px_20px_rgba(0,0,0,0.04)] sm:p-10">
      <h1 className="text-3xl font-semibold tracking-tight">Disclaimer</h1>
      <p className="mt-5">
        10BONDS is a bond discovery and ranking tool. It sorts publicly available bond information by two criteria you choose.
      </p>
      <h2 className="mt-6 font-semibold">Not investment advice</h2>
      <p className="mt-2">
        Nothing on this site is investment advice, a personal recommendation, or an offer or invitation to buy or sell any security.
        10BONDS does not know your situation, goals or risk tolerance. Speak to a licensed adviser before investing.
      </p>
      <h2 className="mt-6 font-semibold">Indicative data</h2>
      <p className="mt-2">
        Yields, ratings and other figures are indicative, can be delayed or wrong, and change over time. Check every figure with your bank
        or broker before acting. Bonds can lose value and issuers can default.
      </p>
      <h2 className="mt-6 font-semibold">No execution</h2>
      <p className="mt-2">10BONDS does not hold money, place orders or manage portfolios.</p>
      <p className="mt-8 text-sm">Full text: <a href="/terms" className="text-accent">Terms of Use and Risk Disclosure</a>.</p>
    </article>
  );
}
