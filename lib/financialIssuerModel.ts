import type { FactorValue } from "./livioIssuerModel";
import { MACRO_KEYS, MACRO_FACTOR_WEIGHTS } from "./livioIssuerModel";
import type { CapitalStructureTier } from "./livioIssuerModel";

// BANK AND INSURER ISSUER MODEL (owner approved the draft "docs/credit-bank-insurer-method-draft.md" on 3/11/2026).
// Same rules as the corporate model: IR is a weighted sum of 0-100 factors (higher = safer); an unknown factor keeps its bounds 0..100, so missing data
// widens the range and nothing is guessed. A factor made of several figures is known ONLY if every figure is cited (no partial scores).
// Figure-to-score tables are straight lines between the anchor points below (flat beyond the first and last anchor). The draft gave three anchors for
// CET1, NPE and LCR; the other anchors are the same shape (weak / middle / strong) and are listed here so they can be audited and changed in one place.
// Judgment factors (business model, support, investment quality...) and the macro block are known only when a person typed them or a source states them.

export type FinKind = "bank" | "insurer";
export const BANK_WEIGHTS = { capital: 25, assetQuality: 20, profitability: 15, liquidity: 15, businessModel: 10, support: 5, macro: 10 } as const;
export const INSURER_WEIGHTS = { solvency: 30, underwriting: 20, investments: 15, reserves: 10, businessMix: 10, capitalQuality: 5, macro: 10 } as const;
export const JUDGMENT_KEYS = ["businessModel", "support", "investments", "reserves", "businessMix", "capitalQuality"] as const;
export type JudgmentKey = (typeof JUDGMENT_KEYS)[number];
export type FinFactorMap = Partial<Record<JudgmentKey | (typeof MACRO_KEYS)[number], FactorValue | null>>;

type Anchors = [number, number][];
/** Straight line between anchor points [figure, score], sorted by figure ascending or descending; flat outside. */
export function interp(v: number, a: Anchors): number {
  const asc = a[0][0] <= a[a.length - 1][0];
  const pts = asc ? a : [...a].reverse();
  if (v <= pts[0][0]) return pts[0][1];
  if (v >= pts[pts.length - 1][0]) return pts[pts.length - 1][1];
  for (let i = 1; i < pts.length; i++) if (v <= pts[i][0]) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; return y0 + ((v - x0) / (x1 - x0)) * (y1 - y0); }
  return pts[pts.length - 1][1];
}

export const SCORE_TABLES = {
  cet1Pct: [[10, 20], [14, 60], [18, 90]] as Anchors,
  totalCapitalPct: [[14, 20], [18, 60], [22, 90]] as Anchors,
  npePct: [[6, 20], [2, 70], [1, 90]] as Anchors,
  roePct: [[0, 20], [6, 60], [12, 90]] as Anchors,
  costIncomePct: [[80, 20], [60, 65], [45, 90]] as Anchors,
  lcrPct: [[110, 30], [150, 80], [200, 90]] as Anchors,
  nsfrPct: [[100, 30], [115, 80], [130, 90]] as Anchors,
  solvencyIIPct: [[100, 20], [150, 60], [200, 85], [250, 95]] as Anchors,
  combinedRatioPct: [[105, 20], [98, 65], [92, 90]] as Anchors,
};

export type Fig = { parameter: string; value: number; period: string | null; url: string };
export type FinTerm = { key: string; weight: number; min: number; max: number; origin: string; detail?: string };

/** Mandatory cited figures per kind. For asset quality either NPE or NPL counts (the label of the published ratio is kept, never converted). */
export const MANDATORY_FIGURES: Record<FinKind, string[][]> = {
  bank: [["cet1Pct"], ["totalCapitalPct"], ["npePct", "nplPct"], ["roePct"], ["costIncomePct"], ["pretaxProfitEurM"], ["lcrPct"], ["nsfrPct"]],
  insurer: [["solvencyIIPct"], ["combinedRatioPct"]],
};

const pick = (figs: Fig[] | undefined, names: string[]) => figs?.find((f) => names.includes(f.parameter) && Number.isFinite(f.value));
const mix = (parts: { fig: Fig | undefined; table: Anchors; w: number }[]): { value: number; period: string | null; detail: string } | null => {
  if (parts.some((p) => !p.fig)) return null;
  const value = parts.reduce((s, p) => s + p.w * interp(p.fig!.value, p.table), 0);
  const periods = parts.map((p) => p.fig!.period).filter(Boolean) as string[];
  return { value, period: periods.sort()[0] ?? null, detail: parts.map((p) => `${p.fig!.parameter} ${p.fig!.value}`).join(", ") };
};

