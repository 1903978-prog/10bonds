import type { PublicBond, RankedBond } from "./types";
import { cleanIssuer } from "./issuer";
import { bondNotch } from "./ratings";
import { riskLevel, LIMITS } from "./limits";

export const RESULT_COUNT = 10;

// How much one rating notch weighs against one percentage point of yield gap.
// AAA = 0, BBB- = 9: a BBB- bond needs to sit 0.18 points closer to the target to beat an AAA one.
// Kept small so the bond closest to the target yield comes first; the rating only decides near-ties.
export const NOTCH_PENALTY = 0.02;
// Bonds with no rating are treated as just below investment grade.
export const UNRATED_NOTCH = 10;

const START_BAND = 1; // years either side of the target duration
const MAX_BAND = 3;

/**
 * Top bonds for a target duration and yield.
 * 1. Same pool as the slider maximum: rated bonds within the risk level, duration within 1 year of the target
 *    (widened up to 3 years until 10 issuers are in), one bond per issuer.
 * 2. Choose the 10 bonds whose AVERAGE yield is closest to the target. Among sets that hit the target, prefer bonds
 *    whose own yields sit close to it and better ratings.
 * 3. At (or above) the slider maximum the answer is exactly the 10 highest-yielding issuers the maximum is computed from.
 * Shown closest-to-target first.
 */
export function rankBonds(bonds: PublicBond[], targetDuration: number, targetYtm: number, count = RESULT_COUNT, risk: number = LIMITS.risk.max): { results: RankedBond[]; band: number } {
  const { pool, band } = durationPool(withinRisk(bonds, risk), targetDuration, count);
  const cands = pool.map((b) => {
    const ratingNotch = bondNotch(b);
    return { ...b, ratingNotch, notch: ratingNotch ?? UNRATED_NOTCH, key: issuerKey(b), score: 0 };
  });
  const top = topIssuers(cands, count);
  if (!top.length) return { results: [], band };

  let chosen: typeof cands;
  if (targetYtm >= capOf(top.map((b) => b.grossYtm!)) - 1e-9) {
    chosen = top;
  } else {
    // Start from the bonds individually closest to the target (one per issuer), then swap bonds in and out
    // while that brings the average closer to the target (or, once within 0.005, makes the set tighter).
    const indiv = (b: (typeof cands)[number]) => Math.abs(b.grossYtm! - targetYtm) + NOTCH_PENALTY * b.notch;
    const byIndiv = [...cands].sort((a, b) => indiv(a) - indiv(b) || a.isin.localeCompare(b.isin));
    chosen = topIssuersBy(byIndiv, count);
    const n = chosen.length;
    const costOf = (sum: number, spread: number) => Math.max(Math.abs(sum / n - targetYtm), 0.005) * 1000 + spread / n;
    let sum = chosen.reduce((s, b) => s + b.grossYtm!, 0);
    let spread = chosen.reduce((s, b) => s + indiv(b), 0);
    let best = costOf(sum, spread);
    const ind = new Map(cands.map((c) => [c.isin, indiv(c)]));
    for (let iter = 0; iter < 200; iter++) {
      let move: { i: number; j: (typeof cands)[number]; c: number } | null = null;
      const used = new Set(chosen.map((b) => b.key));
      for (let i = 0; i < n; i++) {
        const out = chosen[i];
        const baseSum = sum - out.grossYtm!;
        const baseSpread = spread - ind.get(out.isin)!;
        for (const j of cands) {
          if (j.isin === out.isin) continue;
          if (j.key !== out.key && used.has(j.key)) continue;
          const c = costOf(baseSum + j.grossYtm!, baseSpread + ind.get(j.isin)!);
          if (c < best - 1e-9 && (!move || c < move.c)) move = { i, j, c };
        }
      }
      if (!move) break;
      sum += move.j.grossYtm! - chosen[move.i].grossYtm!;
      spread += ind.get(move.j.isin)! - ind.get(chosen[move.i].isin)!;
      chosen[move.i] = move.j;
      best = move.c;
    }
  }

  const ordered = chosen
    .map((b) => ({ ...b, score: Math.abs(b.grossYtm! - targetYtm) + NOTCH_PENALTY * b.notch }))
    .sort((a, b) => a.score - b.score || b.grossYtm! - a.grossYtm! || a.isin.localeCompare(b.isin));
  return {
    results: ordered.map(({ notch: _n, key: _k, ...b }, i) => ({ ...b, rank: i + 1 })),
    band,
  };
}

