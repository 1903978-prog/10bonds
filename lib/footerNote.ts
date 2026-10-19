// One footer block for the whole site: the disclaimer and the plan terms (VAT, cancel anytime, Stripe), in the page's language.
export const FOOTER_NOTE = {
  en: "10BONDS is a bond discovery tool: information only, not investment advice, not an offer to buy or sell. Yields are indicative and can change; past performance does not guarantee future results. Prices include VAT where applicable. Plans are monthly, cancel anytime: the plan then runs to the end of the month already paid. Payments are handled by Stripe.",
  it: "10BONDS è uno strumento per trovare obbligazioni: solo informazioni, non consulenza in materia di investimenti, non un'offerta di acquisto o vendita. I rendimenti sono indicativi e possono cambiare; i risultati passati non garantiscono quelli futuri. I prezzi includono l'IVA ove applicabile. Piani mensili, disdici quando vuoi: il piano resta attivo fino alla fine del mese già pagato. I pagamenti sono gestiti da Stripe.",
  fr: "10BONDS est un outil de recherche d'obligations : information uniquement, ni conseil en investissement, ni offre d'achat ou de vente. Les rendements sont indicatifs et peuvent changer ; les performances passées ne préjugent pas des performances futures. Les prix incluent la TVA le cas échéant. Abonnements mensuels, résiliables à tout moment : l'abonnement court jusqu'à la fin du mois déjà payé. Les paiements sont gérés par Stripe.",
  de: "10BONDS ist ein Werkzeug zum Finden von Anleihen: nur Information, keine Anlageberatung, kein Angebot zum Kauf oder Verkauf. Renditen sind Richtwerte und können sich ändern; vergangene Ergebnisse sind keine Garantie für die Zukunft. Preise inklusive MwSt., soweit anwendbar. Monatliche Pläne, jederzeit kündbar: Der Plan läuft dann bis zum Ende des bereits bezahlten Monats. Zahlungen werden über Stripe abgewickelt.",
} as const;

export function footerLang(pathname: string | null): keyof typeof FOOTER_NOTE {
  const m = /^\/(it|fr|de)(\/|$)/.exec(pathname ?? "");
  return m ? (m[1] as "it" | "fr" | "de") : "en";
}
