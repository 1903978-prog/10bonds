import { JsonLd, prose } from "@/components/seo/Seo";
import { CALC_EXTRA_HTML, type CalcLocale } from "@/lib/seo/calculatorExtras";
import { faqFromHtml, sanitizeHtml } from "@/lib/seo/sanitize";

/** The text under the yield calculator (how to use it, a worked example, FAQ) with its FAQPage markup. */
export default function CalculatorExtras({ locale }: { locale: CalcLocale }) {
  const html = sanitizeHtml(CALC_EXTRA_HTML[locale]);
  const faq = faqFromHtml(html);
  return (
    <>
      <section className={`mt-8 rounded-lg border border-line bg-white p-6 sm:p-10 ${prose}`} dangerouslySetInnerHTML={{ __html: html }} />
      {faq.length > 0 && (
        <JsonLd data={{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }} />
      )}
    </>
  );
}
