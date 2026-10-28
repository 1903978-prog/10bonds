import type { BandCand } from "./coherentFrontier";
import { listLifeLoss } from "./expectedLoss";

// The 30 "Return & risk" positions as AVERAGE-RISK BANDS (owner, 27/10/2026). Position n holds the 10 bonds with the highest
// average yield whose average 10BONDS risk score (1-10) lies in band n, inclusive. Scores are whole numbers, so the average
// of 10 bonds is a multiple of 0.1. Default bands: min = 1.0 + 0.3 (n-1), max = 1.2 + 0.3 (n-1); band 30 is 9.7-10.0.
// The bands are a config table (saved in the database, edited at /admin/risk-bands), never hard-coded in a rule.
// Every figure here is analytic (closed form).

/** Methodology 4 only: `allowed` = the bond risk classes this position may hold (lib/riskMatrix.ts); `step` = place i of m positions sharing them. */
export type RiskBand = { k: number; min: number; max: number; allowed?: number[]; step?: { i: number; m: number } };
export const BAND_COUNT = 30;
export const LIST_SIZE = 10;
/** Candidates kept per (duration year x risk score) cell, 10 different issuers each. Config value: top 10 changed the lists on live data (up to 0.25 pt more expected loss), top 30 is near identical (formula audit 27/10). */
export const DEFAULT_PER_CELL = 30;
const r1 = (x: number) => Math.round(x * 10) / 10;

export const defaultBands = (): RiskBand[] =>
  Array.from({ length: BAND_COUNT }, (_, i) => ({ k: i + 1, min: r1(1 + 0.3 * i), max: i === BAND_COUNT - 1 ? 10 : r1(1.2 + 0.3 * i) }));

export type BandConfig = { bands: RiskBand[]; perCell: number };
export const defaultConfig = (): BandConfig => ({ bands: defaultBands(), perCell: DEFAULT_PER_CELL });

/** A clean config from what the admin sent, or null when anything is out of range. Bands need 1 <= min <= max <= 10, at 0.1 steps, and 1..30 in order. */
export function cleanConfig(raw: unknown): BandConfig | null {
  const r = raw as { bands?: unknown; perCell?: unknown } | null;
  if (!r || !Array.isArray(r.bands) || r.bands.length !== BAND_COUNT) return null;
  const bands: RiskBand[] = [];
  for (let i = 0; i < BAND_COUNT; i++) {
    const b = r.bands[i] as { min?: unknown; max?: unknown };
    const min = Number(b?.min), max = Number(b?.max);
    if (!Number.isFinite(min) || !Number.isFinite(max) || min < 1 || max > 10 || min > max) return null;
    bands.push({ k: i + 1, min: r1(min), max: r1(max) });
  }
  const perCell = r.perCell === undefined ? DEFAULT_PER_CELL : Number(r.perCell);
  if (!Number.isInteger(perCell) || perCell < 10 || perCell > 200) return null;
  return { bands, perCell };
}

export const configSignature = (c: BandConfig) => `rb1:${c.perCell}:${c.bands.map((b) => `${b.min}-${b.max}${b.allowed ? `a${b.allowed.join("")}s${b.step?.i}of${b.step?.m}` : ""}`).join(",")}`;

/** Sum of the 10 scores that puts the average inside the band (whole numbers): null if no whole sum fits. */
export function sumRange(b: RiskBand): { lo: number; hi: number } | null {
  const lo = Math.ceil(b.min * LIST_SIZE - 1e-9), hi = Math.floor(b.max * LIST_SIZE + 1e-9);
  return lo <= hi ? { lo, hi } : null;
}

/** True when a bond of this risk score may be in the band's list (always, unless the band fixes the bond risk range). */
export const inClasses = (b: RiskBand, cls: number) => !b.allowed || b.allowed.includes(cls);

export const inBand = (avgRisk: number, b: RiskBand) => avgRisk >= b.min - 1e-9 && avgRisk <= b.max + 1e-9;

/** Candidate set: per (whole duration year x risk score) cell the `perCell` highest-yield bonds of different issuers (lower default chance on ties). */
export function pruneCandidates(cands: BandCand[], perCell: number): BandCand[] {
  const cells = new Map<string, BandCand[]>();
  for (const c of cands) {
    const k = `${Math.floor(c.dur)}|${c.cls}`;
    const a = cells.get(k);
    if (a) a.push(c); else cells.set(k, [c]);
  }
  const out: BandCand[] = [];
  for (const list of cells.values()) {
    list.sort((a, b) => b.ret - a.ret || a.pd - b.pd || a.b.isin.localeCompare(b.b.isin));
    const seen = new Set<string>();
    for (const c of list) {
      const g = c.group ?? c.b.isin;
      if (seen.has(g)) continue;
      seen.add(g);
      out.push(c);
      if (seen.size >= perCell) break;
    }
  }
  return out;
}

export type Rules = { /** Bonds per issuer group. */ perIssuer: number; /** Bonds per major sector. */ perSector: number; /** Horizon in years; the list's average duration stays within +-5%. */ duration: number };

