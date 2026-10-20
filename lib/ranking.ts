import type { PublicBond, RankedBond } from "./types";
import { cleanIssuer } from "./issuer";
import { bondNotch, riskOfNotch } from "./ratings";
import { riskLevel, LIMITS, nearHorizon, isOpenEnded } from "./limits";
import { expectedLoss, lossAdjustedYield } from "./expectedLoss";

export const RESULT_COUNT = 10;

// Bonds with no rating are treated as just below investment grade.
export const UNRATED_NOTCH = 10;

// Portfolio duration window: target ±20% (13 years -> 10.4 to 15.6), widened in half-years if fewer than 10 issuers.
export const DURATION_WINDOW = 0.2;
const EXTRA_BAND = 2; // most years the window may widen by
// The list's average duration should stay within 5% of the target; each year beyond costs this much yield.
const AVG_DURATION_SLACK = 0.05;
const AVG_DURATION_PENALTY = 0.5;
// Below the slider maximum the target sets how much risk the list takes: the lowest expected default losses that still
// reach it (Livio 20/10: not the average risk score, since 5 bonds at risk 6 plus 5 at risk 1 is riskier than 5 at 3
// plus 5 at 4). Expected losses grow much faster than the risk score, so a few bonds at the limit cost more than a
// spread of mid-risk ones. Weighted so one risk step costs about one point; yield after losses only breaks near-ties.
const LOSS_WEIGHT = 10;
const YIELD_TIEBREAK = 0.05;

/**
 * Top bonds for a target duration and yield (Portfolio mode).
 * 1. Pool: rated bonds within the risk level, duration within ±20% of the target, one bond per issuer.
 * 2. Each bond scores its yield after expected losses (lib/expectedLoss.ts): yield minus the yearly historical default
 *    rate for its rating over its duration times a 60% loss. More yield wins unless it does not pay for the extra risk.
 * 3. Below the slider maximum: the 10 with the lowest average expected default loss whose average yield still reaches
 *    the target and whose average duration stays close to the horizon; ties go to the higher yield after losses.
 *    A lower target gives a safer list with a lower yield; a higher one takes more risk for more yield.
 * 4. At (or above) the slider maximum the answer is exactly the 10 highest-yielding issuers the maximum is computed from.
 * Shown best score first.
 */
export function rankBonds(bonds: PublicBond[], targetDuration: number, targetYtm: number, count = RESULT_COUNT, risk: number = LIMITS.risk.max): { results: RankedBond[]; band: number } {
  const { pool, band } = portfolioPool(withinRisk(bonds, risk), targetDuration, count);
  const cands = pool.map((b) => {
    const ratingNotch = bondNotch(b);
    const notch = ratingNotch ?? UNRATED_NOTCH;
    return { ...b, ratingNotch, notch, rk: riskOfNotch(notch) ?? LIMITS.risk.max, key: issuerKey(b), loss: LOSS_WEIGHT * expectedLoss(notch, b.modifiedDuration!), score: lossAdjustedYield(b.grossYtm!, notch, b.modifiedDuration!) };
  });
  const top = topIssuers(cands, count);
  if (!top.length) return { results: [], band };

  let chosen: typeof cands;
  if (targetYtm >= capOf(top.map((b) => b.grossYtm!)) - 1e-9) {
    chosen = top;
  } else {
    // Swap bonds in and out while that improves the set: reach the target yield first, keep the average duration near
    // the target, then the lowest expected default losses, then the highest yield after losses. One swap at a time can get
    // stuck on a "barbell" (very safe bonds plus a few at the risk limit) because dropping a risky bond for a mid-risk
    // one loses yield until a second swap makes it up. So the search also starts from every lower risk limit: a list
    // that works with risk up to 5 is also a candidate at 6, and accepting more risk can never give a riskier list
    // than needed. The lowest cost wins.
    const n = top.length;
    const slack = AVG_DURATION_SLACK * targetDuration;
    const costOf = (ytm: number, dur: number, loss: number, score: number) =>
      Math.max(0, targetYtm - ytm / n) * 1000 + Math.max(0, (isOpenEnded(targetDuration) ? targetDuration - dur / n : Math.abs(dur / n - targetDuration)) - slack) * AVG_DURATION_PENALTY + loss / n - (YIELD_TIEBREAK * score) / n;
    const search = (start: typeof cands, from: typeof cands) => {
      const set = [...start];
      let ytm = set.reduce((s, b) => s + b.grossYtm!, 0);
      let dur = set.reduce((s, b) => s + b.modifiedDuration!, 0);
      let loss = set.reduce((s, b) => s + b.loss, 0);
      let score = set.reduce((s, b) => s + b.score, 0);
      let best = costOf(ytm, dur, loss, score);
      for (let iter = 0; iter < 400; iter++) {
        let move: { i: number; j: (typeof cands)[number]; c: number } | null = null;
        const used = new Set(set.map((b) => b.key));
        for (let i = 0; i < n; i++) {
          const out = set[i];
          for (const j of from) {
            if (j.isin === out.isin) continue;
            if (j.key !== out.key && used.has(j.key)) continue;
            const c = costOf(ytm - out.grossYtm! + j.grossYtm!, dur - out.modifiedDuration! + j.modifiedDuration!, loss - out.loss + j.loss, score - out.score + j.score);
            if (c < best - 1e-9 && (!move || c < move.c)) move = { i, j, c };
          }
        }
        if (!move) break;
        const out = set[move.i];
        ytm += move.j.grossYtm! - out.grossYtm!;
        dur += move.j.modifiedDuration! - out.modifiedDuration!;
        loss += move.j.loss - out.loss;
        score += move.j.score - out.score;
        set[move.i] = move.j;
        best = move.c;
      }
      return { set, cost: best };
    };
    let best: { set: typeof cands; cost: number } | null = null;
    const levels = [...new Set(cands.map((b) => b.rk))].sort((a, b) => a - b);
    for (const level of levels) {
      const sub = level === levels[levels.length - 1] ? cands : cands.filter((b) => b.rk <= level);
      if (new Set(sub.map((b) => b.key)).size < n) continue;
      const safest = topIssuersBy([...sub].sort((a, b) => a.loss - b.loss || b.score - a.score || a.isin.localeCompare(b.isin)), count);
      for (const start of [safest, topIssuers(sub, count)]) {
        // Searched inside the lower limit first, then free to use the whole pool from there.
        let r = search(start, sub);
        if (sub !== cands) r = search(r.set, cands);
        if (!best || r.cost < best.cost - 1e-9) best = r;
      }
    }
    chosen = best?.set ?? top;
  }

  const ordered = [...chosen].sort((a, b) => b.score - a.score || b.grossYtm! - a.grossYtm! || a.isin.localeCompare(b.isin));
  return {
    results: ordered.map(({ notch: _n, key: _k, rk: _r, loss: _l, ...b }, i) => ({ ...b, rank: i + 1 })),
    band,
  };
}

