import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Disclaimer · 10BONDS", alternates: { canonical: "/disclaimer" } };

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
        Yields, risk scores and other figures are indicative, can be delayed or wrong, and change over time. Check every figure with your bank
        or broker before acting. Bonds can lose value and issuers can default.
      </p>
      <h2 className="mt-6 font-semibold" id="risk-score">The risk score is not a credit rating</h2>
      <p className="mt-2">
        The risk score from 1 (lowest) to 10 (highest) is 10BONDS&apos; own internal assessment, provided for information only. It is not a credit
        rating and 10BONDS is not a credit rating agency. Check official ratings with the rating agencies, the issuer and your financial adviser,
        and do not rely on the 10BONDS risk score.
      </p>
      <p className="mt-2 text-sm" lang="it">Il rischio da 1 (più basso) a 10 (più alto) è una valutazione interna di 10BONDS, solo informativa, e non un rating di credito. Verifica i rating ufficiali con le agenzie di rating, l&apos;emittente e il tuo consulente finanziario, e non fare affidamento sul rischio di 10BONDS.</p>
      <p className="mt-2 text-sm" lang="fr">Le risque de 1 (le plus faible) à 10 (le plus élevé) est une évaluation interne de 10BONDS, à titre informatif uniquement, et non une notation de crédit. Vérifiez les notations officielles auprès des agences de notation, de l&apos;émetteur et de votre conseiller financier, et ne vous fiez pas au risque de 10BONDS.</p>
      <p className="mt-2 text-sm" lang="de">Das Risiko von 1 (am geringsten) bis 10 (am höchsten) ist eine interne Einschätzung von 10BONDS, nur zur Information, und kein Kreditrating. Prüfen Sie offizielle Ratings bei den Ratingagenturen, beim Emittenten und bei Ihrem Finanzberater und verlassen Sie sich nicht auf das Risiko von 10BONDS.</p>
      <h2 className="mt-6 font-semibold">No execution</h2>
      <p className="mt-2">10BONDS does not hold money, place orders or manage portfolios.</p>
      <p className="mt-8 text-sm">Full text: <Link href="/terms" className="text-accent">Terms of Use and Risk Disclosure</Link>.</p>
    </article>
  );
}
