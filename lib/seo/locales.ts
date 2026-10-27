// The three public language sites. Each has its own URL prefix and section names, so Google indexes every
// language at its own address. The language never changes with the visitor's IP address.

export const LOCALES = ["it", "fr", "de"] as const;
export type Locale = (typeof LOCALES)[number];
export const isLocale = (v: unknown): v is Locale => LOCALES.includes(v as Locale);

export type Section = "guides" | "bonds" | "tools" | "method" | "team" | "knowledge";

type LocaleDef = {
  name: string; // in its own language
  hreflang: string;
  ogLocale: string;
  country: "IT" | "FR" | "DE";
  marketName: string; // in English, for the admin
  seg: Record<Section, string>;
};

export const LOCALE: Record<Locale, LocaleDef> = {
  it: { name: "Italiano", hreflang: "it-IT", ogLocale: "it_IT", country: "IT", marketName: "Italy", seg: { guides: "guide", bonds: "obbligazioni", tools: "calcolatori", method: "metodologia", team: "redazione", knowledge: "sapere" } },
  fr: { name: "Français", hreflang: "fr-FR", ogLocale: "fr_FR", country: "FR", marketName: "France", seg: { guides: "guides", bonds: "obligations", tools: "calculateurs", method: "methodologie", team: "redaction", knowledge: "savoir" } },
  de: { name: "Deutsch", hreflang: "de-DE", ogLocale: "de_DE", country: "DE", marketName: "Germany", seg: { guides: "ratgeber", bonds: "anleihen", tools: "rechner", method: "methodik", team: "redaktion", knowledge: "wissen" } },
};

export function sectionOf(locale: Locale, segment: string): Section | null {
  const s = (Object.entries(LOCALE[locale].seg) as [Section, string][]).find(([, v]) => v === segment);
  return s ? s[0] : null;
}

export const pathOf = (locale: Locale, section?: Section, slug?: string) =>
  `/${locale}${section ? `/${LOCALE[locale].seg[section]}` : ""}${slug ? `/${slug}` : ""}`;

/** Language a browser asks for, from its Accept-Language list; null when none of ours is in it. */
export function localeFromAcceptLanguage(header: string | null | undefined): Locale | null {
  if (!header) return null;
  const langs = header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
      return { lang: tag.toLowerCase().split("-")[0], q: q ? Number(q.slice(2)) : 1 };
    })
    .filter((x) => x.lang && Number.isFinite(x.q) && x.q > 0)
    .sort((a, b) => b.q - a.q);
  return (langs.find((x) => isLocale(x.lang))?.lang as Locale) ?? null;
}

/**
 * Which language to suggest on the English home page, in the brief's order: a saved choice, then the browser's
 * languages, then the country (when the hosting adds one). Null = keep the international page.
 */
export function suggestLocale(saved: string | null | undefined, acceptLanguage: string | null | undefined, country: string | null | undefined): Locale | null {
  if (isLocale(saved)) return saved;
  const fromBrowser = localeFromAcceptLanguage(acceptLanguage);
  if (fromBrowser) return fromBrowser;
  const c = (country ?? "").toUpperCase();
  return c === "IT" ? "it" : c === "FR" ? "fr" : c === "DE" || c === "AT" ? "de" : null;
}

export const LANG_COOKIE = "tb_lang";