/** Portfolio pool: bonds within ±20% of the target duration, widened in half-years (up to 2 more) until `count` issuers are in. */
export function portfolioPool(bonds: PublicBond[], targetDuration: number, count = RESULT_COUNT): { pool: PublicBond[]; band: number } {
  const usable = bonds.filter((b) => b.grossYtm !== null && b.modifiedDuration !== null);
  const start = DURATION_WINDOW * targetDuration;
  let band = start;
  let pool = usable.filter((b) => nearHorizon(b.modifiedDuration!, targetDuration, band + 1e-9));
  while (distinctIssuers(pool) < count && band < start + EXTRA_BAND) {
    band += 0.5;
    pool = usable.filter((b) => nearHorizon(b.modifiedDuration!, targetDuration, band + 1e-9));
  }
  return { pool, band: Math.round(band * 100) / 100 };
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
  return Math.round(Math.min(LIMITS.ytm.max, Math.max(LIMITS.ytm.min + LIMITS.ytm.step, down)) * 100) / 100;
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
export function ytmCapsByRisk(bonds: PublicBond[], durations: readonly number[], ytmLimits: { min: number; max: number; step: number }) {
  const out: Record<string, Record<string, number | null>> = {};
  for (let r = LIMITS.risk.min; r <= LIMITS.risk.max; r++) out[String(r)] = ytmCaps(withinRisk(bonds, r), durations, ytmLimits);
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

const START_BAND = 1; // years either side of the target duration (1-bond mode)
const MAX_BAND = 3;

/** 1-bond mode: bonds within 1 year of the target duration, widened in half-years (up to 3) until `count` different issuers are in. */
export function durationPool(bonds: PublicBond[], targetDuration: number, count = RESULT_COUNT): { pool: PublicBond[]; band: number } {
  const usable = bonds.filter((b) => b.grossYtm !== null && b.modifiedDuration !== null);
  let band = START_BAND;
  let pool = usable.filter((b) => nearHorizon(b.modifiedDuration!, targetDuration, band));
  while (distinctIssuers(pool) < count && band < MAX_BAND) {
    band += 0.5;
    pool = usable.filter((b) => nearHorizon(b.modifiedDuration!, targetDuration, band));
  }
  return { pool, band };
}

/**
 * The highest target yield worth asking for at each duration step: the average yield of the best bond of each of the
 * 10 highest-yielding issuers in the portfolio pool for that duration (fewer when fewer issuers exist),
 * rounded down to the slider step so the top 10 can really reach it. Null when no bond is there.
 */
export function ytmCaps(bonds: PublicBond[], durations: readonly number[], ytmLimits: { min: number; max: number; step: number }): Record<string, number | null> {
  const caps: Record<string, number | null> = {};
  for (const d of durations) {
    const { pool } = portfolioPool(bonds, d);
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
