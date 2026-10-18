import type { Locale } from "./locales";

// Knowledge Center plan from Livio's market research (2026-10-18): six sections, a first wave of 18 pages, and a
// transparent Opportunity Score per keyword. Search volumes are third-party estimates with their source and date;
// nothing here is invented, and unknown inputs stay unknown.

export const KC_SECTIONS = {
  best: "Best bonds",
  government: "Government bonds",
  calculators: "Calculators",
  brokers: "Brokers & Fees",
  risk: "Risk & Ratings",
  academy: "Bond Academy",
} as const;
export type KcSection = keyof typeof KC_SECTIONS;
export const isKcSection = (v: unknown): v is KcSection => typeof v === "string" && v in KC_SECTIONS;

/** Livio's effort split for Knowledge Management work. */
export const EFFORT_SPLIT = [
  { label: "Comparison & best-bonds pages", share: 40 },
  { label: "Calculators", share: 20 },
  { label: "Government bond pages", share: 15 },
  { label: "Brokers & fees", share: 15 },
  { label: "Academy guides", share: 10 },
];

/** Brokers & Fees pages are built and published from Admin -> Brokers (lib/brokers); this plan only links to them. */
export const BROKERS_OWNER = "Bond broker fee comparison thread";

export type PageKind = "comparison" | "guide" | "calculator" | "broker";
export type WavePage = {
  market: Locale;
  title: string;
  section: KcSection;
  keyword: string;
  kind: PageKind;
  /** comparison id, guide slug or calculator slug; null when the page does not exist yet. */
  ref: string | null;
  path: string | null;
};

const p = (market: Locale, title: string, section: KcSection, keyword: string, kind: PageKind, ref: string | null, path: string | null): WavePage =>
  ({ market, title, section, keyword, kind, ref, path });

export const FIRST_WAVE: WavePage[] = [
  p("it", "Migliori obbligazioni 2026", "best", "migliori obbligazioni 2026", "comparison", "best", "/it/obbligazioni/migliori-obbligazioni"),
  p("it", "Rendimenti BTP oggi", "government", "rendimenti btp", "comparison", "gov-it", "/it/obbligazioni/btp"),
  p("it", "Calcolo rendimento netto BTP", "calculators", "btp rendimento netto", "calculator", "rendimento-netto-btp", "/it/calcolatori/rendimento-netto-btp"),
  p("it", "Migliori broker obbligazioni", "brokers", "migliori broker obbligazioni", "broker", null, "/it/broker-obbligazioni"),
  p("it", "BTP vs ETF obbligazionari", "academy", "btp o etf obbligazionari", "guide", "btp-o-etf-obbligazionari", "/it/guide/btp-o-etf-obbligazionari"),
  p("it", "Obbligazioni scadenza 2031", "best", "obbligazioni scadenza 2031", "comparison", "maturity-2031", "/it/obbligazioni/scadenza-2031"),
  p("fr", "Meilleures obligations 2026", "best", "meilleures obligations 2026", "comparison", "best", "/fr/obligations/meilleures-obligations"),
  p("fr", "Rendement OAT 10 ans", "government", "rendement oat 10 ans", "comparison", "gov-fr", "/fr/obligations/oat"),
  p("fr", "Calcul rendement actuariel", "calculators", "calcul rendement actuariel", "calculator", "rendement-actuariel", "/fr/calculateurs/rendement-actuariel"),
  p("fr", "Meilleurs courtiers obligations", "brokers", "meilleur courtier obligations", "broker", null, "/fr/courtiers-obligations"),
  p("fr", "Obligations ou ETF", "academy", "obligations ou etf", "guide", "obligations-ou-etf", "/fr/guides/obligations-ou-etf"),
  p("fr", "Acheter des OAT en direct", "government", "acheter des oat", "guide", "acheter-des-oat", "/fr/guides/acheter-des-oat"),
  p("de", "Beste Anleihen 2026", "best", "beste anleihen 2026", "comparison", "best", "/de/anleihen/beste-anleihen"),
  p("de", "Bundesanleihen Rendite", "government", "bundesanleihen rendite", "comparison", "gov-de", "/de/anleihen/bundesanleihen"),
  p("de", "Anleihen Rendite berechnen", "calculators", "anleihen rendite berechnen", "calculator", "anleihen-rendite-berechnen", "/de/rechner/anleihen-rendite-berechnen"),
  p("de", "Beste Broker für Anleihen", "brokers", "anleihen broker", "broker", null, "/de/anleihen-broker"),
  p("de", "Anleihen vs Festgeld", "academy", "anleihen oder festgeld", "guide", "anleihen-oder-festgeld", "/de/ratgeber/anleihen-oder-festgeld"),
  p("de", "Anleihen ETF oder Einzelanleihen", "academy", "anleihen etf oder einzelanleihen", "guide", "anleihen-etf-oder-einzelanleihen", "/de/ratgeber/anleihen-etf-oder-einzelanleihen"),
];

