import type { PublicBond } from "../types";
import { countryCode, issuerClass } from "./classify";
import { pathOf, type Locale } from "./locales";

// Government yield curves by country for the Knowledge Center: the average gross yield to maturity of each
// country's EUR government bonds, per maturity year. The bond copy already leaves out bonds whose cash flows
// cannot be modelled (inflation-linked, floating, step-up), and every bond here has a current yield.

export type CurvePoint = { year: number; ytm: number; bonds: number };
export type Curve = { country: string; points: CurvePoint[] };

export function govCurves(bonds: PublicBond[], fromYear = new Date().getUTCFullYear()): Curve[] {
  const by = new Map<string, Map<number, number[]>>();
  for (const b of bonds) {
    if (b.currency !== "EUR" || b.grossYtm === null || !b.maturity || issuerClass(b) !== "sovereign") continue;
    // A government bond's ISIN starts with its country's code, which covers rows without a usable country.
    const country = countryCode(b) ?? (/^[A-Z]{2}/.test(b.isin) && !/^(XS|EU)/.test(b.isin) ? b.isin.slice(0, 2) : null);
    if (!country) continue;
    const year = Number(b.maturity.slice(0, 4));
    if (year < fromYear) continue;
    const years = by.get(country) ?? new Map<number, number[]>();
    years.set(year, [...(years.get(year) ?? []), b.grossYtm]);
    by.set(country, years);
  }
  return [...by.entries()]
    .map(([country, years]) => ({
      country,
      points: [...years.entries()]
        .sort(([a], [b]) => a - b)
        .map(([year, ys]) => ({ year, ytm: Math.round((ys.reduce((s, y) => s + y, 0) / ys.length) * 100) / 100, bonds: ys.length })),
    }))
    .sort((a, b) => a.country.localeCompare(b.country));
}

/** Countries selected when the page opens: our three markets plus Spain, where there are bonds. */
export const DEFAULT_COUNTRIES = ["IT", "FR", "DE", "ES"];

export type CurveText = {
  slug: string; title: string; description: string; h1: string; intro: string[]; chartTitle: string; note: string;
  ranges: [string, string, string]; all: string; none: string; asOf: string; empty: string; yearCol: string; bondsCol: string; tableTitle: string;
};

const RANGES = { it: ["Prossimi 10 anni", "Prossimi 20 anni", "Tutto"], fr: ["10 prochaines années", "20 prochaines années", "Tout"], de: ["Nächste 10 Jahre", "Nächste 20 Jahre", "Alle"], en: ["Next 10 years", "Next 20 years", "All"] } as const;

