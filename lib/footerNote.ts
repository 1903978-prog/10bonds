// One footer block for the whole site: the disclaimer and the plan terms (VAT, cancel anytime, Stripe), in the page's language.
export const FOOTER_NOTE = {
  en: "Information only: not investment advice or an offer. Yields are indicative. The risk score is 10BONDS' internal assessment, not a credit rating: check official ratings with the agencies, the issuer and your adviser. Prices incl. VAT · monthly plans, cancel anytime · payments by Stripe.",
  it: "Solo informazione: non è consulenza né un'offerta. Rendimenti indicativi. Il rischio è una valutazione interna di 10BONDS, non un rating: verifica i rating ufficiali con le agenzie, l'emittente e il tuo consulente. Prezzi IVA inclusa · piani mensili, disdetta quando vuoi · pagamenti con Stripe.",
  fr: "Information uniquement : ni conseil ni offre. Rendements indicatifs. Le risque est une évaluation interne de 10BONDS, pas une notation : vérifiez les notations officielles auprès des agences, de l'émetteur et de votre conseiller. Prix TTC (TVA incluse) · abonnements mensuels, résiliables à tout moment · paiements par Stripe.",
  de: "Nur Information: keine Anlageberatung und kein Angebot. Renditen sind Richtwerte. Das Risiko ist eine interne Einschätzung von 10BONDS, kein Rating: Prüfen Sie offizielle Ratings bei den Agenturen, dem Emittenten und Ihrem Berater. Preise inkl. MwSt. · monatliche Pläne, jederzeit kündbar · Zahlung über Stripe.",
} as const;

export function footerLang(pathname: string | null): keyof typeof FOOTER_NOTE {
  const m = /^\/(it|fr|de)(\/|$)/.exec(pathname ?? "");
  return m ? (m[1] as "it" | "fr" | "de") : "en";
}

export type FooterLang = keyof typeof FOOTER_NOTE;

/** The light grey legal menu at the bottom of every page. */
export const FOOTER_LINKS: Record<FooterLang, { disclaimer: string; terms: string; privacy: string; cookies: string; settings: string; pro: string }> = {
  en: { disclaimer: "Disclaimer", terms: "Terms", privacy: "Privacy & GDPR", cookies: "Cookies", settings: "Cookie settings", pro: "For wealth managers" },
  it: { disclaimer: "Avvertenze", terms: "Termini", privacy: "Privacy e GDPR", cookies: "Cookie", settings: "Impostazioni cookie", pro: "Per i gestori patrimoniali" },
  fr: { disclaimer: "Avertissement", terms: "Conditions", privacy: "Confidentialité et RGPD", cookies: "Cookies", settings: "Paramètres des cookies", pro: "Pour les gérants de patrimoine" },
  de: { disclaimer: "Haftungsausschluss", terms: "Nutzungsbedingungen", privacy: "Datenschutz und DSGVO", cookies: "Cookies", settings: "Cookie-Einstellungen", pro: "Für Vermögensverwalter" },
};
