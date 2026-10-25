import type { BondSource } from "./bonds";
import type { BondFilter } from "./bondFilter";
import type { BundCurve } from "./riskPremium/benchmark";
import { bundYieldAt } from "./riskPremium/benchmark";
import { frontierFor, frontierKey } from "./frontierCache";
import { efficientPoints, pickEven } from "./frontierPoints";
import { targetOf } from "./exactFrontier";
import { simulatePortfolio, type McStress } from "./monteCarlo";
import { bondRisk } from "./ratings";
import { lgdOf } from "./seniority";
import { balancedPick, kneeOf, marginalEfficiency, type Scored } from "./optimalPortfolio";

// Server side of "Find Optimal Portfolio" (admin Multi-year chart, docs/optimal-portfolio.md). Built in the background,
// one maturity (and one candidate) per turn, never on a request; the answer is cached per data copy, filter and model
// version, so it is only recalculated when the data or the model changes.

export const OPT_VERSION = "opt-1";
export const OPT_YEARS = [2, 3, 4, 5, 6, 7, 8, 9, 10];
export const OPT_CANDIDATES = 10; // evenly spread efficient lists per maturity (plus the knee) get the Monte Carlo
export const OPT_PATHS = 100_000;

export const STRESS: { label: string; mc: McStress }[] = [
  { label: "Default chances ×1.5", mc: { pdMult: 1.5 } },
  { label: "Default chances ×2", mc: { pdMult: 2 } },
  { label: "Loss given default +15 pp", mc: { lgdAdd: 0.15 } },
  { label: "Default chances ×1.5 and loss +15 pp", mc: { pdMult: 1.5, lgdAdd: 0.15 } },
];
export const UNAVAILABLE_INPUTS = [
  "Default correlation between issuers (the model treats defaults as independent, so ES95 is understated; no calibrated correlation data)",
  "Interest-rate, credit-spread and liquidity stress, callable-bond redemption (no such data in the bond copy)",
  "Reinvestment of coupons, trading costs, duration/liquidity penalty (set to zero)",
];

export type OptPoint = {
  ytm: number; el: number; isins: string[];
  /** The target that gives back exactly this list in the search (lib/exactFrontier.ts targetOf). */
  target: number;
};
export type OptOptimum = OptPoint & {
  /** Expected annual net return after defaults, %, from the Monte Carlo (timing and recovery included). */
  mu: number;
  /** Expected Shortfall 95%: average annual return of the worst 5% of paths, %. */
  es95: number;
  /** Unexpected tail: mu - es95, pp per year. */
  tail: number;
  efficiency: number | null;
};
export type OptMaturity = {
  years: number;
  lists: number;
  knee: (OptPoint & { efficiency: number | null; strength: number; stability: number; curvature: number }) | null;
  kneeReason: string;
  optimum: OptOptimum | null;
};
export type OptResult = {
  version: string;
  asOf: string | null;
  paths: number;
  maturities: OptMaturity[];
  winner: number | null;
  /** Bund yield used as the risk-free rate per maturity (%); empty when the data has no Bund curve for them. */
  rf: Record<number, number>;
  provisional: string[];
  unavailable: string[];
  stress: { total: number; sameWinner: number; labels: string[]; winners: (number | null)[] } | null;
};

const tick = () => new Promise<void>((r) => setImmediate(r));

type Cand = { years: number; idx: number; ytm: number; el: number; isins: string[]; mu: number; es95: number };

function simulate(rows: { grossYtm: number | null }[], d: number, mc: McStress = {}): { mu: number; es95: number } | null {
  const bonds = rows.map((b) => ({ ytm: b.grossYtm!, risk: bondRisk(b as never), lgd: lgdOf(b as never) }));
  const r = simulatePortfolio(bonds, d, OPT_PATHS, 1, mc);
  return r.expYield == null || r.es5 == null ? null : { mu: r.expYield, es95: r.es5 };
}

/** The winning maturity among all candidates: balanced pick of (net return - risk-free) against the tail, pooled. */
export function globalPick(cands: { years: number; mu: number; es95: number }[], rf: Record<number, number>, useRf: boolean): number | null {
  const items: Scored[] = cands.map((c) => ({ mu: c.mu - (useRf ? rf[c.years] ?? 0 : 0), tail: Math.max(0, c.mu - c.es95) }));
  const k = balancedPick(items);
  return k == null ? null : k;
}

