import type { PublicBond } from "../types";
import { bondRisk, RISK_MAX, RISK_MIN } from "../ratings";
import type { Locale } from "./locales";
import { pathOf } from "./locales";

// The bond map (the owner, 19/10/2026): every rated bond the site shows, all currencies, counted by years to maturity
// and risk 1-10, with the highest and the median yield in each cell. Rebuilt from the bond copy every time it is read.

/** Years-to-maturity buckets: [from, to) in years; the last one is open-ended. */
export const MATURITY_BUCKETS: { label: string; lo: number; hi: number }[] = [
  { label: "0-1", lo: 0, hi: 1 },
  { label: "1-2", lo: 1, hi: 2 },
  { label: "2-3", lo: 2, hi: 3 },
  { label: "3-5", lo: 3, hi: 5 },
  { label: "5-7", lo: 5, hi: 7 },
  { label: "7-10", lo: 7, hi: 10 },
  { label: "10-15", lo: 10, hi: 15 },
  { label: "15+", lo: 15, hi: Infinity },
];
export const RISKS = Array.from({ length: RISK_MAX - RISK_MIN + 1 }, (_, i) => RISK_MIN + i);

export type MapCell = { bonds: number; max: number | null; median: number | null };
export type BondMap = { bonds: number; noMaturity: number; rows: MapCell[][] }; // rows[bucket][risk - 1]

const round2 = (v: number) => Math.round(v * 100) / 100;
function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return round2(s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2);
}

const YEAR_MS = 365.25 * 86_400_000;

/** Count, max and median gross YTM per maturity bucket and risk. Bonds without a maturity date (perpetuals) are counted apart. */
export function bondMap(bonds: PublicBond[], now = new Date()): BondMap {
  const ytms: number[][][] = MATURITY_BUCKETS.map(() => RISKS.map(() => []));
  let placed = 0;
  let noMaturity = 0;
  for (const b of bonds) {
    const risk = bondRisk(b);
    if (risk === null || b.grossYtm === null) continue;
    if (!b.maturity) { noMaturity++; continue; }
    const years = (Date.parse(b.maturity) - now.getTime()) / YEAR_MS;
    const i = MATURITY_BUCKETS.findIndex((x) => years >= x.lo && years < x.hi);
    if (i < 0) continue;
    ytms[i][risk - RISK_MIN].push(b.grossYtm);
    placed++;
  }
  return {
    bonds: placed,
    noMaturity,
    rows: ytms.map((row) => row.map((xs) => ({ bonds: xs.length, max: xs.length ? round2(Math.max(...xs)) : null, median: median(xs) }))),
  };
}

export type BondMapText = {
  slug: string; title: string; description: string; h1: string; lead: string;
  all: string; maturity: string; years: string; risk: string; lower: string; higher: string;
  legend: [string, string, string]; // bonds, median YTM, max YTM
  coverage: (shown: string, total: string) => string;
  unrated: (n: string) => string;
  noYield: (n: string) => string;
  noMaturity: (n: string) => string;
  note: string; empty: string;
};

