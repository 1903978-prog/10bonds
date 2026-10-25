// What each plan includes (the owner, 24/10/2026): one row per feature, one tick per plan. The admin edits the ticks at
// /admin/features (saved in app.plan_features, lib/planFeatures.ts); these are the ticks until then. Safe in the browser.
// built: false = an idea not in the app yet; its ticks are kept for planning and change nothing on the site.

export type FeaturePlan = "free" | "plus" | "premium" | "pro";
export const FEATURE_PLANS: FeaturePlan[] = ["free", "plus", "premium", "pro"];
export type Ticks = Record<FeaturePlan, boolean>;
type Lang = "en" | "it" | "fr" | "de";

export type Feature = {
  key: string;
  /** What the admin reads in the table. */
  admin: string;
  built: boolean;
  ticks: Ticks;
  /** The line on the Plans page (built features only), in each site language. */
  plans?: Record<Lang, string>;
};

const t = (free: boolean, plus: boolean, premium: boolean, pro: boolean): Ticks => ({ free, plus, premium, pro });

export const FEATURES = [
  { key: "full_top10", admin: "Full top 10 (visitors without an account see 3)", built: true, ticks: t(true, true, true, true),
    plans: { en: "Full top 10 bonds", it: "Top 10 completa", fr: "Top 10 complet", de: "Volle Top 10" } },
  { key: "isin", admin: "ISIN codes, bond name, coupon, maturity", built: true, ticks: t(true, true, true, true),
    plans: { en: "ISIN codes, coupon, maturity", it: "Codici ISIN, cedola, scadenza", fr: "Codes ISIN, coupon, échéance", de: "ISIN-Codes, Kupon, Fälligkeit" } },
  { key: "portfolio_sim", admin: "Portfolio simulation (averages, loss, Monte Carlo)", built: true, ticks: t(true, true, true, true),
    plans: { en: "Portfolio simulation and averages", it: "Simulazione e medie del portafoglio", fr: "Simulation et moyennes du portefeuille", de: "Portfolio-Simulation und Durchschnittswerte" } },
  { key: "bond_page_full", admin: "Return and rank on each bond page", built: true, ticks: t(true, true, true, true),
    plans: { en: "Return and rank on every bond page", it: "Rendimento e posizione su ogni scheda bond", fr: "Rendement et rang sur chaque fiche", de: "Rendite und Rang auf jeder Anleiheseite" } },
  { key: "unlimited_single", admin: "Unlimited one-bond searches (else 10 a week)", built: true, ticks: t(false, true, true, true),
    plans: { en: "Unlimited one-bond searches", it: "Ricerche di singoli bond illimitate", fr: "Recherches d'obligation illimitées", de: "Unbegrenzte Einzelanleihe-Suchen" } },
  { key: "unlimited_portfolio", admin: "Unlimited portfolio searches (else 3 a week)", built: true, ticks: t(false, true, true, true),
    plans: { en: "Unlimited portfolio searches", it: "Ricerche di portafoglio illimitate", fr: "Recherches de portefeuille illimitées", de: "Unbegrenzte Portfolio-Suchen" } },
  { key: "loss_chart", admin: "Expected-loss chart above the list", built: true, ticks: t(false, true, true, true),
    plans: { en: "Expected-loss chart", it: "Grafico della perdita attesa", fr: "Graphique de perte attendue", de: "Diagramm des erwarteten Verlusts" } },
  { key: "excel", admin: "Download the tables to Excel", built: true, ticks: t(false, true, true, true),
    plans: { en: "Download the tables to Excel", it: "Tabelle scaricabili in Excel", fr: "Tableaux à télécharger en Excel", de: "Tabellen als Excel herunterladen" } },
  { key: "swap", admin: "Replace any top-10 bond with a similar one", built: true, ticks: t(false, true, true, true),
    plans: { en: "Replace any bond with a similar one", it: "Sostituisci un bond con uno simile", fr: "Remplacez une obligation par une similaire", de: "Jede Anleihe durch eine ähnliche ersetzen" } },
  { key: "blacklist", admin: "Blacklist issuers from any portfolio", built: true, ticks: t(false, true, true, true),
    plans: { en: "Exclude bonds or issuers you don't want", it: "Escludi bond o emittenti che non vuoi", fr: "Excluez obligations ou émetteurs", de: "Anleihen oder Emittenten ausschließen" } },
  { key: "why_table", admin: "Why each bond is in or out of the top 10", built: true, ticks: t(false, false, true, true),
    plans: { en: "Why each bond is in or out of the top 10", it: "Perché ogni bond è dentro o fuori dalla top 10", fr: "Pourquoi chaque obligation est dans le top 10 ou non", de: "Warum jede Anleihe in den Top 10 ist oder nicht" } },
  { key: "add_left_out", admin: "Add a left-out bond to the top 10", built: true, ticks: t(false, false, true, true),
    plans: { en: "Add a left-out bond to your top 10", it: "Aggiungi alla top 10 un bond escluso", fr: "Ajoutez une obligation écartée au top 10", de: "Eine ausgeschlossene Anleihe hinzufügen" } },
  { key: "risk_reports", admin: "Access to Risk reports by issuer (Free sees the free example company, country and report)", built: true, ticks: t(false, false, true, true),
    plans: { en: "Risk reports by issuer", it: "Report di rischio per emittente", fr: "Rapports de risque par émetteur", de: "Risikoberichte je Emittent" } },
  { key: "heat_map", admin: "Heat map: risk/return per year", built: false, ticks: t(false, false, true, true) },
  { key: "return_curves", admin: "See return curves (YTM curves)", built: false, ticks: t(false, false, true, true) },
  // Ideas not in the app yet: ticking them plans the offer, the site does not change.
  { key: "weekly_email", admin: "Weekly e-mail with the new top bonds", built: false, ticks: t(true, true, true, true) },
  { key: "saved_searches", admin: "Save searches and portfolios", built: false, ticks: t(false, true, true, true) },
  { key: "watchlist", admin: "Watchlist of chosen bonds", built: false, ticks: t(false, true, true, true) },
  { key: "email_alerts", admin: "E-mail alerts when the top 10 changes", built: false, ticks: t(false, false, true, true) },
  { key: "pdf_report", admin: "PDF report of a portfolio", built: false, ticks: t(false, false, true, true) },
  { key: "compare", admin: "Compare two portfolios side by side", built: false, ticks: t(false, false, true, true) },
  { key: "full_horizon", admin: "Full horizon slider (every year, 1 to 30+)", built: false, ticks: t(false, false, true, true) },
  { key: "separate_sliders", admin: "Separate return and risk sliders", built: false, ticks: t(false, false, true, true) },
  { key: "priority_support", admin: "Priority e-mail support", built: false, ticks: t(false, false, true, true) },
  { key: "own_portfolio", admin: "Check your own bonds (upload a list)", built: false, ticks: t(false, false, false, true) },
  { key: "client_portfolios", admin: "Several client portfolios, saved", built: false, ticks: t(false, false, false, true) },
  { key: "api_access", admin: "Data feed / Google Sheets link", built: false, ticks: t(false, false, false, true) },
] as const satisfies readonly Feature[];