export async function buildOptimal(src: BondSource, f: BondFilter, bund: BundCurve | null): Promise<OptResult> {
  const maturities: OptMaturity[] = [];
  const pool: Cand[] = [];
  const stressPool: Cand[][] = STRESS.map(() => []);
  for (const d of OPT_YEARS) {
    await tick();
    const pts = efficientPoints(frontierFor(src, f, d).points);
    if (pts.length < 2) continue;
    const shape = pts.map((p) => ({ ytm: p.ytm, el: p.el }));
    const kr = kneeOf(shape);
    const spread = pickEven(pts, OPT_CANDIDATES).map((p) => pts.indexOf(p));
    const idxs = [...new Set([...spread, ...(kr.knee ? [kr.knee.index] : [])])].sort((a, b) => a - b);
    const local: Cand[] = [];
    for (const idx of idxs) {
      await tick();
      const p = pts[idx];
      const base = simulate(p.rows, d);
      if (!base) continue;
      const c: Cand = { years: d, idx, ytm: p.ytm, el: p.el, isins: p.isins, ...base };
      local.push(c);
      STRESS.forEach((s, k) => {
        const r = simulate(p.rows, d, s.mc);
        if (r) stressPool[k].push({ ...c, ...r });
      });
    }
    const pickIdx = balancedPick(local.map((c) => ({ mu: c.mu, tail: Math.max(0, c.mu - c.es95) })));
    pool.push(...local);
    const opt = pickIdx == null ? null : local[pickIdx];
    const point = (i: number): OptPoint => ({ ytm: pts[i].ytm, el: pts[i].el, isins: pts[i].isins, target: targetOf(pts[i]) });
    maturities.push({
      years: d,
      lists: pts.length,
      knee: kr.knee ? { ...point(kr.knee.index), efficiency: marginalEfficiency(shape, kr.knee.index), strength: kr.knee.strength, stability: kr.knee.stability, curvature: kr.knee.curvature } : null,
      kneeReason: kr.reason,
      optimum: opt ? { ...point(opt.idx), mu: opt.mu, es95: opt.es95, tail: Math.max(0, opt.mu - opt.es95), efficiency: marginalEfficiency(shape, opt.idx) } : null,
    });
  }
  const rf: Record<number, number> = {};
  if (bund) for (const m of maturities) { const y = bundYieldAt(bund, m.years); if (y != null) rf[m.years] = y; }
  const useRf = maturities.length > 0 && maturities.every((m) => rf[m.years] != null);
  const provisional: string[] = [];
  if (!useRf) provisional.push("No Bund yield for every maturity in this data copy, so the comparison between maturities does not subtract a risk-free rate.");
  const winnerOf = (cs: Cand[]) => { const k = globalPick(cs, rf, useRf); return k == null ? null : cs[k].years; };
  const winner = winnerOf(pool);
  const winners = stressPool.map(winnerOf);
  return {
    version: OPT_VERSION,
    asOf: src.asOf ?? null,
    paths: OPT_PATHS,
    maturities,
    winner,
    rf,
    provisional,
    unavailable: UNAVAILABLE_INPUTS,
    stress: winner == null ? null : { total: STRESS.length, sameWinner: winners.filter((w) => w === winner).length, labels: STRESS.map((s) => s.label), winners },
  };
}

const done = new Map<string, OptResult>();
const building = new Map<string, Promise<OptResult>>();
const keyOf = (src: BondSource, f: BondFilter) => `${OPT_VERSION}|${OPT_PATHS}|${OPT_CANDIDATES}|${frontierKey(src, f, 0)}`;

/** The result if ready; otherwise null and it starts being built in the background (the API says "pending"). */
export function optimalFor(src: BondSource, f: BondFilter, bund: BundCurve | null): OptResult | null {
  const k = keyOf(src, f);
  const hit = done.get(k);
  if (hit) return hit;
  if (!building.has(k)) {
    const p = buildOptimal(src, f, bund).then((r) => { if (done.size > 6) done.clear(); done.set(k, r); return r; });
    building.set(k, p);
    p.catch((e) => console.error("[optimal] build failed:", (e as Error).message)).finally(() => building.delete(k));
  }
  return null;
}
