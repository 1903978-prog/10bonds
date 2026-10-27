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
};

const t = (free: boolean, plus: boolean, premium: boolean, pro: boolean): Ticks => ({ free, plus, premium, pro });

export const FEATURES = [
  { key: "full_top10", admin: "Full top 10 (visitors without an account see 3)", built: true, ticks: t(true, true, true, true) },
  { key: "isin", admin: "ISIN codes, bond name, coupon, maturity", built: true, ticks: t(true, true, true, true) },
  { key: "portfolio_sim", admin: "Portfolio simulation (averages, loss, Monte Carlo)", built: true, ticks: t(true, true, true, true) },
  { key: "bond_page_full", admin: "Return and rank on each bond page", built: true, ticks: t(true, true, true, true) },
  { key: "unlimited_single", admin: "Unlimited one-bond searches (else the Free number below)", built: true, ticks: t(false, true, true, true) },
  { key: "unlimited_portfolio", admin: "Unlimited portfolio searches (else the Free number below)", built: true, ticks: t(false, true, true, true) },
  { key: "loss_chart", admin: "Chart: expected loss against return (return curves). Free sees it blurred", built: true, ticks: t(false, true, true, true) },
  { key: "multi_chart", admin: "Multi-year chart: every horizon on one chart. Free sees it blurred", built: true, ticks: t(false, true, true, true) },
  { key: "heat_map", admin: "Heat map: risk/return per year. Free sees it blurred", built: true, ticks: t(false, true, true, true) },
  { key: "excel", admin: "Download the tables to Excel", built: true, ticks: t(false, true, true, true) },
  { key: "isin_search", admin: "Search any bond by ISIN (a search box; Free sees it locked)", built: true, ticks: t(false, true, true, true) },
  { key: "swap", admin: "Replace any top-10 bond with a similar one", built: true, ticks: t(false, true, true, true) },
  { key: "blacklist", admin: "Blacklist issuers from any portfolio", built: true, ticks: t(false, true, true, true) },
  { key: "why_table", admin: "Why each bond is in or out of the top 10", built: true, ticks: t(false, false, true, true) },
  { key: "add_left_out", admin: "Add a left-out bond to the top 10", built: true, ticks: t(false, false, true, true) },
  { key: "risk_reports", admin: "Access to Risk reports by issuer (Free sees the free example company, country and report)", built: true, ticks: t(false, false, true, true) },
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
 * The Plans page shows at most this many lines per plan: related features share one line (a group), so a new feature
 * joins a group here and the page keeps its size. A built feature in no group falls into "And more".
 */
export const MAX_PLAN_LINES = 7;
type Group = { keys: FeatureKey[]; label: Record<Lang, string> };
const GROUPS: Group[] = [
  { keys: ["full_top10", "isin", "bond_page_full"], label: { en: "Full top 10 with ISIN, coupon, maturity", it: "Top 10 completa con ISIN, cedola, scadenza", fr: "Top 10 complet avec ISIN, coupon, échéance", de: "Volle Top 10 mit ISIN, Kupon, Fälligkeit" } },
  { keys: ["portfolio_sim", "loss_chart", "multi_chart", "heat_map"], label: { en: "Portfolio simulation, charts and heat map", it: "Simulazione del portafoglio, grafici e mappa di calore", fr: "Simulation du portefeuille, graphiques et carte thermique", de: "Portfolio-Simulation, Diagramme und Heatmap" } },
  { keys: ["unlimited_single", "unlimited_portfolio"], label: { en: "Unlimited searches", it: "Ricerche illimitate", fr: "Recherches illimitées", de: "Unbegrenzte Suchen" } },
  { keys: ["isin_search"], label: { en: "Search any bond by ISIN", it: "Cerca qualsiasi bond per ISIN", fr: "Recherche de toute obligation par ISIN", de: "Jede Anleihe per ISIN suchen" } },
  { keys: ["excel", "swap", "blacklist"], label: { en: "Excel download, bond swap and blacklist", it: "Download Excel, sostituzione bond e blacklist", fr: "Export Excel, échange d'obligations et liste noire", de: "Excel-Download, Anleihetausch und Sperrliste" } },
  { keys: ["why_table", "add_left_out"], label: { en: "Why bonds are in or out, add your own", it: "Perché i bond entrano o escono, aggiungi i tuoi", fr: "Pourquoi une obligation entre ou sort, ajoutez les vôtres", de: "Warum Anleihen drin oder draußen sind, eigene hinzufügen" } },
  { keys: ["risk_reports"], label: { en: "Risk reports by issuer", it: "Report di rischio per emittente", fr: "Rapports de risque par émetteur", de: "Risikoberichte je Emittent" } },
];
const BLURRED: Record<Lang, string> = { en: "Charts blurred on Free", it: "Grafici sfocati nel piano Free", fr: "Graphiques floutés en Free", de: "Diagramme im Free-Plan unscharf" };
const MORE: Record<Lang, string> = { en: "And more", it: "E altro", fr: "Et plus encore", de: "Und mehr" };

/**
 * Lines for one plan's card on the Plans page, from the ticks, as a checklist of at most MAX_PLAN_LINES: the Free card
 * lists its groups and its daily search limit; each paid card says "everything in" the plan before it and lists the groups
 * it adds.
 */
export function planLines(
  m: Matrix, plan: FeaturePlan, lang: Lang,
  words: { everything: Record<Exclude<FeaturePlan, "free">, string>; limit: (n: number) => string },
  limits: { daily: number },
): string[] {
  const mine = new Set(featuresOf(m, plan));
  const i = FEATURE_PLANS.indexOf(plan);
  const prev = new Set(i > 0 ? featuresOf(m, FEATURE_PLANS[i - 1]) : []);
  const fresh = (k: FeatureKey) => mine.has(k) && !prev.has(k);
  const lines: string[] = plan === "free" ? [] : [words.everything[plan]];
  for (const g of GROUPS) if (g.keys.some(fresh)) lines.push(g.label[lang]);
  const grouped = new Set(GROUPS.flatMap((g) => g.keys));
  if (FEATURES.some((f) => f.built && !grouped.has(f.key) && fresh(f.key))) lines.push(MORE[lang]);
  if (plan === "free" && !mine.has("loss_chart")) lines.push(BLURRED[lang]);
  // A plan without unlimited searches says how many it has a day, one shared number (once: the next plans say "everything in").
  const capped = (k: FeatureKey) => !mine.has(k) && (i === 0 || prev.has(k));
  if (capped("unlimited_single") || capped("unlimited_portfolio")) lines.push(words.limit(limits.daily));
  return lines;
}
