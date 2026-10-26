import type { Metadata } from "next";
import Link from "next/link";
import { PRO_TRIAL_DAYS } from "@/lib/pro";
import { euro, priceCents } from "@/lib/plans";

export const metadata: Metadata = {
  title: "Business terms for Pro · 10BONDS",
  description: "Business terms for the 10BONDS Pro plan: who may use it, the free trial, payment, data, liability and governing law.",
  alternates: { canonical: "/pro/terms" },
};

const SECTIONS: [string, string][] = [
  ["Who these terms are for", "These terms apply to the Pro plan and the Bond Replacement Engine. They are offered only to businesses and professionals acting for their firm: investment firms, wealth managers, family offices and similar. They are not offered to consumers, and the consumer right of withdrawal does not apply. They add to the general Terms of Use and Risk Disclosure, which also apply; if the two differ, these business terms win for Pro."],
  ["Provider", "SQUARE ONE OÜ, a company registered in Estonia (registry code 14035002, VAT number EE102234240), Männimäe/1, Pudisoo küla, Kuusalu vald, 74626 Harju maakond, Estonia."],
  ["Verification", "To open Pro you give your firm name, regulator and registration number, and confirm that the firm is authorised to provide investment services. We check these against the public register of the regulator and may ask for more. We may refuse or withdraw access if details cannot be matched or are found to be wrong. You must keep the details true and tell us if the authorisation ends."],
  ["Free trial", `Once verified you get a free trial of ${PRO_TRIAL_DAYS} days, once per firm. No card is taken. The trial ends by itself; nothing is charged and nothing renews unless you choose to subscribe.`],
  ["Price and payment", `Pro costs ${euro(priceCents("pro", "month"))} a month, charged in advance through our payment provider Stripe until you cancel. Prices are shown with VAT where VAT applies; business customers in the EU can enter a valid VAT number at checkout and the invoice is made out to the firm. You can cancel at any time on your profile page, and the plan runs to the end of the period already paid. Fees already paid are not refunded for the remaining days.`],
  ["What the tool is, and is not", "The engine applies fixed screening rules to indicative, end-of-day bond data and shows the result. It is information for professionals. It is not investment advice, not a personal recommendation, not portfolio management and not an execution service. It does not know your client’s objectives, tax position, restrictions or the actual price and liquidity of a bond. You remain solely responsible for suitability, best execution, product governance and every decision and trade."],
  ["Your portfolio data", "Files you upload are processed to produce the result and are not stored. Do not upload personal data of your clients: ISIN codes and amounts are enough. You are responsible for having the right to use the data you upload."],
  ["Use of results", "You may use the results inside your firm and for your own client files. You may not resell the tool, the data or the results, scrape the service, or give your login to anyone outside your firm."],
  ["Availability and data", "We work to keep the service and data accurate and available, but give them as they are. Bond data comes from third parties and may be late, incomplete or wrong. We may change the rules or data with notice on the site."],
  ["Liability", "Nothing limits liability that cannot be limited by law. Otherwise, our liability to you is limited to the fees you paid for Pro in the 12 months before the event, and we are not liable for lost profit, trading losses or indirect loss."],
  ["Governing law", "These terms are governed by the law of Estonia. The courts of Harju County, Estonia, have jurisdiction, unless mandatory rules say otherwise."],
];

export default function ProTerms() {
  return (
    <article className="mx-auto max-w-3xl rounded-lg border border-line bg-white p-7 sm:p-10" data-testid="pro-terms">
      <Link href="/pro" className="text-sm text-accent">← Pro</Link>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Business terms for Pro</h1>
      <p className="mt-1 text-sm text-mute">Version 26 October 2026.</p>
      {SECTIONS.map(([h, p], i) => (
        <section key={h} className="mt-6">
          <h2 className="text-[17px] font-semibold">{i + 1}. {h}</h2>
          <p className="mt-1 text-[15px] leading-relaxed text-ink/80">{p}</p>
        </section>
      ))}
    </article>
  );
}