// Words used on the public pages, per language.
export const T: Record<Locale | "en", Record<string, string>> = {
  // English (US and UK readers): only the words used by the shared comparison table and the call to action.
  en: {
    openTool: "Open the bond finder", freeAccount: "Free account: the full top 10",
    ctaTitle: "Find your 10 bonds", ctaText: "Pick a duration and a target return: 10BONDS shows the 10 closest euro bonds, one per issuer.",
    issuer: "Issuer", riskCol: "Risk (1-10)", ytm: "Return to maturity (per year)", duration: "Duration", maturity: "Maturity", year: "Year",
    dataAsOf: "Data as of", sample: "Sample data, not real", bondsCount: "bonds", issuersCount: "issuers", range: "Return min / median / max",
    avgDuration: "Average duration", moreRows: "The full top 10, with the details of each bond, is in the bond finder.",
    years: "years", breadcrumb: "Breadcrumb", compare: "Compare",
  },
  it: {
    home: "Home", guides: "Guide", bonds: "Obbligazioni", tools: "Calcolatori", method: "Metodologia", team: "Redazione", knowledge: "Sapere", plans: "Piani", focus: "Analisi rischio", focusShort: "Rischio",
    by: "Di", reviewedBy: "Revisione di", editorial: "Redazione 10BONDS", published: "Pubblicata il", reviewed: "Ultima revisione", updated: "Aggiornata il",
    related: "Guide correlate", liveData: "Dati aggiornati", openTool: "Apri lo strumento", freeAccount: "Account gratuito: top 10 completa",
    ctaTitle: "Trova le tue 10 obbligazioni", ctaText: "Scegli una duration e un rendimento obiettivo: 10BONDS ti mostra le 10 obbligazioni in euro più vicine, una per emittente.",
    risk: "Contenuto informativo ed educativo, non è consulenza finanziaria né un'offerta di acquisto o vendita. Rendimenti lordi e indicativi, possono cambiare. Le obbligazioni possono perdere valore e gli emittenti possono non rimborsare. Il rischio 1-10 è una valutazione interna di 10BONDS, solo informativa e non un rating: verifica i rating ufficiali con le agenzie, l'emittente e il tuo consulente finanziario.",
    disclaimer: "Avvertenze", preview: "Anteprima: questa pagina non è visibile al pubblico.", noGuides: "Le prime guide sono in revisione e saranno pubblicate a breve.",
    issuer: "Emittente", riskCol: "Rischio (1-10)", ytm: "Rendimento a scadenza", duration: "Duration", maturity: "Scadenza", year: "Anno",
    dataAsOf: "Dati al", sample: "Dati di esempio, non reali", bondsCount: "obbligazioni", issuersCount: "emittenti", range: "Rendimento min / mediano / max",
    avgDuration: "Duration media", igShare: "Emittenti investment grade", moreRows: "La top 10 completa, con i dettagli di ogni obbligazione, è nello strumento.",
    notEnough: "Oggi non ci sono abbastanza obbligazioni per questa pagina.", years: "anni", breadcrumb: "Percorso", compare: "Confronta",
    langLabel: "Lingua",
  },
  fr: {
    home: "Accueil", guides: "Guides", bonds: "Obligations", tools: "Calculateurs", method: "Méthodologie", team: "Rédaction", knowledge: "Savoir", plans: "Offres", focus: "Analyse risque", focusShort: "Risque",
    by: "Par", reviewedBy: "Relu par", editorial: "Rédaction 10BONDS", published: "Publié le", reviewed: "Dernière relecture", updated: "Mise à jour le",
    related: "Guides associés", liveData: "Données à jour", openTool: "Ouvrir l'outil", freeAccount: "Compte gratuit : le top 10 complet",
    ctaTitle: "Trouvez vos 10 obligations", ctaText: "Choisissez une duration et un rendement cible : 10BONDS affiche les 10 obligations en euros les plus proches, une par émetteur.",
    risk: "Contenu informatif et pédagogique : ce n'est ni un conseil en investissement ni une offre d'achat ou de vente. Rendements bruts et indicatifs, susceptibles de changer. Une obligation peut perdre de la valeur et un émetteur peut faire défaut. Le risque de 1 à 10 est une évaluation interne de 10BONDS, à titre informatif, et non une notation : vérifiez les notations officielles auprès des agences, de l'émetteur et de votre conseiller financier.",
    disclaimer: "Avertissements", preview: "Aperçu : cette page n'est pas visible du public.", noGuides: "Les premiers guides sont en relecture et seront publiés prochainement.",
    issuer: "Émetteur", riskCol: "Risque (1-10)", ytm: "Rendement à l'échéance", duration: "Duration", maturity: "Échéance", year: "Année",
    dataAsOf: "Données au", sample: "Données d'exemple, non réelles", bondsCount: "obligations", issuersCount: "émetteurs", range: "Rendement min / médian / max",
    avgDuration: "Duration moyenne", igShare: "Émetteurs investment grade", moreRows: "Le top 10 complet, avec le détail de chaque obligation, est dans l'outil.",
    notEnough: "Il n'y a pas assez d'obligations pour cette page aujourd'hui.", years: "ans", breadcrumb: "Fil d'Ariane", compare: "Comparer",
    langLabel: "Langue",
  },
  de: {
    home: "Start", guides: "Ratgeber", bonds: "Anleihen", tools: "Rechner", method: "Methodik", team: "Redaktion", knowledge: "Wissen", plans: "Pläne", focus: "Risikoanalyse", focusShort: "Risiko",
    by: "Von", reviewedBy: "Geprüft von", editorial: "Redaktion 10BONDS", published: "Veröffentlicht am", reviewed: "Zuletzt geprüft", updated: "Aktualisiert am",
    related: "Weitere Ratgeber", liveData: "Aktuelle Daten", openTool: "Zum Anleihen-Finder", freeAccount: "Kostenloses Konto: komplette Top 10",
    ctaTitle: "Finden Sie Ihre 10 Anleihen", ctaText: "Wählen Sie eine Duration und eine Zielrendite: 10BONDS zeigt die 10 passendsten Euro-Anleihen, eine je Emittent.",
    risk: "Informations- und Bildungsinhalt, keine Anlageberatung und kein Angebot zum Kauf oder Verkauf. Renditen sind brutto und unverbindlich und können sich ändern. Anleihen können an Wert verlieren, Emittenten können ausfallen. Das Risiko 1-10 ist eine interne Einschätzung von 10BONDS, nur zur Information und kein Rating: Prüfen Sie offizielle Ratings bei den Agenturen, beim Emittenten und bei Ihrem Finanzberater.",
    disclaimer: "Risikohinweise", preview: "Vorschau: Diese Seite ist nicht öffentlich sichtbar.", noGuides: "Die ersten Ratgeber werden gerade geprüft und bald veröffentlicht.",
    issuer: "Emittent", riskCol: "Risiko (1-10)", ytm: "Rendite bis Fälligkeit", duration: "Duration", maturity: "Fälligkeit", year: "Jahr",
    dataAsOf: "Daten vom", sample: "Beispieldaten, nicht real", bondsCount: "Anleihen", issuersCount: "Emittenten", range: "Rendite min / Median / max",
    avgDuration: "Durchschnittliche Duration", igShare: "Emittenten mit Investment Grade", moreRows: "Die komplette Top 10 mit allen Details finden Sie im Anleihen-Finder.",
    notEnough: "Für diese Seite gibt es heute nicht genug Anleihen.", years: "Jahre", breadcrumb: "Navigationspfad", compare: "Vergleichen",
    langLabel: "Sprache",
  },
};
