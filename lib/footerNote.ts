// One short regulatory line for the whole site, kept short enough to fit one line on desktop (the owner, 24/10/2026), in the page's language (plan terms live on the Pricing page).
export const FOOTER_NOTE = {
  en: "Information only, not advice or an offer. Gross returns, not guaranteed; figures are indicative. Bonds can lose value and issuers can default. The risk score is 10BONDS' internal assessment, not a credit rating.",
  it: "Solo informazione, non consulenza né offerta. Rendimenti lordi non garantiti, dati indicativi. Le obbligazioni possono perdere valore e gli emittenti fallire. Il rischio è una valutazione interna di 10BONDS, non un rating.",
  fr: "Information seulement, ni conseil ni offre. Rendements bruts non garantis, chiffres indicatifs. Une obligation peut perdre de la valeur, un émetteur faire défaut. Le risque est une estimation interne de 10BONDS, pas une notation.",
  de: "Nur Information, keine Beratung, kein Angebot. Renditen brutto, nicht garantiert, Zahlen unverbindlich. Anleihen können an Wert verlieren, Emittenten ausfallen. Das Risiko ist eine interne Einschätzung von 10BONDS, kein Rating.",
} as const;

export function footerLang(pathname: string | null): keyof typeof FOOTER_NOTE {
  const m = /^\/(it|fr|de)(\/|$)/.exec(pathname ?? "");
  return m ? (m[1] as "it" | "fr" | "de") : "en";
}

export type FooterLang = keyof typeof FOOTER_NOTE;

/** The light grey legal menu at the bottom of every page. */
export const FOOTER_LINKS: Record<FooterLang, { disclaimer: string; methodology: string; rating: string; ranking: string; selection: string; terms: string; privacy: string; cookies: string; pro: string; widget: string }> = {
  en: { disclaimer: "Disclaimer", methodology: "Methodology", rating: "Rating", ranking: "Ranking", selection: "How we pick the top 10", terms: "Terms", privacy: "Privacy & GDPR", cookies: "Cookies", pro: "For wealth managers", widget: "Free widget" },
  it: { disclaimer: "Avvertenze", methodology: "Metodologia", rating: "Rating", ranking: "Classifica", selection: "Come scegliamo le 10", terms: "Termini", privacy: "Privacy e GDPR", cookies: "Cookie", pro: "Per i gestori patrimoniali", widget: "Widget gratuito" },
  fr: { disclaimer: "Avertissement", methodology: "Méthodologie", rating: "Notation", ranking: "Classement", selection: "Comment nous choisissons les 10", terms: "Conditions", privacy: "Confidentialité et RGPD", cookies: "Cookies", pro: "Pour les gérants de patrimoine", widget: "Widget gratuit" },
  de: { disclaimer: "Haftungsausschluss", methodology: "Methodik", rating: "Rating", ranking: "Ranking", selection: "So wählen wir die Top 10", terms: "Nutzungsbedingungen", privacy: "Datenschutz und DSGVO", cookies: "Cookies", pro: "Für Vermögensverwalter", widget: "Kostenloses Widget" },
};
