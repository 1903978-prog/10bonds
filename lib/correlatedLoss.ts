// Dependence-sensitive default scenarios (paper section 6; quant correction phase D2). A Gaussian-copula, three-factor model:
//   A_i = sqrt(rg) G + sqrt(rs) S[sector(i)] + sqrt(rc) C[country(i)] + sqrt(1 - rg - rs - rc) e_i,   bond i defaults iff A_i < Φ^-1(PD_i)
// with G the global credit cycle, S one factor per sector, C one factor per issuer country, e_i the issuer's own shock, all standard
// normal. A_i is standard normal for ANY loadings, so every bond keeps exactly its intended default chance PD_i (the marginal
// reconciliation the paper asks for); only the joint behaviour changes. Optionally the loss given default rises in bad cycles:
// LGD_s = min(1, LGD + lgdStress x max(0, -G_s)), 0 = recoveries independent of the cycle.
//
// STATUS: EXPERIMENTAL, NOT CALIBRATED. No asset-correlation or default-clustering data exists in the project, so the presets below are
// illustrative stress settings to test the machinery and show the direction and size of the effect. They must never be described as
// estimated from data, and nothing in production uses them (no engine policy selects them yet).

export type FactorPreset = { id: "independent" | "moderate" | "severe"; rhoGlobal: number; rhoSector: number; rhoCountry: number; lgdStress: number; calibrated: false };
export const PRESETS: Record<FactorPreset["id"], FactorPreset> = {
  independent: { id: "independent", rhoGlobal: 0, rhoSector: 0, rhoCountry: 0, lgdStress: 0, calibrated: false },
  moderate: { id: "moderate", rhoGlobal: 0.1, rhoSector: 0.05, rhoCountry: 0.03, lgdStress: 0, calibrated: false },
  severe: { id: "severe", rhoGlobal: 0.25, rhoSector: 0.1, rhoCountry: 0.05, lgdStress: 0, calibrated: false },
};
export const CORRELATION_MODEL_VERSION = "gauss3-uncalibrated-v1";

function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** Standard normal draws (Box-Muller), seeded. */
function normals(rand: () => number) {
  let spare: number | null = null;
  return () => {
    if (spare !== null) { const s = spare; spare = null; return s; }
    const u = Math.max(rand(), 1e-300), v = rand();
    const r = Math.sqrt(-2 * Math.log(u));
    spare = r * Math.sin(2 * Math.PI * v);
    return r * Math.cos(2 * Math.PI * v);
  };
}