// ---------- Opportunity Score ----------

export type Potential = "high" | "medium" | "low";
export type OpportunityInput = {
  volume: number | null;
  difficulty: number | null; // 0-100 from a keyword tool
  intent: string;
  potential: Potential | null; // admin's judgement: chance of tool searches, sign-ups, subscriptions
  position: number | null; // Search Console average position
  impressions: number | null; // Search Console, null when not connected
  verifiedAt: string | null; // yyyy-mm-dd, last time the inputs were checked
};

export type Factor = { id: string; label: string; weight: number; points: number | null; note: string };
export type Opportunity = { score: number | null; coverage: number; factors: Factor[] };

export const OPPORTUNITY_WEIGHTS = { demand: 30, competition: 15, intent: 15, business: 20, ranking: 10, freshness: 10 };
const VOLUME_TOP = 30_000; // monthly searches that earn full demand points

/**
 * Knowledge Management Opportunity Score, 0-100. Six factors with fixed weights (above). A factor with no data scores
 * nothing and is listed as missing; the score is computed on the known factors only and shown with its coverage
 * (share of weight known), so a keyword with little data is never ranked high by guesswork.
 */
export function opportunity(k: OpportunityInput, today = new Date()): Opportunity {
  const W = OPPORTUNITY_WEIGHTS;
  const f: Factor[] = [];
  f.push(
    k.volume === null
      ? { id: "demand", label: "Search demand", weight: W.demand, points: null, note: "No reliable volume yet." }
      : { id: "demand", label: "Search demand", weight: W.demand, points: Math.min(W.demand, (W.demand * Math.log10(Math.max(1, k.volume))) / Math.log10(VOLUME_TOP)), note: `${k.volume.toLocaleString("en-GB")} searches a month (log scale, ${VOLUME_TOP.toLocaleString("en-GB")}+ = full).` },
  );
  f.push(
    k.difficulty === null
      ? { id: "competition", label: "Competition", weight: W.competition, points: null, note: "No difficulty score yet." }
      : { id: "competition", label: "Competition", weight: W.competition, points: W.competition * (1 - k.difficulty / 100), note: `Difficulty ${k.difficulty}/100.` },
  );
  const intentShare: Record<string, number> = { transactional: 1, commercial: 1, informational: 0.55, navigational: 0.2 };
  f.push({ id: "intent", label: "Intent", weight: W.intent, points: W.intent * (intentShare[k.intent] ?? 0.5), note: `${k.intent} (commercial and transactional score highest).` });
  const potShare: Record<Potential, number> = { high: 1, medium: 0.6, low: 0.2 };
  f.push(
    k.potential === null
      ? { id: "business", label: "App potential", weight: W.business, points: null, note: "Not judged yet (searches, sign-ups, subscriptions)." }
      : { id: "business", label: "App potential", weight: W.business, points: W.business * potShare[k.potential], note: `${k.potential} chance of leading to searches, sign-ups or subscriptions.` },
  );
  if (k.impressions === null) f.push({ id: "ranking", label: "Current ranking", weight: W.ranking, points: null, note: "Search Console not connected." });
  else {
    const pos = k.position;
    const [share, why] = pos === null || k.impressions === 0 ? [0.4, "not ranking yet"] : pos <= 3 ? [0.2, "already top 3"] : pos <= 20 ? [1, "positions 4-20: quick win"] : pos <= 50 ? [0.6, "positions 21-50"] : [0.4, "beyond 50"];
    f.push({ id: "ranking", label: "Current ranking", weight: W.ranking, points: W.ranking * (share as number), note: `${pos === null ? "No position" : `Position ${pos.toFixed(1)}`}: ${why}.` });
  }
  if (!k.verifiedAt) f.push({ id: "freshness", label: "Data freshness", weight: W.freshness, points: 0, note: "Inputs never verified." });
  else {
    const age = (today.getTime() - Date.parse(k.verifiedAt)) / 86_400_000;
    f.push({ id: "freshness", label: "Data freshness", weight: W.freshness, points: age <= 90 ? W.freshness : age <= 365 ? W.freshness / 2 : 0, note: `Checked ${Math.round(age)} days ago.` });
  }
  const known = f.filter((x) => x.points !== null);
  const knownWeight = known.reduce((s, x) => s + x.weight, 0);
  const score = knownWeight ? Math.round((known.reduce((s, x) => s + (x.points ?? 0), 0) / knownWeight) * 100) : null;
  return { score, coverage: Math.round((knownWeight / 100) * 100), factors: f.map((x) => ({ ...x, points: x.points === null ? null : Math.round(x.points * 10) / 10 })) };
}
