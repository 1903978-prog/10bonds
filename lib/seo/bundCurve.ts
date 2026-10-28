import type { Locale } from "./locales";
import { pathOf } from "./locales";

// Knowledge page: the German government yield curve, 1 to 30 years (data: lib/bundBenchmark.ts).

export type BundCurveText = {
  slug: string; title: string; description: string; h1: string; lead: string; chartTitle: string; yAxis: string;
  key: (d: string, y2: string, y5: string, y10: string, y30: string) => string; cta: string; faqTitle: string; faq: [string, string][];
  verified: string; interpolated: string; years: string; yearCol: string; yieldCol: string; statusCol: string; asOf: string; note: string;
};

export const BUND_CURVE_TEXT: Record<Locale | "en", BundCurveText> = {
  it: {
    slug: "curva-rendimenti-bund-tedeschi",
    title: "Rendimento Bund tedesco oggi: curva da 1 a 30 anni · 10BONDS",
    description: "Curva dei rendimenti dei titoli di Stato tedeschi in euro da 1 a 30 anni: il riferimento per le obbligazioni in euro. Gli anni intermedi sono stime per interpolazione lineare.",
    h1: "Curva dei rendimenti dei Bund tedeschi, da 1 a 30 anni",
    lead: "La curva dei titoli di Stato tedeschi è il riferimento standard per le obbligazioni in euro. Gli anni senza un punto verificato sono stime per interpolazione lineare, non quotazioni di mercato indipendenti.",
    key: (d,a,b,c,e) => `Al ${d} il rendimento dei Bund tedeschi è ${a} a 2 anni, ${b} a 5 anni, ${c} a 10 anni e ${e} a 30 anni.`, cta: "Trova obbligazioni che rendono più dei Bund", faqTitle: "Domande frequenti", faq: [["Cos'è la curva dei rendimenti dei Bund?","È la curva che collega il rendimento dei titoli di Stato tedeschi alle diverse scadenze, da 1 a 30 anni. È il riferimento standard per le obbligazioni in euro."],["Come sono calcolati gli anni intermedi?","Dove non c'è un punto verificato, il rendimento è stimato per interpolazione lineare tra i due punti verificati più vicini e indicato come stima."],["Ogni quanto si aggiorna?","La data di riferimento è sempre indicata sopra il grafico."],["Come si usa come riferimento?","Il rendimento di un'obbligazione in euro si può confrontare con quello del Bund di pari scadenza: la differenza è lo spread."]] as [string, string][],
    chartTitle: "Rendimento annualizzato per scadenza", yAxis: "Rendimento (%)", verified: "Punto verificato", interpolated: "Stima interpolata",
    years: "anni", yearCol: "Scadenza", yieldCol: "Rendimento", statusCol: "Dato", asOf: "Data di riferimento",
    note: "Euro, rendimento annualizzato. Curva stimata dei titoli di Stato tedeschi; gli anni intermedi sono interpolati linearmente e indicati come stime.",
  },
  fr: {
    slug: "courbe-taux-bund-allemand",
    title: "Taux du Bund allemand aujourd'hui : courbe de 1 à 30 ans · 10BONDS",
    description: "Courbe des taux des obligations d'État allemandes en euros de 1 à 30 ans : la référence des obligations en euros. Les années intermédiaires sont des estimations par interpolation linéaire.",
    h1: "Courbe des taux du Bund allemand, de 1 à 30 ans",
    lead: "La courbe des obligations d'État allemandes est la référence standard pour les obligations en euros. Les années sans point vérifié sont des estimations par interpolation linéaire, pas des cotations de marché indépendantes.",
    key: (d,a,b,c,e) => `Au ${d}, le rendement du Bund allemand est de ${a} à 2 ans, ${b} à 5 ans, ${c} à 10 ans et ${e} à 30 ans.`, cta: "Trouvez des obligations qui rapportent plus que le Bund", faqTitle: "Questions fréquentes", faq: [["Qu'est-ce que la courbe des taux du Bund ?","C'est la courbe qui relie le rendement des obligations d'État allemandes aux différentes échéances, de 1 à 30 ans. C'est la référence standard pour les obligations en euros."],["Comment sont calculées les années intermédiaires ?","Là où il n'y a pas de point vérifié, le rendement est estimé par interpolation linéaire entre les deux points vérifiés les plus proches et signalé comme estimation."],["À quelle fréquence est-elle mise à jour ?","La date de référence est toujours indiquée au-dessus du graphique."],["Comment l'utiliser comme référence ?","Le rendement d'une obligation en euros se compare à celui du Bund de même échéance : l'écart est le spread."]] as [string, string][],
    chartTitle: "Rendement annualisé par échéance", yAxis: "Rendement (%)", verified: "Point vérifié", interpolated: "Estimation interpolée",
    years: "ans", yearCol: "Échéance", yieldCol: "Rendement", statusCol: "Donnée", asOf: "Date de référence",
    note: "Euro, rendement annualisé. Courbe estimée des obligations d'État allemandes ; les années intermédiaires sont interpolées linéairement et signalées comme estimations.",
  },
  de: {
    slug: "bund-zinskurve-1-bis-30-jahre",
    title: "Bund-Rendite aktuell: Zinskurve 1 bis 30 Jahre · 10BONDS",
    description: "Zinskurve der deutschen Staatsanleihen in Euro von 1 bis 30 Jahren: die Referenz für Euro-Anleihen. Die Jahre dazwischen sind linear interpolierte Schätzwerte.",
    h1: "Zinskurve der Bundesanleihen, 1 bis 30 Jahre",
    lead: "Die Kurve der deutschen Staatsanleihen ist die Standardreferenz für Euro-Anleihen. Jahre ohne geprüften Stützpunkt sind linear interpolierte Schätzwerte, keine unabhängigen Marktkurse.",
    key: (d,a,b,c,e) => `Am ${d} liegt die Rendite der Bundesanleihen bei ${a} (2 Jahre), ${b} (5 Jahre), ${c} (10 Jahre) und ${e} (30 Jahre).`, cta: "Anleihen finden, die mehr als der Bund bringen", faqTitle: "Häufige Fragen", faq: [["Was ist die Bund-Zinskurve?","Sie verbindet die Rendite deutscher Staatsanleihen über verschiedene Laufzeiten von 1 bis 30 Jahren. Sie ist die Standardreferenz für Euro-Anleihen."],["Wie werden die Jahre dazwischen berechnet?","Wo es keinen geprüften Stützpunkt gibt, wird die Rendite linear zwischen den beiden nächsten geprüften Punkten geschätzt und als Schätzwert gekennzeichnet."],["Wie oft wird sie aktualisiert?","Der Stichtag steht immer über dem Chart."],["Wie nutzt man sie als Referenz?","Die Rendite einer Euro-Anleihe lässt sich mit der des Bunds gleicher Laufzeit vergleichen: die Differenz ist der Spread."]] as [string, string][],
    chartTitle: "Annualisierte Rendite je Laufzeit", yAxis: "Rendite (%)", verified: "Geprüfter Wert", interpolated: "Interpolierter Schätzwert",
    years: "Jahre", yearCol: "Laufzeit", yieldCol: "Rendite", statusCol: "Wert", asOf: "Stichtag",
    note: "Euro, annualisierte Rendite. Geschätzte Kurve deutscher Staatsanleihen; die Jahre dazwischen sind linear interpoliert und als Schätzwerte gekennzeichnet.",
  },
  en: {
    slug: "german-bund-yield-curve",
    title: "German Bund yield today: yield curve 1 to 30 years · 10BONDS",
    description: "The German government yield curve in euros from 1 to 30 years: the standard reference for euro bonds. Years between verified points are linearly interpolated estimates.",
    h1: "German Bund yield curve, 1 to 30 years",
    lead: "The German government yield curve is the standard reference for euro-denominated bonds. Years without a verified point are linearly interpolated estimates, not independent market quotes.",
    key: (d,a,b,c,e) => `On ${d}, German Bund yields are ${a} at 2 years, ${b} at 5 years, ${c} at 10 years and ${e} at 30 years.`, cta: "Find bonds that pay more than the Bund", faqTitle: "Frequently asked questions", faq: [["What is the German Bund yield curve?","It connects the yield of German government bonds across maturities from 1 to 30 years. It is the standard reference for euro bonds."],["How are the years in between calculated?","Where there is no verified point, the yield is estimated by linear interpolation between the two nearest verified points and labelled as an estimate."],["How often is it updated?","The reference date is always shown above the chart."],["How do I use it as a benchmark?","A euro bond's yield can be compared with the Bund yield at the same maturity: the difference is the spread."]] as [string, string][],
    chartTitle: "Annualized yield by maturity", yAxis: "Yield (%)", verified: "Verified point", interpolated: "Interpolated estimate",
    years: "years", yearCol: "Maturity", yieldCol: "Yield", statusCol: "Data", asOf: "Reference date",
    note: "Euro, annualized yield. Fitted curve of German government bonds; years in between are linearly interpolated and labelled as estimates.",
  },
};

const pathFor = (l: Locale | "en", slug: string) => (l === "en" ? `/knowledge/${slug}` : pathOf(l, "tools", slug));
export const bundCurvePath = (l: Locale | "en") => pathFor(l, BUND_CURVE_TEXT[l].slug);
export function bundCurveAlternates(self: Locale | "en") {
  return { canonical: bundCurvePath(self), languages: { "it-IT": bundCurvePath("it"), "fr-FR": bundCurvePath("fr"), "de-DE": bundCurvePath("de"), en: bundCurvePath("en"), "x-default": bundCurvePath("en") } };
}
