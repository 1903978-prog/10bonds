import type { PublicBond, RankedBond } from "./types";
import { bondNotch } from "./ratings";
import { LIMITS } from "./limits";
import { lossAdjustedYield, listLifeLoss } from "./expectedLoss";
import { pdOf } from "./tiers";
import { issuerKey, portfolioPool, RESULT_COUNT, UNRATED_NOTCH, withinRisk } from "./ranking";
import { isWeak, MAX_WEAK } from "./frontierGuard";

// Exact efficient frontier (the owner, 24/10/2026), replacing the swap search for the slider positions:
// choose 10 bonds at 1/10 each, minimise the summed default chance to maturity (so the expected loss on your money)
// subject to an average return of at least T, one bond per issuer, at most 2 bonds rated B+ or below (risk 8+), and the
// usual duration window (±20% of the horizon, lib/ranking.ts portfolioPool) and filters.
// Solved for every T at once by dynamic programming over issuers (a grouped knapsack: bonds picked, weak bonds picked,
// summed return in 0.01% steps, each bond's return rounded down so every list really reaches its target). This is the
// exact optimum of that integer programme, not a heuristic.
// To keep it fast, a bond is dropped first when 10 bonds of 10 other issuers each beat it (at least its return, at most
// its default chance, not weaker): any list using it can swap it for one of those without getting worse.

export const RETURN_UNIT = 0.01; // % per bond
const N = RESULT_COUNT;
const WEAK_SLOTS = MAX_WEAK + 1;

type Cand = { b: PublicBond; issuer: string; ret: number; pd: number; weak: boolean; u: number };

export type FrontierList = { /** summed return in steps */ u: number; ytm: number; el: number; isins: string[]; rows: RankedBond[] };
export type ExactFrontier = {
  /** Every efficient list, by return: strictly more return and strictly more expected loss from one to the next. */
  points: FrontierList[];
  /** The lowest-loss list whose average return reaches `target` (%), or null if none does. */
  at: (target: number) => FrontierList | null;
  /** Bonds left in the problem after dropping beaten ones. */
  size: number;
};

/** d beats b: no less return, no more default chance, not weaker; exact ties settled by ISIN so two never beat each other. */
const beats = (d: Cand, b: Cand) =>
  d.ret >= b.ret && d.pd <= b.pd && (b.weak || !d.weak) && (d.ret > b.ret || d.pd < b.pd || d.weak !== b.weak || d.b.isin < b.b.isin);

export function pruneBeaten(cands: Cand[], count = N): Cand[] {
  return cands.filter((b) => {
    const by = new Set<string>();
    for (const d of cands) if (d.issuer !== b.issuer && !by.has(d.issuer) && beats(d, b)) { by.add(d.issuer); if (by.size >= count) return false; }
    return true;
  });
}

