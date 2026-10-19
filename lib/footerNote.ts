// One footer block for the whole site: the disclaimer and the plan terms (VAT, cancel anytime, Stripe), in the page's language.
export const FOOTER_NOTE = {
  en: "10BONDS is a bond discovery tool: information only, not investment advice, not an offer to buy or sell. The risk score (1 lowest, 10 highest) is 10BONDS' own internal assessment for information only, not a credit rating: check official ratings with the rating agencies, the issuer and your financial adviser, and do not rely on the 10BONDS risk score. Yields are indicative and can change; past performance does not guarantee future results. Prices include VAT where applicable. Plans are monthly, cancel anytime: the plan then runs to the end of the month already paid. Payments are handled by Stripe.",
  it: "10BONDS è uno strumento per trovare obbligazioni: solo informazioni, non consulenza in materia di investimenti, non un'offerta di acquisto o vendita. Il rischio (1 più basso, 10 più alto) è una valutazione interna di 10BONDS, solo informativa e non un rating di credito: verifica i rating ufficiali con le agenzie di rating, l'emittente e il tuo consulente finanziario, e non fare affidamento sul rischio di 10BONDS. I rendimenti sono indicativi e possono cambiare; i risultati passati non garantiscono quelli futuri. I prezzi includono l'IVA ove applicabile. Piani mensili, disdici quando vuoi: il piano resta attivo fino alla fine del mese già pagato. I pagamenti sono gestiti da Stripe.",
  fr: "10BONDS est un outil de recherche d'obligations : information uniquement, ni conseil en investissement, ni offre d'achat ou de vente. Le risque (1 le plus faible, 10 le plus élevé) est une évaluation interne de 10BONDS, à titre informatif, et non une notation de crédit : vérifiez les notations officielles auprès des agences de notation, de l'émetteur et de votre conseiller financier, et ne vous fiez pas au risque de 10BONDS. Les rendements sont indicatifs et peuvent changer ; les performances passées ne préjugent pas des performances futures. Les prix incluent la TVA le cas échéant. Abonnements mensuels, résiliables à tout moment : l'abonnement court jusqu'à la fin du mois déjà payé. Les paiements sont gérés par Stripe.",
  de: "10BONDS ist ein Werkzeug zum Finden von Anleihen: nur Information, keine Anlageberatung, kein Angebot zum Kauf oder Verkauf. Das Risiko (1 am geringsten, 10 am höchsten) ist eine interne Einschätzung von 10BONDS, nur zur Information und kein Kreditrating: Prüfen Sie offizielle Ratings bei den Ratingagenturen, beim Emittenten und bei Ihrem Finanzberater und verlassen Sie sich nicht auf das Risiko von 10BONDS. Renditen sind Richtwerte und können sich ändern; vergangene Ergebnisse sind keine Garantie für die Zukunft. Preise inklusive MwSt., soweit anwendbar. Monatliche Pläne, jederzeit kündbar: Der Plan läuft dann bis zum Ende des bereits bezahlten Monats. Zahlungen werden über Stripe abgewickelt.",
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