export const BOND_MAP_TEXT: Record<Locale | "en", BondMapText> = {
  it: {
    slug: "mappa-obbligazioni-scadenza-rischio",
    title: "Obbligazioni per scadenza e rischio: rendimenti massimi e mediani · 10BONDS",
    description: "Quante obbligazioni ci sono per scadenza e livello di rischio, con il rendimento massimo e mediano di ciascun gruppo. Tutte le obbligazioni con rating, ricalcolate ogni giorno.",
    h1: "Obbligazioni per scadenza e rischio",
    lead: "Tutte le obbligazioni con rating nel nostro database, per anni alla scadenza e rischio 1-10.",
    all: "Tutte", maturity: "Scadenza", years: "anni", risk: "Rischio", lower: "più basso", higher: "più alto",
    legend: ["obbligazioni", "rendimento mediano", "rendimento massimo"],
    coverage: (s, t) => `${s} obbligazioni su ${t} nel database.`,
    unrated: (n) => `${n} senza rating escluse.`,
    noYield: (n) => `${n} senza rendimento attuale.`,
    noMaturity: (n) => `${n} perpetue (senza scadenza) non incluse.`,
    note: "Rendimenti a scadenza lordi e indicativi. Il rischio da 1 a 10 è la valutazione interna di 10BONDS. Non è una consulenza.",
    empty: "Nessun dato disponibile al momento.",
  },
  fr: {
    slug: "carte-obligations-echeance-risque",
    title: "Obligations par échéance et risque : rendements maximum et médian · 10BONDS",
    description: "Combien d'obligations par échéance et niveau de risque, avec le rendement maximum et médian de chaque groupe. Toutes les obligations notées, recalculées chaque jour.",
    h1: "Obligations par échéance et risque",
    lead: "Toutes les obligations notées de notre base, par années jusqu'à l'échéance et risque 1-10.",
    all: "Toutes", maturity: "Échéance", years: "ans", risk: "Risque", lower: "plus faible", higher: "plus élevé",
    legend: ["obligations", "rendement médian", "rendement maximum"],
    coverage: (s, t) => `${s} obligations sur ${t} dans la base.`,
    unrated: (n) => `${n} non notées exclues.`,
    noYield: (n) => `${n} sans rendement actuel.`,
    noMaturity: (n) => `${n} perpétuelles (sans échéance) non incluses.`,
    note: "Rendements à l'échéance bruts et indicatifs. Le risque de 1 à 10 est l'évaluation interne de 10BONDS. Pas un conseil.",
    empty: "Aucune donnée disponible pour le moment.",
  },
  de: {
    slug: "anleihen-karte-laufzeit-risiko",
    title: "Anleihen nach Laufzeit und Risiko: höchste und mittlere Rendite · 10BONDS",
    description: "Wie viele Anleihen es je Laufzeit und Risikostufe gibt, mit der höchsten und der mittleren Rendite jeder Gruppe. Alle Anleihen mit Rating, täglich neu berechnet.",
    h1: "Anleihen nach Laufzeit und Risiko",
    lead: "Alle Anleihen mit Rating in unserer Datenbank, nach Jahren bis Fälligkeit und Risiko 1-10.",
    all: "Alle", maturity: "Laufzeit", years: "Jahre", risk: "Risiko", lower: "niedriger", higher: "höher",
    legend: ["Anleihen", "Median-Rendite", "höchste Rendite"],
    coverage: (s, t) => `${s} von ${t} Anleihen in der Datenbank.`,
    unrated: (n) => `${n} ohne Rating ausgenommen.`,
    noYield: (n) => `${n} ohne aktuelle Rendite.`,
    noMaturity: (n) => `${n} ewige Anleihen (ohne Fälligkeit) nicht enthalten.`,
    note: "Bruttorenditen bis Fälligkeit, unverbindlich. Das Risiko von 1 bis 10 ist die interne Bewertung von 10BONDS. Keine Beratung.",
    empty: "Derzeit keine Daten verfügbar.",
  },
  en: {
    slug: "bonds-by-maturity-and-risk",
    title: "Bonds by maturity and risk: highest and median yields · 10BONDS",
    description: "How many bonds there are for each maturity and risk level, with the highest and median yield of each group. Every rated bond, recalculated daily.",
    h1: "Bonds by maturity and risk",
    lead: "Every rated bond in our database, by years to maturity and risk 1-10.",
    all: "All", maturity: "Maturity", years: "years", risk: "Risk", lower: "lower", higher: "higher",
    legend: ["bonds", "median yield", "highest yield"],
    coverage: (s, t) => `${s} of ${t} bonds in the database.`,
    unrated: (n) => `${n} unrated bonds left out.`,
    noYield: (n) => `${n} without a current yield.`,
    noMaturity: (n) => `${n} perpetual bonds (no maturity date) not included.`,
    note: "Gross, indicative yields to maturity. Risk 1 to 10 is 10BONDS' internal assessment. Not advice.",
    empty: "No data available right now.",
  },
};

const pathFor = (l: Locale | "en", slug: string) => (l === "en" ? `/knowledge/${slug}` : pathOf(l, "tools", slug));
export const bondMapPath = (l: Locale | "en") => pathFor(l, BOND_MAP_TEXT[l].slug);
export function bondMapAlternates(self: Locale | "en") {
  return { canonical: bondMapPath(self), languages: { "it-IT": bondMapPath("it"), "fr-FR": bondMapPath("fr"), "de-DE": bondMapPath("de"), en: bondMapPath("en"), "x-default": bondMapPath("en") } };
}
