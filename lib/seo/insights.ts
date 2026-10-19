import type { PublicBond } from "../types";
import { bondRisk } from "../ratings";
import type { Locale } from "./locales";
import { pathOf } from "./locales";
import { govCurves, type Curve } from "./yieldCurves";

// "The bond market today": a page rebuilt from the bond copy every time it is read. Every figure is computed from
// the bonds the site shows (EUR, rated, current yield); nothing is written by hand, so it is never out of date.

const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return Math.round((s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2) * 100) / 100;
};

export type Insights = {
  bonds: number;
  issuers: number;
  medianYtm: number | null;
  ig: { bonds: number; median: number | null };
  hy: { bonds: number; median: number | null };
  byDuration: { label: "0-2" | "2-5" | "5-10" | "10+"; bonds: number; median: number | null }[];
  spreads: { vs: string; year: number; spread: number }[]; // government yield minus Germany at about 10 years, basis points
  topGov10: { country: string; year: number; ytm: number }[]; // highest 10-year government yields
};

/** Yield of a curve near a target year (exact year, else the closest within 1 year). */
function near(c: Curve | undefined, year: number) {
  if (!c) return null;
  return c.points.find((p) => p.year === year) ?? c.points.filter((p) => Math.abs(p.year - year) <= 1).sort((a, b) => Math.abs(a.year - year) - Math.abs(b.year - year))[0] ?? null;
}

export function marketInsights(bonds: PublicBond[], now = new Date()): Insights {
  const eur = bonds.filter((b) => b.currency === "EUR" && b.grossYtm !== null);
  const risk = eur.map((b) => ({ b, r: bondRisk(b) }));
  const ig = risk.filter((x) => x.r !== null && x.r <= 6).map((x) => x.b.grossYtm!);
  const hy = risk.filter((x) => x.r !== null && x.r >= 7).map((x) => x.b.grossYtm!);
  const bucket = (lo: number, hi: number) => eur.filter((b) => b.modifiedDuration !== null && b.modifiedDuration >= lo && b.modifiedDuration < hi).map((b) => b.grossYtm!);
  const curves = govCurves(eur, now.getUTCFullYear());
  const y10 = now.getUTCFullYear() + 10;
  const de = near(curves.find((c) => c.country === "DE"), y10);
  const spreads = de
    ? ["IT", "FR", "ES"].map((c) => ({ c, p: near(curves.find((x) => x.country === c), y10) })).filter((x) => x.p).map((x) => ({ vs: x.c, year: x.p!.year, spread: Math.round((x.p!.ytm - de.ytm) * 100) }))
    : [];
  const topGov10 = curves.map((c) => ({ country: c.country, p: near(c, y10) })).filter((x) => x.p).map((x) => ({ country: x.country, year: x.p!.year, ytm: x.p!.ytm })).sort((a, b) => b.ytm - a.ytm).slice(0, 3);
  return {
    bonds: eur.length,
    issuers: new Set(eur.map((b) => b.issuer ?? b.isin)).size,
    medianYtm: median(eur.map((b) => b.grossYtm!)),
    ig: { bonds: ig.length, median: median(ig) },
    hy: { bonds: hy.length, median: median(hy) },
    byDuration: [
      { label: "0-2", bonds: bucket(0, 2).length, median: median(bucket(0, 2)) },
      { label: "2-5", bonds: bucket(2, 5).length, median: median(bucket(2, 5)) },
      { label: "5-10", bonds: bucket(5, 10).length, median: median(bucket(5, 10)) },
      { label: "10+", bonds: bucket(10, 99).length, median: median(bucket(10, 99)) },
    ],
    spreads,
    topGov10,
  };
}

export type InsightsText = {
  slug: string; title: string; description: string; h1: string; asOf: string; empty: string;
  summary: (i: Insights, pct: (v: number) => string, n: (v: number) => string) => string;
  hDuration: string; durationCols: [string, string, string]; durationLabel: (l: string) => string;
  hRisk: string; ig: string; hy: string; riskNote: string;
  hGov: string; spread: (country: string, year: number, bp: number) => string; topGov: string; curveLink: string;
  hMethod: string; method: string; methodLink: string;
};

const pathFor = (l: Locale | "en", slug: string) => (l === "en" ? `/knowledge/${slug}` : pathOf(l, "tools", slug));