export type Stat = { ytm: number; el: number; avgRisk: number; avgDur: number; sumRisk: number };
const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
/** Return, expected loss (lib/expectedLoss.ts listLifeLoss, in %), average risk and duration of a list. */
export function statOf(sel: BandCand[]): Stat {
  const sumRisk = sel.reduce((s, c) => s + c.cls, 0);
  return { ytm: mean(sel.map((c) => c.ret)), el: listLifeLoss(sel.map((c) => c.pd)), avgRisk: sumRisk / sel.length, avgDur: mean(sel.map((c) => c.dur)), sumRisk };
}

/** True when the list (10 bonds) obeys every band rule: average risk in band, issuer and sector caps, duration window. */
export function listOk(sel: BandCand[], band: RiskBand, rules: Rules): boolean {
  if (sel.length !== LIST_SIZE) return false;
  const sr = sumRange(band);
  if (!sr) return false;
  const s = statOf(sel);
  if (s.sumRisk < sr.lo || s.sumRisk > sr.hi) return false;
  if (Math.abs(s.avgDur - rules.duration) > rules.duration * 0.05 + 1e-9) return false;
  const g = new Map<string, number>(), sec = new Map<string, number>();
  for (const c of sel) {
    const gk = c.group ?? c.b.isin;
    g.set(gk, (g.get(gk) ?? 0) + 1);
    sec.set(c.sector, (sec.get(c.sector) ?? 0) + 1);
  }
  return Math.max(...g.values()) <= rules.perIssuer && Math.max(...sec.values()) <= rules.perSector;
}

const EPS = 1e-9;

/** Violation of band + duration (0 = fine), the quantity the repair step drives down. */
function violation(sel: BandCand[], sr: { lo: number; hi: number }, rules: Rules): number {
  const sum = sel.reduce((s, c) => s + c.cls, 0);
  const dur = mean(sel.map((c) => c.dur));
  const slack = rules.duration * 0.05;
  return Math.max(0, sr.lo - sum, sum - sr.hi) * 10 + Math.max(0, Math.abs(dur - rules.duration) - slack);
}

/**
 * Instant start (< 300 ms): 10 different issuers, highest yield first, but only bonds that keep the band reachable (the rest of the
 * list can still bring the average risk into the band), starting from the band's middle; then a repair by swaps if the duration or
 * the band still miss. null when no valid list is found (the exact solve then provides it).
 */
export function greedyStart(cands: BandCand[], band: RiskBand, rules: Rules): BandCand[] | null {
  const sr = sumRange(band);
  if (!sr || cands.length < LIST_SIZE) return null;
  const byYield = [...cands].sort((a, b) => b.ret - a.ret || a.pd - b.pd || a.b.isin.localeCompare(b.b.isin));
  const mid = (sr.lo + sr.hi) / 2;
  const sel: BandCand[] = [];
  const groups = new Map<string, number>(), sectors = new Map<string, number>();
  const room = (c: BandCand) => (groups.get(c.group ?? c.b.isin) ?? 0) < rules.perIssuer && (sectors.get(c.sector) ?? 0) < rules.perSector;
  const take = (c: BandCand) => {
    sel.push(c);
    groups.set(c.group ?? c.b.isin, (groups.get(c.group ?? c.b.isin) ?? 0) + 1);
    sectors.set(c.sector, (sectors.get(c.sector) ?? 0) + 1);
  };
  while (sel.length < LIST_SIZE) {
    const left = LIST_SIZE - sel.length - 1;
    const sum = sel.reduce((s, c) => s + c.cls, 0);
    // After this pick the rest (left bonds, scores 1..10) must still be able to land in the band.
    const reachable = (c: BandCand) => sum + c.cls + left * 1 <= sr.hi && sum + c.cls + left * 10 >= sr.lo;
    // Balanced: the running average may not run away from the middle by more than the remaining bonds can fix.
    const want = (mid - sum) / (left + 1);
    const pick = byYield.find((c) => !sel.includes(c) && room(c) && reachable(c) && Math.abs(c.cls - want) <= Math.max(2.5, 10 / (left + 1)));
    const fallback = pick ?? byYield.find((c) => !sel.includes(c) && room(c) && reachable(c));
    if (!fallback) return null;
    take(fallback);
  }
  // Repair: swap the single bond that cuts the violation most, losing the least yield, until the list is valid.
  for (let it = 0; it < 60 && violation(sel, sr, rules) > EPS; it++) {
    let best: { i: number; c: BandCand; v: number; y: number } | null = null;
    const v0 = violation(sel, sr, rules);
    for (let i = 0; i < sel.length; i++) {
      for (const c of byYield) {
        if (sel.includes(c)) continue;
        const next = sel.map((x, k) => (k === i ? c : x));
        if (!capsOk(next, rules)) continue;
        const v = violation(next, sr, rules);
        if (v >= v0 - EPS) continue;
        const y = mean(next.map((x) => x.ret));
        if (!best || v < best.v - EPS || (Math.abs(v - best.v) <= EPS && y > best.y)) best = { i, c, v, y };
      }
    }
    if (!best) return null;
    sel[best.i] = best.c;
  }
  return listOk(sel, band, rules) ? sel : null;
}