/** The highest-yielding bond of each issuer, best issuers first, `count` of them. */
function topIssuers<T extends PublicBond & { key: string }>(cands: T[], count: number): T[] {
  const sorted = [...cands].sort((a, b) => b.grossYtm! - a.grossYtm! || a.isin.localeCompare(b.isin));
  return topIssuersBy(sorted, count);
}
function topIssuersBy<T extends { key: string }>(sorted: T[], count: number): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const b of sorted) {
    if (seen.has(b.key)) continue;
    seen.add(b.key);
    out.push(b);
    if (out.length === count) break;
  }
  return out;
}

/** The slider maximum for a set of yields: their average, rounded down to the slider step. */
export function capOf(yields: number[]): number {
  const avg = yields.reduce((s, x) => s + x, 0) / yields.length;
  const down = Math.floor(avg / LIMITS.ytm.step + 1e-9) * LIMITS.ytm.step;
  return Math.round(Math.min(LIMITS.ytm.max, Math.max(LIMITS.ytm.min + LIMITS.ytm.step, down)) * 10) / 10;
}

/** Bonds rated equal to or better than the slider level. Unrated bonds only at the last level. */
export function withinRisk(bonds: PublicBond[], risk: number): PublicBond[] {
  const { maxNotch, allowUnrated } = riskLevel(risk);
  return bonds.filter((b) => {
    const n = bondNotch(b);
    return n === null ? allowUnrated : n <= maxNotch;
  });
}

/** Yield caps per duration step for every risk level: { "1": {...}, ..., "10": {...} }. */
export function ytmCapsByRisk(bonds: PublicBond[], durLimits: { min: number; max: number; step: number }, ytmLimits: { min: number; max: number; step: number }) {
  const out: Record<string, Record<string, number | null>> = {};
  for (let r = LIMITS.risk.min; r <= LIMITS.risk.max; r++) out[String(r)] = ytmCaps(withinRisk(bonds, r), durLimits, ytmLimits);
  return out;
}

/** One key per issuer: bond terms, seat, legal form, case and punctuation do not make a different issuer. */
export function issuerKey(b: Pick<PublicBond, "issuer" | "isin">): string {
  const name = cleanIssuer(b.issuer);
  if (!name) return `isin:${b.isin}`;
  return name
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\b(s\.?\s?a|ag|se|n\.?v|b\.?v|plc|s\.p\.a|spa|gmbh|ltd|inc|oyj|asa|ab)\b\.?/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim() || `isin:${b.isin}`;
}

/** Bonds within 1 year of the target duration, widened in half-years (up to 3) until `count` different issuers are in. */
export function durationPool(bonds: PublicBond[], targetDuration: number, count = RESULT_COUNT): { pool: PublicBond[]; band: number } {
  const usable = bonds.filter((b) => b.grossYtm !== null && b.modifiedDuration !== null);
  let band = START_BAND;
  let pool = usable.filter((b) => Math.abs(b.modifiedDuration! - targetDuration) <= band);
  while (distinctIssuers(pool) < count && band < MAX_BAND) {
    band += 0.5;
    pool = usable.filter((b) => Math.abs(b.modifiedDuration! - targetDuration) <= band);
  }
  return { pool, band };
}

/**
 * The highest target yield worth asking for at each duration step: the average yield of the best bond of each of the
 * 10 highest-yielding issuers the ranking would look at for that duration (fewer when fewer issuers exist),
 * rounded down to the slider step so the top 10 can really reach it. Null when no bond is there.
 */
export function ytmCaps(bonds: PublicBond[], limits: { min: number; max: number; step: number }, ytmLimits: { min: number; max: number; step: number }): Record<string, number | null> {
  const caps: Record<string, number | null> = {};
  for (let d = limits.min; d <= limits.max + 1e-9; d += limits.step) {
    const { pool } = durationPool(bonds, d);
    const key = String(Math.round(d * 100) / 100);
    if (!pool.length) {
      caps[key] = null;
      continue;
    }
    const top = topIssuers(pool.map((b) => ({ ...b, key: issuerKey(b) })), RESULT_COUNT);
    caps[key] = capOf(top.map((b) => b.grossYtm!));
  }
  return caps;
}

const distinctIssuers = (rows: PublicBond[]) => new Set(rows.map(issuerKey)).size;

export function averages(rows: RankedBond[]) {
  const avg = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);
  return {
    ytm: avg(rows.map((r) => r.grossYtm!)),
    duration: avg(rows.map((r) => r.modifiedDuration!)),
    notch: avg(rows.filter((r) => r.ratingNotch !== null).map((r) => r.ratingNotch!)),
  };
}