export type FeatureKey = (typeof FEATURES)[number]["key"];
export type Matrix = Record<FeatureKey, Ticks>;

export const isFeatureKey = (k: unknown): k is FeatureKey => FEATURES.some((f) => f.key === k);

export function defaultMatrix(): Matrix {
  return Object.fromEntries(FEATURES.map((f) => [f.key, { ...f.ticks }])) as Matrix;
}

/** The features one plan has under `m`. Ideas not built yet are never in the list. */
export function featuresOf(m: Matrix, plan: FeaturePlan): FeatureKey[] {
  return FEATURES.filter((f) => f.built && m[f.key]?.[plan]).map((f) => f.key);
}

/** Every built feature (the admin, to test and demo the tool). */
export const ALL_FEATURES: FeatureKey[] = FEATURES.filter((f) => f.built).map((f) => f.key);

/**
 * Lines for one plan's card on the Plans page, from the ticks: the Free card lists its features and its weekly
 * limits; each paid card says "everything in" the plan before it and lists what it adds.
 */
export function planLines(
  m: Matrix, plan: FeaturePlan, lang: Lang,
  words: { everything: Record<Exclude<FeaturePlan, "free">, string>; limit: (n: number, kind: "single" | "portfolio") => string },
  limits: { single: number; portfolio: number },
): string[] {
  const mine = new Set(featuresOf(m, plan));
  const i = FEATURE_PLANS.indexOf(plan);
  const prev = new Set(i > 0 ? featuresOf(m, FEATURE_PLANS[i - 1]) : []);
  const lines: string[] = plan === "free" ? [] : [words.everything[plan]];
  for (const f of FEATURES as readonly Feature[]) {
    if (!f.built || !f.plans || !mine.has(f.key as FeatureKey) || prev.has(f.key as FeatureKey)) continue;
    lines.push(f.plans[lang]);
  }
  // A plan without unlimited searches says how many it has a week (once: the next plans say "everything in").
  for (const kind of ["single", "portfolio"] as const) {
    const k = kind === "single" ? "unlimited_single" : "unlimited_portfolio";
    if (!mine.has(k) && (i === 0 || prev.has(k))) lines.push(words.limit(limits[kind], kind));
  }
  return lines;
}