function capsOk(sel: BandCand[], rules: Rules): boolean {
  const g = new Map<string, number>(), sec = new Map<string, number>();
  for (const c of sel) {
    const gk = c.group ?? c.b.isin;
    if (g.set(gk, (g.get(gk) ?? 0) + 1).get(gk)! > rules.perIssuer) return false;
    if (sec.set(c.sector, (sec.get(c.sector) ?? 0) + 1).get(c.sector)! > rules.perSector) return false;
  }
  return true;
}

export type Step = { sel: BandCand[]; stat: Stat; out: string; in: string };

/**
 * Improvement by 1-for-1 swaps (owner 27/10, item 4b): a swap is accepted only if the list stays valid (average risk in the band, caps,
 * duration), the average yield is >= the current one, the expected loss is <= the current one, and at least one is strictly better.
 * Each accepted swap is one step; the best swap (largest yield gain, then loss drop) is taken first, so the yield never drops and the
 * expected loss never rises along the sequence. Stops when no swap helps, or after `maxSteps` / `deadlineMs`.
 * Every swap is judged from running sums (no list is rebuilt), so a pass over 2,000 candidates takes a few milliseconds.
 */
export function improveSteps(start: BandCand[], cands: BandCand[], band: RiskBand, rules: Rules, opts: { maxSteps?: number; deadlineMs?: number } = {}): Step[] {
  const sr = sumRange(band);
  if (!sr || start.length !== LIST_SIZE) return [];
  const sel = [...start];
  const steps: Step[] = [];
  const t0 = Date.now();
  const gk = (c: BandCand) => c.group ?? c.b.isin;
  const groups = new Map<string, number>(), sectors = new Map<string, number>();
  const bump = (m: Map<string, number>, k: string, d: number) => m.set(k, (m.get(k) ?? 0) + d);
  for (const c of sel) { bump(groups, gk(c), 1); bump(sectors, c.sector, 1); }
  let ret = sel.reduce((s, c) => s + c.ret, 0), el = sel.reduce((s, c) => s + c.pd, 0), risk = sel.reduce((s, c) => s + c.cls, 0), dur = sel.reduce((s, c) => s + c.dur, 0);
  const durSlack = LIST_SIZE * rules.duration * 0.05;
  const inList = new Set(sel);
  for (let n = 0; n < (opts.maxSteps ?? 200); n++) {
    if (opts.deadlineMs !== undefined && Date.now() - t0 > opts.deadlineMs) break;
    let best: { i: number; c: BandCand; ret: number; el: number } | null = null;
    for (let i = 0; i < sel.length; i++) {
      const o = sel[i];
      for (const c of cands) {
        if (inList.has(c)) continue;
        const nret = ret - o.ret + c.ret;
        const nel = el - o.pd + c.pd;
        // Averages compare through the sums (same list size); the 0.6 factor of the expected loss is common to both sides.
        if (nret < ret - EPS * LIST_SIZE || nel > el + EPS * LIST_SIZE) continue;
        if (!(nret > ret + EPS * LIST_SIZE || nel < el - EPS * LIST_SIZE)) continue;
        const nrisk = risk - o.cls + c.cls;
        if (nrisk < sr.lo || nrisk > sr.hi) continue;
        if (Math.abs(dur - o.dur + c.dur - LIST_SIZE * rules.duration) > durSlack + 1e-9) continue;
        const gc = gk(c), go = gk(o);
        if (gc !== go && (groups.get(gc) ?? 0) + 1 > rules.perIssuer) continue;
        if (c.sector !== o.sector && (sectors.get(c.sector) ?? 0) + 1 > rules.perSector) continue;
        if (!best || nret > best.ret + EPS * LIST_SIZE || (Math.abs(nret - best.ret) <= EPS * LIST_SIZE && nel < best.el - EPS * LIST_SIZE)) best = { i, c, ret: nret, el: nel };
      }
    }
    if (!best) break;
    const o = sel[best.i];
    bump(groups, gk(o), -1); bump(sectors, o.sector, -1);
    bump(groups, gk(best.c), 1); bump(sectors, best.c.sector, 1);
    inList.delete(o); inList.add(best.c);
    risk += best.c.cls - o.cls; dur += best.c.dur - o.dur; ret = best.ret; el = best.el;
    sel[best.i] = best.c;
    steps.push({ sel: [...sel], stat: statOf(sel), out: o.b.isin, in: best.c.b.isin });
  }
  return steps;
}

/** True when `a` is at least as good as `b` on both yield and expected loss (the rule for switching to the exact result). */
export const atLeastAsGood = (a: Stat, b: Stat) => a.ytm >= b.ytm - EPS && a.el <= b.el + EPS;

/** Bands whose best average yield is lower than a lower-numbered band's: flagged for the owner (points must not pay less going up). */
export function nonMonotonic(ytms: (number | null)[]): number[] {
  const bad: number[] = [];
  let top = -Infinity;
  ytms.forEach((y, i) => {
    if (y === null) return;
    if (y < top - 1e-9) bad.push(i + 1);
    top = Math.max(top, y);
  });
  return bad;
}