/** Terms of the IR sum for a bank or insurer. Unknown ones keep bounds 0..100. `typed` holds the judgment and macro factors. */
export function financialTerms(kind: FinKind, figs: Fig[] | undefined, typed: FinFactorMap = {}): FinTerm[] {
  const W = kind === "bank" ? BANK_WEIGHTS : INSURER_WEIGHTS;
  const out: FinTerm[] = [];
  const add = (key: string, weight: number, r: { value: number; detail: string } | null) =>
    out.push(r ? { key, weight: weight / 100, min: r.value, max: r.value, origin: "accounts", detail: r.detail } : { key, weight: weight / 100, min: 0, max: 100, origin: "unknown" });
  const typedKnown = (k: JudgmentKey) => { const v = typed[k]; return v && Number.isFinite(v.value) && v.value >= 0 && v.value <= 100 && (v.origin === "typed" || v.origin === "accounts") ? { value: v.value, detail: `${v.origin} ${v.metric ?? ""}`.trim() } : null; };
  if (kind === "bank") {
    add("capital", W_(W, "capital"), mix([{ fig: pick(figs, ["cet1Pct"]), table: SCORE_TABLES.cet1Pct, w: 0.6 }, { fig: pick(figs, ["totalCapitalPct"]), table: SCORE_TABLES.totalCapitalPct, w: 0.4 }]));
    add("assetQuality", W_(W, "assetQuality"), mix([{ fig: pick(figs, ["npePct", "nplPct"]), table: SCORE_TABLES.npePct, w: 1 }]));
    add("profitability", W_(W, "profitability"), mix([{ fig: pick(figs, ["roePct"]), table: SCORE_TABLES.roePct, w: 0.5 }, { fig: pick(figs, ["costIncomePct"]), table: SCORE_TABLES.costIncomePct, w: 0.5 }]));
    add("liquidity", W_(W, "liquidity"), mix([{ fig: pick(figs, ["lcrPct"]), table: SCORE_TABLES.lcrPct, w: 0.5 }, { fig: pick(figs, ["nsfrPct"]), table: SCORE_TABLES.nsfrPct, w: 0.5 }]));
    add("businessModel", W_(W, "businessModel"), typedKnown("businessModel"));
    add("support", W_(W, "support"), typedKnown("support"));
  } else {
    add("solvency", W_(W, "solvency"), mix([{ fig: pick(figs, ["solvencyIIPct"]), table: SCORE_TABLES.solvencyIIPct, w: 1 }]));
    add("underwriting", W_(W, "underwriting"), mix([{ fig: pick(figs, ["combinedRatioPct"]), table: SCORE_TABLES.combinedRatioPct, w: 1 }]));
    add("investments", W_(W, "investments"), typedKnown("investments"));
    add("reserves", W_(W, "reserves"), typedKnown("reserves"));
    add("businessMix", W_(W, "businessMix"), typedKnown("businessMix"));
    add("capitalQuality", W_(W, "capitalQuality"), typedKnown("capitalQuality"));
  }
  // Macro block: the same six factors and inner weights as the corporate model, 10% of the total. Known only if typed or sourced.
  for (const k of MACRO_KEYS) {
    const v = typed[k], w = W.macro * MACRO_FACTOR_WEIGHTS[k];
    const ok = v && Number.isFinite(v.value) && v.value >= 0 && v.value <= 100 && (v.origin === "typed" || v.origin === "accounts");
    out.push(ok ? { key: k, weight: w / 100, min: v.value, max: v.value, origin: v.origin } : { key: k, weight: w / 100, min: 0, max: 100, origin: "unknown" });
  }
  return out;
}
function W_(w: Record<string, number>, k: string) { return w[k]; }

export function financialBounds(terms: FinTerm[]) {
  let lo = 0, hi = 0;
  for (const t of terms) { lo += t.weight * t.min; hi += t.weight * t.max; }
  const c = (v: number) => Math.max(0, Math.min(100, v));
  return { min: c(lo), max: c(hi), unknown: terms.filter((t) => t.origin === "unknown").map((t) => t.key) };
}

/** Capital-structure tier of a bond from its verified seniority (the owner's existing tier table). Null = no tier for this seniority. */
export function tierOf(kind: FinKind, holding: boolean, seniority: string | undefined): CapitalStructureTier | null {
  switch (seniority) {
    case "secured": return "senior-secured";
    case "senior_preferred": case "senior_unsecured": return holding ? "senior-unsecured-holdco" : "senior-unsecured-opco";
    case "senior_non_preferred": return "senior-non-preferred-bank";
    case "tier2": return kind === "insurer" ? "tier2-insurance-subordinated" : "tier2-bank";
    case "at1": return "at1-deeply-subordinated";
    default: return null;
  }
}