/** The exact frontier for one horizon over the bonds given (already filtered: rated only, outliers out, blacklist out). */
export function exactFrontier(bonds: PublicBond[], duration: number): ExactFrontier {
  const { pool } = portfolioPool(withinRisk(bonds, LIMITS.risk.max), duration, N);
  const all: Cand[] = pool
    .filter((b) => b.grossYtm !== null && b.grossYtm > 0)
    .map((b) => ({ b, issuer: issuerKey(b), ret: b.grossYtm!, pd: pdOf(b), weak: isWeak(b), u: Math.floor(b.grossYtm! / RETURN_UNIT + 1e-9) }));
  const cands = pruneBeaten(all);
  const groups = new Map<string, Cand[]>();
  for (const c of [...cands].sort((a, b) => a.issuer.localeCompare(b.issuer) || a.b.isin.localeCompare(b.b.isin))) {
    const g = groups.get(c.issuer);
    if (g) g.push(c);
    else groups.set(c.issuer, [c]);
  }
  const issuers = [...groups.values()];
  const empty: ExactFrontier = { points: [], at: () => null, size: cands.length };
  if (issuers.length < N) return empty;

  // Highest summed return any list can reach: the best bond of each of the top 10 issuers.
  const R = issuers.map((g) => Math.max(...g.map((c) => c.u))).sort((a, b) => b - a).slice(0, N).reduce((s, u) => s + u, 0) + 1;
  const S = (N + 1) * WEAK_SLOTS * R;
  const ix = (c: number, w: number, r: number) => (c * WEAK_SLOTS + w) * R + r;
  let dp = new Float64Array(S).fill(Infinity);
  dp[ix(0, 0, 0)] = 0;
  const choice: Uint8Array[] = [];
  for (const g of issuers) {
    const next = dp.slice();
    const dec = new Uint8Array(S);
    for (let c = N - 1; c >= 0; c--) for (let w = 0; w < WEAK_SLOTS; w++) {
      const base = ix(c, w, 0);
      for (let k = 0; k < g.length; k++) {
        const o = g[k];
        const nw = w + (o.weak ? 1 : 0);
        if (nw >= WEAK_SLOTS) continue;
        const to = ix(c + 1, nw, 0) + o.u;
        const lim = R - o.u;
        for (let r = 0; r < lim; r++) {
          const v = dp[base + r];
          if (v === Infinity) continue;
          const nv = v + o.pd;
          if (nv < next[to + r] - 1e-12) { next[to + r] = nv; dec[to + r] = k + 1; }
        }
      }
    }
    dp = next;
    choice.push(dec);
  }

  // Lowest loss per summed return (any number of weak bonds up to the cap).
  const best = new Float64Array(R).fill(Infinity);
  const bestW = new Uint8Array(R);
  for (let r = 0; r < R; r++) for (let w = 0; w < WEAK_SLOTS; w++) {
    const v = dp[ix(N, w, r)];
    if (v < best[r] - 1e-12) { best[r] = v; bestW[r] = w; }
  }
  const lists = new Map<number, FrontierList>();
  const listAt = (r: number): FrontierList => {
    const hit = lists.get(r);
    if (hit) return hit;
    const picked: Cand[] = [];
    let c = N, w = bestW[r], u = r;
    for (let i = issuers.length - 1; i >= 0 && c > 0; i--) {
      const k = choice[i][ix(c, w, u)];
      if (!k) continue;
      const o = issuers[i][k - 1];
      picked.push(o);
      c--; w -= o.weak ? 1 : 0; u -= o.u;
    }
    const out = listOf(picked, r);
    lists.set(r, out);
    return out;
  };
  function listOf(picked: Cand[], r: number): FrontierList {
    const rows = picked
      .map((o) => ({ ...o.b, ratingNotch: bondNotch(o.b), score: lossAdjustedYield(o.ret, bondNotch(o.b) ?? UNRATED_NOTCH, o.b.modifiedDuration!), rank: 0 }))
      .sort((a, b) => b.score - a.score || b.grossYtm! - a.grossYtm! || a.isin.localeCompare(b.isin))
      .map((x, i) => ({ ...x, rank: i + 1 }));
    return {
      u: r,
      ytm: rows.reduce((s, x) => s + x.grossYtm!, 0) / rows.length,
      el: listLifeLoss(picked.map((o) => o.pd)),
      isins: rows.map((x) => x.isin).sort(),
      rows,
    };
  }

  // The two ends exactly, without rounding the returns: the highest-return list (least loss among equals) and the
  // lowest-loss list (most return among equals). Same rules, a small DP over (bonds picked, weak bonds picked).
  const endList = (better: (a: [number, number], b: [number, number]) => boolean): FrontierList | null => {
    const T = (N + 1) * WEAK_SLOTS;
    let v: ([number, number] | null)[] = Array(T).fill(null); // [return sum, pd sum]
    v[0] = [0, 0];
    const dec: Uint8Array[] = [];
    for (const g of issuers) {
      const nv = v.slice();
      const d = new Uint8Array(T);
      for (let c = N - 1; c >= 0; c--) for (let w = 0; w < WEAK_SLOTS; w++) {
        const cur = v[c * WEAK_SLOTS + w];
        if (!cur) continue;
        g.forEach((o, k) => {
          const nw = w + (o.weak ? 1 : 0);
          if (nw >= WEAK_SLOTS) return;
          const t = (c + 1) * WEAK_SLOTS + nw;
          const cand: [number, number] = [cur[0] + o.ret, cur[1] + o.pd];
          if (!nv[t] || better(cand, nv[t]!)) { nv[t] = cand; d[t] = k + 1; }
        });
      }
      v = nv;
      dec.push(d);
    }
    let w = -1;
    for (let x = 0; x < WEAK_SLOTS; x++) { const c = v[N * WEAK_SLOTS + x]; if (c && (w < 0 || better(c, v[N * WEAK_SLOTS + w]!))) w = x; }
    if (w < 0) return null;
    const picked: Cand[] = [];
    let c = N;
    for (let i = issuers.length - 1; i >= 0 && c > 0; i--) {
      const k = dec[i][c * WEAK_SLOTS + w];
      if (!k) continue;
      const o = issuers[i][k - 1];
      picked.push(o);
      c--; w -= o.weak ? 1 : 0;
    }
    return listOf(picked, picked.reduce((s, o) => s + o.u, 0));
  };
  const top = endList((a, b) => a[0] > b[0] + 1e-9 || (Math.abs(a[0] - b[0]) <= 1e-9 && a[1] < b[1] - 1e-12));
  const safest = endList((a, b) => a[1] < b[1] - 1e-12 || (Math.abs(a[1] - b[1]) <= 1e-12 && a[0] > b[0] + 1e-9));

  // Efficient summed returns: walking down from the top, each one that costs strictly less loss than every higher one.
  const eff: number[] = [];
  let min = Infinity;
  for (let r = R - 1; r >= 0; r--) if (best[r] < min - 1e-12) { min = best[r]; eff.push(r); }
  eff.reverse();
  // The exact ends join the stepped lists; anything they beat goes (they can beat a stepped list by under 0.01%).
  const byRet = [...eff.map(listAt), ...[safest, top].filter((x): x is FrontierList => !!x)];
  const seen = new Set<string>();
  const points = byRet
    .filter((p) => { const k = p.isins.join(); if (seen.has(k)) return false; seen.add(k); return true; })
    .sort((a, b) => b.ytm - a.ytm || a.el - b.el)
    .filter(((min) => (p: FrontierList) => (p.el < min - 1e-12 ? ((min = p.el), true) : false))(Infinity))
    .reverse();
  return {
    points,
    size: cands.length,
    // The lowest-loss list that reaches the target: the first efficient list at or above it.
    at: (target) => points.find((p) => p.ytm >= target - 1e-9) ?? null,
  };
}

/** The target that gives back exactly this list from `at`: its own average return, rounded down. */
export const targetOf = (p: Pick<FrontierList, "ytm">) => Math.floor(p.ytm * 1e6 + 1e-6) / 1e6;
