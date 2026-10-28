import type { Locale } from "./locales";
import { pathOf } from "./locales";

// Knowledge page: the German government (Bund) yield curve, 1 to 30 years. Data: official Bundesbank curve saved by lib/bundCurve/store.ts.

export type BundCurveText = {
  slug: string; title: string; description: string; h1: string; lead: string; chartTitle: string;
  key: (d: string, y2: string, y5: string, y10: string, y30: string) => string; cta: string; faqTitle: string; faq: [string, string][];
  years: string; yearCol: string; yieldCol: string; changeCol: string; asOf: string; source: string; note: string; empty: string; wk: string;
};

export const BUND_CURVE_TEXT: Record<Locale | "en", BundCurveText> = {
  it: {
    slug: "curva-rendimenti-bund-tedeschi",
    title: "Rendimento Bund tedesco oggi: curva da 1 a 30 anni · 10BONDS",
    description: "Curva dei rendimenti dei Bund tedeschi da 1 a 30 anni, in euro: dati ufficiali della Deutsche Bundesbank, con la variazione rispetto alla settimana precedente.",
    h1: "Curva dei rendimenti dei Bund tedeschi, da 1 a 30 anni",
    lead: "La curva dei titoli di Stato tedeschi è il riferimento standard per le obbligazioni in euro. Sono rendimenti di una curva stimata dalla Bundesbank, non quotazioni di singoli Bund.",
    chartTitle: "Rendimento annualizzato per scadenza",
    years: "anni",
    yearCol: "Scadenza",
    yieldCol: "Rendimento",
    changeCol: "Var. sett.",
    asOf: "Data di riferimento",
    source: "Fonte: Deutsche Bundesbank",
    note: "Euro, rendimento annualizzato di titoli con cedola annuale, derivato dalla struttura per scadenza stimata dalla Bundesbank. Non è il rendimento osservato di un singolo Bund. Nessun dato oltre i 30 anni.",
    empty: "Dati non disponibili al momento.",
    wk: "vs settimana prec.",
    key: (d,a,b,c,e) => `Al ${d} il rendimento dei Bund tedeschi è ${a} a 2 anni, ${b} a 5 anni, ${c} a 10 anni e ${e} a 30 anni.`,
    cta: "Trova obbligazioni che rendono più dei Bund",
    faqTitle: "Domande frequenti",
    faq: [["Cos'è la curva dei rendimenti dei Bund?", "È la curva che collega il rendimento dei titoli di Stato tedeschi alle diverse scadenze, da 1 a 30 anni. È il riferimento standard per le obbligazioni in euro."], ["Da dove vengono i dati?", "Dalla Deutsche Bundesbank: sono rendimenti derivati dalla sua struttura per scadenza giornaliera dei titoli federali, senza stime o interpolazioni nostre."], ["Ogni quanto si aggiorna?", "Ogni lunedì. La data di riferimento è sempre indicata sopra il grafico."], ["Come si usa come riferimento?", "Il rendimento di un'obbligazione in euro si può confrontare con quello del Bund di pari scadenza: la differenza non è automaticamente uno spread di credito."]],
  },
  fr: {
    slug: "courbe-taux-bund-allemand",
    title: "Taux du Bund allemand aujourd'hui : courbe de 1 à 30 ans · 10BONDS",
    description: "Courbe des taux du Bund allemand de 1 à 30 ans, en euros : données officielles de la Deutsche Bundesbank, avec la variation par rapport à la semaine précédente.",
    h1: "Courbe des taux du Bund allemand, de 1 à 30 ans",
    lead: "La courbe des obligations d'État allemandes est la référence standard pour les obligations en euros. Ce sont les rendements d'une courbe estimée par la Bundesbank, pas des cotations de Bunds individuels.",
    chartTitle: "Rendement annualisé par échéance",
    years: "ans",
    yearCol: "Échéance",
    yieldCol: "Rendement",
    changeCol: "Var. sem.",
    asOf: "Date de référence",
    source: "Source : Deutsche Bundesbank",
    note: "Euro, rendement annualisé de titres à coupon annuel, dérivé de la structure par terme estimée par la Bundesbank. Ce n'est pas le rendement observé d'un Bund individuel. Aucune donnée au-delà de 30 ans.",
    empty: "Données indisponibles pour le moment.",
    wk: "vs sem. préc.",
    key: (d,a,b,c,e) => `Au ${d}, le rendement du Bund allemand est de ${a} à 2 ans, ${b} à 5 ans, ${c} à 10 ans et ${e} à 30 ans.`,
    cta: "Trouvez des obligations qui rapportent plus que le Bund",
    faqTitle: "Questions fréquentes",
    faq: [["Qu'est-ce que la courbe des taux du Bund ?", "C'est la courbe qui relie le rendement des obligations d'État allemandes aux différentes échéances, de 1 à 30 ans. C'est la référence standard pour les obligations en euros."], ["D'où viennent les données ?", "De la Deutsche Bundesbank : ce sont des rendements dérivés de sa structure par terme quotidienne des titres fédéraux, sans estimation ni interpolation de notre part."], ["À quelle fréquence est-elle mise à jour ?", "Chaque lundi. La date de référence est toujours indiquée au-dessus du graphique."], ["Comment l'utiliser comme référence ?", "Le rendement d'une obligation en euros se compare à celui du Bund de même échéance : l'écart n'est pas automatiquement un spread de crédit."]],
  },
  de: {
    slug: "bund-zinskurve-1-bis-30-jahre",
    title: "Bund-Rendite aktuell: Zinskurve 1 bis 30 Jahre · 10BONDS",
    description: "Zinskurve der Bundesanleihen von 1 bis 30 Jahren in Euro: offizielle Daten der Deutschen Bundesbank, mit der Veränderung zur Vorwoche.",
    h1: "Zinskurve der Bundesanleihen, 1 bis 30 Jahre",
    lead: "Die Kurve der deutschen Staatsanleihen ist die Standardreferenz für Euro-Anleihen. Es sind Renditen einer von der Bundesbank geschätzten Kurve, keine Kurse einzelner Bundesanleihen.",
    chartTitle: "Annualisierte Rendite je Laufzeit",
    years: "Jahre",
    yearCol: "Laufzeit",
    yieldCol: "Rendite",
    changeCol: "Änd. Woche",
    asOf: "Stichtag",
    source: "Quelle: Deutsche Bundesbank",
    note: "Euro, annualisierte Rendite von Wertpapieren mit jährlichem Kupon, abgeleitet aus der von der Bundesbank geschätzten Zinsstruktur. Nicht die beobachtete Rendite einer einzelnen Bundesanleihe. Keine Daten über 30 Jahre hinaus.",
    empty: "Derzeit keine Daten verfügbar.",
    wk: "ggü. Vorwoche",
    key: (d,a,b,c,e) => `Am ${d} liegt die Rendite der Bundesanleihen bei ${a} (2 Jahre), ${b} (5 Jahre), ${c} (10 Jahre) und ${e} (30 Jahre).`,
    cta: "Anleihen finden, die mehr als der Bund bringen",
    faqTitle: "Häufige Fragen",
    faq: [["Was ist die Bund-Zinskurve?", "Sie verbindet die Rendite deutscher Staatsanleihen über verschiedene Laufzeiten von 1 bis 30 Jahren. Sie ist die Standardreferenz für Euro-Anleihen."], ["Woher stammen die Daten?", "Von der Deutschen Bundesbank: Renditen, abgeleitet aus ihrer täglichen Zinsstrukturkurve für börsennotierte Bundeswertpapiere, ohne eigene Schätzung oder Interpolation."], ["Wie oft wird sie aktualisiert?", "Jeden Montag. Der Stichtag steht immer über dem Chart."], ["Wie nutzt man sie als Referenz?", "Die Rendite einer Euro-Anleihe lässt sich mit der des Bunds gleicher Laufzeit vergleichen: die Differenz ist nicht automatisch ein Kreditspread."]],
  },
  en: {
    slug: "german-bund-yield-curve",
    title: "German Bund yield today: yield curve 1 to 30 years · 10BONDS",
    description: "The German Bund yield curve from 1 to 30 years in euros: official Deutsche Bundesbank data, with the change versus the previous week.",
    h1: "German Bund yield curve, 1 to 30 years",
    lead: "The German government yield curve is the standard reference for euro bonds. These are yields of a curve estimated by the Bundesbank, not quotes of individual Bunds.",
    chartTitle: "Annualized yield by maturity",
    years: "years",
    yearCol: "Maturity",
    yieldCol: "Yield",
    changeCol: "Wk change",
    asOf: "Reference date",
    source: "Source: Deutsche Bundesbank",
    note: "Euro, annualized yield of annual-coupon securities, derived from the term structure estimated by the Bundesbank. Not the observed yield of an individual Bund. No data beyond 30 years.",
    empty: "Data not available right now.",
    wk: "vs previous week",
    key: (d,a,b,c,e) => `On ${d}, German Bund yields are ${a} at 2 years, ${b} at 5 years, ${c} at 10 years and ${e} at 30 years.`,
    cta: "Find bonds that pay more than the Bund",
    faqTitle: "Frequently asked questions",
    faq: [["What is the German Bund yield curve?", "It connects the yield of German government bonds across maturities from 1 to 30 years. It is the standard reference for euro bonds."], ["Where does the data come from?", "From the Deutsche Bundesbank: yields derived from its daily term structure of listed federal securities, with no estimates or interpolation of our own."], ["How often is it updated?", "Every Monday. The reference date is always shown above the chart."], ["How do I use it as a benchmark?", "A euro bond's yield can be compared with the Bund yield at the same maturity: the difference is not automatically a credit spread."]],
  },
};

const pathFor = (l: Locale | "en", slug: string) => (l === "en" ? `/knowledge/${slug}` : pathOf(l, "tools", slug));
export const bundCurvePath = (l: Locale | "en") => pathFor(l, BUND_CURVE_TEXT[l].slug);
export function bundCurveAlternates(self: Locale | "en") {
  return { canonical: bundCurvePath(self), languages: { "it-IT": bundCurvePath("it"), "fr-FR": bundCurvePath("fr"), "de-DE": bundCurvePath("de"), en: bundCurvePath("en"), "x-default": bundCurvePath("en") } };
}