export const CURVE_TEXT: Record<Locale | "en", CurveText> = {
  it: {
    slug: "curva-rendimenti-titoli-di-stato",
    title: "Curva dei rendimenti dei titoli di Stato per Paese · 10BONDS",
    description: "Grafico interattivo: rendimento medio a scadenza dei titoli di Stato in euro per Paese e anno di scadenza. BTP, Bund, OAT, Bonos e altri, aggiornato ogni giorno.",
    h1: "Rendimenti dei titoli di Stato per Paese",
    intro: ["Scegli uno o più Paesi e confronta la curva dei rendimenti: per ogni anno di scadenza, il rendimento medio a scadenza dei titoli di Stato in euro di quel Paese."],
    chartTitle: "Rendimento a scadenza medio per anno di scadenza",
    note: "Rendimento lordo medio (prima delle imposte) dei titoli di Stato a tasso fisso in euro che scadono in quell'anno. Solo titoli con un prezzo attuale; titoli indicizzati all'inflazione, a tasso variabile e step-up sono esclusi. Clicca un Paese per mostrarlo o nasconderlo.",
    ranges: [...RANGES.it], all: "Tutti", none: "Nessuno", asOf: "Dati al", empty: "Nessun dato disponibile al momento.", yearCol: "Anno", bondsCol: "titoli", tableTitle: "I dati del grafico",
  },
  fr: {
    slug: "courbe-taux-obligations-etat",
    title: "Courbe des taux des obligations d'État par pays · 10BONDS",
    description: "Graphique interactif : rendement moyen à l'échéance des obligations d'État en euros par pays et année d'échéance. OAT, Bund, BTP, Bonos et autres, mis à jour chaque jour.",
    h1: "Rendements des obligations d'État par pays",
    intro: ["Choisissez un ou plusieurs pays et comparez leur courbe des taux : pour chaque année d'échéance, le rendement moyen à l'échéance de leurs obligations d'État en euros."],
    chartTitle: "Rendement à l'échéance moyen par année d'échéance",
    note: "Rendement brut moyen (avant impôts) des obligations d'État à taux fixe en euros arrivant à échéance cette année-là. Uniquement des titres avec un prix actuel ; titres indexés sur l'inflation, à taux variable et à coupon progressif exclus. Cliquez sur un pays pour l'afficher ou le masquer.",
    ranges: [...RANGES.fr], all: "Tous", none: "Aucun", asOf: "Données au", empty: "Aucune donnée disponible pour le moment.", yearCol: "Année", bondsCol: "titres", tableTitle: "Les données du graphique",
  },
  de: {
    slug: "zinskurve-staatsanleihen",
    title: "Zinskurve der Staatsanleihen nach Land · 10BONDS",
    description: "Interaktiver Chart: durchschnittliche Rendite bis Fälligkeit von Euro-Staatsanleihen nach Land und Fälligkeitsjahr. Bund, OAT, BTP, Bonos und mehr, täglich aktualisiert.",
    h1: "Renditen von Staatsanleihen nach Land",
    intro: ["Wählen Sie ein oder mehrere Länder und vergleichen Sie die Zinskurven: für jedes Fälligkeitsjahr die durchschnittliche Rendite bis Fälligkeit der Euro-Staatsanleihen dieses Landes."],
    chartTitle: "Durchschnittliche Rendite bis Fälligkeit je Fälligkeitsjahr",
    note: "Durchschnittliche Bruttorendite (vor Steuern) der festverzinslichen Euro-Staatsanleihen mit Fälligkeit in diesem Jahr. Nur Anleihen mit aktuellem Kurs; inflationsindexierte, variabel verzinste und Step-up-Anleihen sind ausgeschlossen. Klicken Sie auf ein Land, um es ein- oder auszublenden.",
    ranges: [...RANGES.de], all: "Alle", none: "Keine", asOf: "Datenstand", empty: "Derzeit keine Daten verfügbar.", yearCol: "Jahr", bondsCol: "Anleihen", tableTitle: "Die Daten des Charts",
  },
  en: {
    slug: "government-bond-yield-curves",
    title: "Government bond yields by country: yield curves · 10BONDS",
    description: "Interactive chart: average yield to maturity of EUR government bonds by country and maturity year. Bund, OAT, BTP, Bonos and more, updated daily.",
    h1: "Government bond yields by country",
    intro: ["Pick one or more countries and compare their yield curves: for each maturity year, the average yield to maturity of that country's EUR government bonds."],
    chartTitle: "Average yield to maturity by maturity year",
    note: "Average gross yield (before withholding tax) of each country's plain fixed-rate EUR government bonds maturing in that year. Only bonds with a current price; inflation-linked, floating and step-coupon bonds are left out. Click a country to show or hide it.",
    ranges: [...RANGES.en], all: "All", none: "None", asOf: "Data as of", empty: "No data available right now.", yearCol: "Year", bondsCol: "bonds", tableTitle: "The data behind the chart",
  },
};

export const curvePath = (l: Locale | "en") => (l === "en" ? `/knowledge/${CURVE_TEXT.en.slug}` : pathOf(l, "tools", CURVE_TEXT[l].slug));
/** hreflang for the curve page: every language plus English as x-default. */
export function curveAlternates(self: Locale | "en") {
  const languages = { "it-IT": curvePath("it"), "fr-FR": curvePath("fr"), "de-DE": curvePath("de"), en: curvePath("en"), "x-default": curvePath("en") };
  return { canonical: curvePath(self), languages };
}

/** A country's name in the reader's language; the code itself when the browser does not know it. */
export function countryName(code: string, locale: string): string {
  try {
    return new Intl.DisplayNames([locale], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}
