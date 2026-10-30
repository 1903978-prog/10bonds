import type { FinderLang } from "./finderText";

/** The short risk warning that sits next to every return figure (the owner, 30/10/2026). */
export const RISK_WARNING: Record<FinderLang, string> = {
  en: "Past and expected returns are not guaranteed.",
  it: "I rendimenti passati e attesi non sono garantiti.",
  fr: "Les rendements passés et attendus ne sont pas garantis.",
  de: "Vergangene und erwartete Renditen sind nicht garantiert.",
};

/** Short reasons shown instead of an empty "–" (the owner, 30/10/2026). */
export const NO_PRICE: Record<FinderLang, string> = {
  en: "no price in 5 days", it: "nessun prezzo da 5 giorni", fr: "aucun prix depuis 5 jours", de: "kein Kurs seit 5 Tagen",
};
export const NOT_STATED: Record<FinderLang, string> = {
  en: "not stated", it: "non indicato", fr: "non indiqué", de: "nicht angegeben",
};