/** Inverse of the standard normal distribution function (Acklam's rational approximation, error below 1.2e-9). */
export function normInv(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
  const lo = 0.02425;
  if (p < lo) { const q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  if (p > 1 - lo) { const q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  const q = p - 0.5, r = q * q;
  return ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

export type Exposure = { /** default chance over the bond's life, 0..1 */ pd: number; /** loss given default, 0..1 */ lgd: number; sector: string; country: string };

export type Scenarios = {
  S: number;
  N: number;
  /** For scenario s and bond i: loss as a fraction of that bond's money (0 when it does not default). Sparse: only defaults are listed. */
  events: { s: number; i: number; loss: number }[];
  /** The global factor per scenario (negative = bad cycle). */
  cycle: Float64Array;
};

/** Default scenarios for a set of exposures (a portfolio's ten bonds, or a whole candidate universe for the optimiser). */
export function generateScenarios(items: Exposure[], preset: FactorPreset, S: number, seed = 1): Scenarios {
  const N = items.length;
  const rest = 1 - preset.rhoGlobal - preset.rhoSector - preset.rhoCountry;
  if (rest <= 0 || [preset.rhoGlobal, preset.rhoSector, preset.rhoCountry].some((x) => x < 0)) throw new Error("Factor loadings must be >= 0 and sum to less than 1");
  const rg = Math.sqrt(preset.rhoGlobal), rs = Math.sqrt(preset.rhoSector), rc = Math.sqrt(preset.rhoCountry), re = Math.sqrt(rest);
  const thr = items.map((x) => normInv(Math.min(1, Math.max(0, x.pd))));
  const sectors = [...new Set(items.map((x) => x.sector))], countries = [...new Set(items.map((x) => x.country))];
  const sIdx = items.map((x) => sectors.indexOf(x.sector)), cIdx = items.map((x) => countries.indexOf(x.country));
  const z = normals(mulberry32(seed));
  const events: Scenarios["events"] = [];
  const cycle = new Float64Array(S);
  const sf = new Float64Array(sectors.length), cf = new Float64Array(countries.length);
  for (let s = 0; s < S; s++) {
    const G = z();
    cycle[s] = G;
    for (let k = 0; k < sf.length; k++) sf[k] = z();
    for (let k = 0; k < cf.length; k++) cf[k] = z();
    const stress = preset.lgdStress * Math.max(0, -G);
    for (let i = 0; i < N; i++) {
      const a = rg * G + rs * sf[sIdx[i]] + rc * cf[cIdx[i]] + re * z();
      if (a < thr[i]) events.push({ s, i, loss: Math.min(1, items[i].lgd + stress) });
    }
  }
  return { S, N, events, cycle };
}

export type PortfolioRisk = {
  preset: FactorPreset["id"];
  paths: number;
  expectedLossPct: number;
  /** Probability that at least one bond defaults (principal shortfall). */
  anyDefaultPct: number;
  /** Probability that two given bonds both default, averaged over pairs (the independent baseline is the mean of pd_i x pd_j). */
  jointDefaultPairPct: number;
  /** P(exactly k defaults), k = 0..n. */
  defaultCountPct: number[];
  var95Pct: number;
  /** Average loss of the worst 5% of scenarios, % of the money. */
  cvar95Pct: number;
  /** One standard error of the expected loss estimate, percentage points. */
  expectedLossSePct: number;
};

/** Risk statistics of an equal-weight portfolio under a preset (loss as % of the money invested). */
export function portfolioRisk(items: Exposure[], preset: FactorPreset, paths = 200_000, seed = 1): PortfolioRisk {
  const n = items.length;
  const sc = generateScenarios(items, preset, paths, seed);
  const loss = new Float64Array(paths), count = new Uint8Array(paths);
  const pair = new Float64Array(n * n);
  const defaulted = new Map<number, number[]>();
  for (const e of sc.events) {
    loss[e.s] += e.loss / n;
    count[e.s]++;
    (defaulted.get(e.s) ?? defaulted.set(e.s, []).get(e.s)!).push(e.i);
  }
  for (const list of defaulted.values()) for (const a of list) for (const b of list) if (a < b) pair[a * n + b]++;
  let pairs = 0, pairSum = 0;
  for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) { pairs++; pairSum += pair[a * n + b] / paths; }
  const sorted = Float64Array.from(loss).sort();
  const tail = Math.ceil(paths * 0.05);
  let tailSum = 0;
  for (let k = paths - tail; k < paths; k++) tailSum += sorted[k];
  let mean = 0, sq = 0;
  for (let s = 0; s < paths; s++) { mean += loss[s]; sq += loss[s] * loss[s]; }
  mean /= paths;
  const dist = new Array(n + 1).fill(0);
  for (let s = 0; s < paths; s++) dist[count[s]]++;
  return {
    preset: preset.id, paths,
    expectedLossPct: mean * 100,
    anyDefaultPct: (100 * (paths - dist[0])) / paths,
    jointDefaultPairPct: (100 * pairSum) / pairs,
    defaultCountPct: dist.map((c: number) => (100 * c) / paths),
    var95Pct: sorted[Math.min(paths - 1, Math.ceil(paths * 0.95) - 1)] * 100,
    cvar95Pct: (tailSum / tail) * 100,
    expectedLossSePct: (Math.sqrt(Math.max(0, sq / paths - mean * mean) / paths)) * 100,
  };
}