export const INSIGHTS_TEXT: Record<Locale | "en", InsightsText> = {
  it: {
    slug: "mercato-obbligazionario-oggi",
    title: "Mercato obbligazionario oggi: rendimenti in euro aggiornati · 10BONDS",
    description: "I numeri del mercato delle obbligazioni in euro, ricalcolati ogni giorno: rendimento mediano, per duration e per rischio, spread BTP-Bund e OAT-Bund a 10 anni.",
    h1: "Il mercato obbligazionario in euro oggi",
    asOf: "Dati al", empty: "Nessun dato disponibile al momento.",
    summary: (i, pct, n) => `Oggi seguiamo ${n(i.bonds)} obbligazioni in euro di ${n(i.issuers)} emittenti. Il rendimento a scadenza lordo mediano è ${i.medianYtm === null ? "non disponibile" : pct(i.medianYtm)}${i.ig.median !== null ? `: ${pct(i.ig.median)} per le obbligazioni a rischio più basso (rischio 1-6)` : ""}${i.hy.median !== null ? ` e ${pct(i.hy.median)} per quelle a rischio più alto (rischio 7-10)` : ""}.`,
    hDuration: "Rendimento per duration", durationCols: ["Duration", "Obbligazioni", "Rendimento mediano"], durationLabel: (l) => `${l} anni`,
    hRisk: "Rendimento per rischio", ig: "Rischio 1-6 (investment grade)", hy: "Rischio 7-10 (alto rendimento)", riskNote: "Il rischio da 1 a 10 è la valutazione interna di 10BONDS.",
    hGov: "Titoli di Stato a 10 anni", spread: (c, y, bp) => `Spread ${c}-Bund (scadenza ${y}): ${bp} punti base.`, topGov: "Rendimenti più alti a circa 10 anni:", curveLink: "Confronta le curve dei titoli di Stato per Paese",
    hMethod: "Come sono calcolati", method: "Mediane dei rendimenti a scadenza lordi di tutte le obbligazioni in euro con rendimento attuale e valutazione del rischio. Gli spread confrontano il rendimento medio dei titoli di Stato con scadenza tra circa 10 anni con quello dei titoli tedeschi della stessa scadenza.", methodLink: "Metodologia completa",
  },
  fr: {
    slug: "marche-obligataire-aujourd-hui",
    title: "Marché obligataire aujourd'hui : rendements en euros à jour · 10BONDS",
    description: "Les chiffres du marché des obligations en euros, recalculés chaque jour : rendement médian, par duration et par risque, écarts OAT-Bund et BTP-Bund à 10 ans.",
    h1: "Le marché obligataire en euros aujourd'hui",
    asOf: "Données au", empty: "Aucune donnée disponible pour le moment.",
    summary: (i, pct, n) => `Nous suivons aujourd'hui ${n(i.bonds)} obligations en euros de ${n(i.issuers)} émetteurs. Le rendement à l'échéance brut médian est de ${i.medianYtm === null ? "—" : pct(i.medianYtm)}${i.ig.median !== null ? ` : ${pct(i.ig.median)} pour les obligations au risque le plus faible (risque 1-6)` : ""}${i.hy.median !== null ? ` et ${pct(i.hy.median)} pour les plus risquées (risque 7-10)` : ""}.`,
    hDuration: "Rendement par duration", durationCols: ["Duration", "Obligations", "Rendement médian"], durationLabel: (l) => `${l} ans`,
    hRisk: "Rendement par risque", ig: "Risque 1-6 (investment grade)", hy: "Risque 7-10 (haut rendement)", riskNote: "Le risque de 1 à 10 est l'évaluation interne de 10BONDS.",
    hGov: "Emprunts d'État à 10 ans", spread: (c, y, bp) => `Écart ${c}-Bund (échéance ${y}) : ${bp} points de base.`, topGov: "Rendements les plus élevés à environ 10 ans :", curveLink: "Comparer les courbes des taux par pays",
    hMethod: "Méthode de calcul", method: "Médianes des rendements à l'échéance bruts de toutes les obligations en euros avec un rendement actuel et une évaluation du risque. Les écarts comparent le rendement moyen des emprunts d'État arrivant à échéance dans environ 10 ans avec celui des titres allemands de même échéance.", methodLink: "Méthodologie complète",
  },
  de: {
    slug: "anleihenmarkt-heute",
    title: "Anleihenmarkt heute: aktuelle Euro-Renditen · 10BONDS",
    description: "Die Zahlen des Euro-Anleihenmarkts, täglich neu berechnet: Median-Rendite, nach Duration und Risiko, BTP-Bund- und OAT-Bund-Spread bei 10 Jahren.",
    h1: "Der Euro-Anleihenmarkt heute",
    asOf: "Datenstand", empty: "Derzeit keine Daten verfügbar.",
    summary: (i, pct, n) => `Wir verfolgen heute ${n(i.bonds)} Euro-Anleihen von ${n(i.issuers)} Emittenten. Die mittlere Bruttorendite bis Fälligkeit (Median) liegt bei ${i.medianYtm === null ? "—" : pct(i.medianYtm)}${i.ig.median !== null ? `: ${pct(i.ig.median)} bei Anleihen mit niedrigerem Risiko (Risiko 1-6)` : ""}${i.hy.median !== null ? ` und ${pct(i.hy.median)} bei Anleihen mit höherem Risiko (Risiko 7-10)` : ""}.`,
    hDuration: "Rendite nach Duration", durationCols: ["Duration", "Anleihen", "Median-Rendite"], durationLabel: (l) => `${l} Jahre`,
    hRisk: "Rendite nach Risiko", ig: "Risiko 1-6 (Investment Grade)", hy: "Risiko 7-10 (Hochzins)", riskNote: "Das Risiko von 1 bis 10 ist die interne Bewertung von 10BONDS.",
    hGov: "Staatsanleihen mit 10 Jahren", spread: (c, y, bp) => `Spread ${c}-Bund (Fälligkeit ${y}): ${bp} Basispunkte.`, topGov: "Höchste Renditen bei rund 10 Jahren:", curveLink: "Zinskurven nach Land vergleichen",
    hMethod: "So wird gerechnet", method: "Mediane der Bruttorenditen bis Fälligkeit aller Euro-Anleihen mit aktueller Rendite und Risikobewertung. Die Spreads vergleichen die durchschnittliche Rendite der Staatsanleihen mit Fälligkeit in rund 10 Jahren mit der deutscher Bundesanleihen gleicher Fälligkeit.", methodLink: "Vollständige Methodik",
  },
  en: {
    slug: "bond-market-today",
    title: "Bond market today: current euro bond yields · 10BONDS",
    description: "The euro bond market in numbers, recalculated daily: median yield, by duration and by risk, and 10-year BTP-Bund and OAT-Bund spreads.",
    h1: "The euro bond market today",
    asOf: "Data as of", empty: "No data available right now.",
    summary: (i, pct, n) => `Today we track ${n(i.bonds)} euro bonds from ${n(i.issuers)} issuers. The median gross yield to maturity is ${i.medianYtm === null ? "—" : pct(i.medianYtm)}${i.ig.median !== null ? `: ${pct(i.ig.median)} for lower-risk bonds (risk 1-6)` : ""}${i.hy.median !== null ? ` and ${pct(i.hy.median)} for higher-risk bonds (risk 7-10)` : ""}.`,
    hDuration: "Yield by duration", durationCols: ["Duration", "Bonds", "Median yield"], durationLabel: (l) => `${l} years`,
    hRisk: "Yield by risk", ig: "Risk 1-6 (investment grade)", hy: "Risk 7-10 (high yield)", riskNote: "Risk 1 to 10 is 10BONDS' internal assessment.",
    hGov: "10-year government bonds", spread: (c, y, bp) => `${c}-Bund spread (maturity ${y}): ${bp} basis points.`, topGov: "Highest yields at about 10 years:", curveLink: "Compare government yield curves by country",
    hMethod: "How it is calculated", method: "Medians of the gross yield to maturity of every euro bond with a current yield and a risk assessment. Spreads compare the average yield of government bonds maturing in about 10 years with German bonds of the same maturity.", methodLink: "Full methodology",
  },
};

export const insightsPath = (l: Locale | "en") => pathFor(l, INSIGHTS_TEXT[l].slug);
export function insightsAlternates(self: Locale | "en") {
  return { canonical: insightsPath(self), languages: { "it-IT": insightsPath("it"), "fr-FR": insightsPath("fr"), "de-DE": insightsPath("de"), en: insightsPath("en"), "x-default": insightsPath("en") } };
}
