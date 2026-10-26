// Tunable numbers of the ranking and the outlier rule, edited at /admin/risk-premium -> Settings (the owner, 25/10/2026).
// Kept in app.settings as JSON (key risk_params); the defaults are the values that were hard-coded before.

export type RiskParams = {
  /** No single bond may yield more than this many points above the target (risk-adjusted ranking). */
  maxAboveTarget: number;
  /** The list's average yield should stay within this many points above the target. */
  avgAboveTarget: number;
  /** An outlier needs at least this many comparable bonds to be judged. */
  outlierMinPeers: number;
  /** Comparable bonds: duration within this share (0.2 = ±20%) of the bond's own, but at least ±1 year. */
  peerDuration: number;
  /** Curve shifts (bp) tried on the Sensitivity tab. */
  sensitivityShifts: number[];
};

export const DEFAULT_PARAMS: RiskParams = { maxAboveTarget: 2, avgAboveTarget: 0.5, outlierMinPeers: 8, peerDuration: 0.2, sensitivityShifts: [-50, -25, -10, 10, 25, 50] };

/** Label, help text and allowed range for each number, in the order the Settings tab shows them. */
export const PARAM_FIELDS: { key: Exclude<keyof RiskParams, "sensitivityShifts">; label: string; help: string; min: number; max: number; step: number; unit: string }[] = [
  { key: "maxAboveTarget", label: "Highest single bond above your target", help: "No bond in the risk-adjusted list may pay more than this over the target return.", min: 0.25, max: 5, step: 0.25, unit: "points" },
  { key: "avgAboveTarget", label: "List average above your target", help: "The list's average return should stay within this of the target.", min: 0, max: 3, step: 0.1, unit: "points" },
  { key: "outlierMinPeers", label: "Comparable bonds needed to call an outlier", help: "With fewer similar bonds the outlier rule does not judge a bond.", min: 3, max: 50, step: 1, unit: "bonds" },
  { key: "peerDuration", label: "Who counts as comparable (duration)", help: "Duration within this share of the bond's own (0.2 = 20%), at least 1 year either way.", min: 0.05, max: 0.5, step: 0.05, unit: "share" },
];

const clamp = (v: unknown, lo: number, hi: number, d: number) => {
  const n = Number(v);
  return v === null || v === undefined || v === "" || !Number.isFinite(n) ? d : Math.min(hi, Math.max(lo, n));
};

/** Any input to a valid set of parameters; missing or bad values fall back to the defaults. */
export function cleanParams(raw: unknown): RiskParams {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const out = { ...DEFAULT_PARAMS };
  for (const f of PARAM_FIELDS) out[f.key] = Math.round(clamp(r[f.key], f.min, f.max, DEFAULT_PARAMS[f.key]) * 100) / 100;
  out.outlierMinPeers = Math.round(out.outlierMinPeers);
  const shifts = Array.isArray(r.sensitivityShifts) ? r.sensitivityShifts.map(Number).filter((x) => Number.isFinite(x) && x !== 0 && Math.abs(x) <= 500) : [];
  out.sensitivityShifts = shifts.length ? [...new Set(shifts.map(Math.round))].sort((a, b) => a - b).slice(0, 10) : [...DEFAULT_PARAMS.sensitivityShifts];
  return out;
}

let current: RiskParams = DEFAULT_PARAMS;
export const riskParams = () => current;
export function setRiskParams(p: unknown): void {
  current = cleanParams(p);
}
