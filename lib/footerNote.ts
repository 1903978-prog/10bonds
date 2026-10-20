// One short regulatory line for the whole site, in the page's language (plan terms live on the Pricing page).
export const FOOTER_NOTE = {
  en: "Information and education only, not investment advice or an offer to buy or sell. Gross yields; all figures and examples are indicative. Bonds can lose value and issuers can default. The risk score is 10BONDS' internal assessment, not a credit rating.",
  it: "Solo informazione ed educazione, non è consulenza finanziaria né un'offerta di acquisto o vendita. Rendimenti lordi; dati ed esempi indicativi. Le obbligazioni possono perdere valore e gli emittenti fallire. Il rischio è una valutazione interna di 10BONDS, non un rating.",
  fr: "Information et pédagogie, ni conseil en investissement ni offre d'achat ou de vente. Rendements bruts ; chiffres et exemples indicatifs. Une obligation peut perdre de la valeur, un émetteur faire défaut. Le risque est une évaluation interne de 10BONDS, pas une notation.",
  de: "Nur Information und Bildung, keine Anlageberatung und kein Angebot zum Kauf oder Verkauf. Renditen brutto; Zahlen und Beispiele unverbindlich. Anleihen können an Wert verlieren, Emittenten können ausfallen. Das Risiko ist eine interne Einschätzung von 10BONDS, kein Rating.",
} as const;

export function footerLang(pathname: string | null): keyof typeof FOOTER_NOTE {
  const m = /^\/(it|fr|de)(\/|$)/.exec(pathname ?? "");
  return m ? (m[1] as "it" | "fr" | "de") : "en";
}

export type FooterLang = keyof typeof FOOTER_NOTE;

/** The light grey legal menu at the bottom of every page. */
export const FOOTER_LINKS: Record<FooterLang, { disclaimer: string; methodology: string; ranking: string; selection: string; terms: string; privacy: string; cookies: string; settings: string; pro: string; widget: string }> = {
  en: { disclaimer: "Disclaimer", methodology: "Rating methodology", ranking: "Ranking methodology", selection: "How we pick the top 10", terms: "Terms", privacy: "Privacy & GDPR", cookies: "Cookies", settings: "Cookie settings", pro: "For wealth managers", widget: "Free widget" },
  it: { disclaimer: "Avvertenze", methodology: "Metodologia del rating", ranking: "Metodologia della classifica", selection: "Come scegliamo le 10", terms: "Termini", privacy: "Privacy e GDPR", cookies: "Cookie", settings: "Impostazioni cookie", pro: "Per i gestori patrimoniali", widget: "Widget gratuito" },
  fr: { disclaimer: "Avertissement", methodology: "Méthodologie de notation", ranking: "Méthodologie du classement", selection: "Comment nous choisissons les 10", terms: "Conditions", privacy: "Confidentialité et RGPD", cookies: "Cookies", settings: "Paramètres des cookies", pro: "Pour les gérants de patrimoine", widget: "Widget gratuit" },
  de: { disclaimer: "Haftungsausschluss", methodology: "Rating-Methodik", ranking: "Ranking-Methodik", selection: "So wählen wir die Top 10", terms: "Nutzungsbedingungen", privacy: "Datenschutz und DSGVO", cookies: "Cookies", settings: "Cookie-Einstellungen", pro: "Für Vermögensverwalter", widget: "Kostenloses Widget" },
};
