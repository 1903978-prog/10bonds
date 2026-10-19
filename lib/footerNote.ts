// One short regulatory line for the whole site, in the page's language (plan terms live on the Pricing page).
export const FOOTER_NOTE = {
  en: "Information only, not investment advice. The risk score is 10BONDS' internal assessment, not a credit rating.",
  it: "Solo informazione, non è consulenza finanziaria. Il rischio è una valutazione interna di 10BONDS, non un rating.",
  fr: "Information uniquement, pas un conseil en investissement. Le risque est une évaluation interne de 10BONDS, pas une notation.",
  de: "Nur Information, keine Anlageberatung. Das Risiko ist eine interne Einschätzung von 10BONDS, kein Rating.",
} as const;

export function footerLang(pathname: string | null): keyof typeof FOOTER_NOTE {
  const m = /^\/(it|fr|de)(\/|$)/.exec(pathname ?? "");
  return m ? (m[1] as "it" | "fr" | "de") : "en";
}

export type FooterLang = keyof typeof FOOTER_NOTE;

/** The light grey legal menu at the bottom of every page. */
export const FOOTER_LINKS: Record<FooterLang, { disclaimer: string; terms: string; privacy: string; cookies: string; settings: string; pro: string; widget: string }> = {
  en: { disclaimer: "Disclaimer", terms: "Terms", privacy: "Privacy & GDPR", cookies: "Cookies", settings: "Cookie settings", pro: "For wealth managers", widget: "Free widget" },
  it: { disclaimer: "Avvertenze", terms: "Termini", privacy: "Privacy e GDPR", cookies: "Cookie", settings: "Impostazioni cookie", pro: "Per i gestori patrimoniali", widget: "Widget gratuito" },
  fr: { disclaimer: "Avertissement", terms: "Conditions", privacy: "Confidentialité et RGPD", cookies: "Cookies", settings: "Paramètres des cookies", pro: "Pour les gérants de patrimoine", widget: "Widget gratuit" },
  de: { disclaimer: "Haftungsausschluss", terms: "Nutzungsbedingungen", privacy: "Datenschutz und DSGVO", cookies: "Cookies", settings: "Cookie-Einstellungen", pro: "Für Vermögensverwalter", widget: "Kostenloses Widget" },
};
