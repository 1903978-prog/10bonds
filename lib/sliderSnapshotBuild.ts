import type { PublicBond } from "./types";
import type { BandCand } from "./coherentFrontier";
import { bondRisk } from "./ratings";
import { LIST_SIZE, statOf, type BandConfig } from "./riskBands";
import type { StoredBand, StoredBands } from "./riskBandsBuild";
import { TERMS } from "./limits";
import { MAX_SPREAD } from "./riskWindow";
import { newestQuote, poolWindowOf, PORTFOLIO_SPEC, specRules, type LadderStep } from "./portfolioSpec";
import { checkNsList } from "./netSpread/check";
import { sectorExempt, specCandidates, specExclusion } from "./netSpread/candidates";

// Assembles and checks the 90 slider positions (owner, 28/10/2026): 30 per horizon, read from the stored risk-band lists
// (lib/riskBandsBuild.ts, solved by the precompute job, never here). Nothing is solved in this file and nothing is invented:
// every figure is recomputed from the bond rows of the same price batch before a position counts as filled.

export const METHOD_VERSION = `spec-${PORTFOLIO_SPEC.version}`;
export const HORIZONS = ["SHORT", "MEDIUM", "LONG"] as const;
export type Horizon = (typeof HORIZONS)[number];
export const horizonOf = (i: number): Horizon => HORIZONS[i];
export const POSITIONS = 30;

/**
 * How a position with no valid list is treated (decision pending with the owner):
 * "strict" = stays empty (filled = false) and the snapshot cannot be published as 90/90;
 * "share"  = shows the nearest listed position's real portfolio, flagged `mappedFrom` (never a new or invented list).
 */
export const EMPTY_POLICY: "strict" | "share" = "strict";

/** VALID = ten-bond portfolio verified; INFEASIBLE = no list exists under the approved rules (a real limit, not a failure); ERROR = a stored list failed the check; PENDING = not calculated yet. */
export type RowStatus = "VALID" | "INFEASIBLE" | "ERROR" | "PENDING";

export type SnapshotRow = {
  status: RowStatus;
  rowNo: number; horizon: Horizon; position: number; durationTarget: number;
  ytm: number | null; duration: number | null; risk: number | null; expectedLoss: number | null; worstRisk: number | null;
  bandMin: number; bandMax: number; optimal: boolean;
  /** Anchored bands: the ladder step the list was found at (0 strict; 1..3 = adjusted), the classes the position may hold and its target average risk. */
  ladder: number | null; classLo: number | null; classHi: number | null; target: number | null;
  /** Risk consistency: lowest and highest individual bond score, their difference and PASS (<= 2) / FAIL. */
  riskMin: number | null; riskMax: number | null; riskSpread: number | null; riskConsistency: "PASS" | "FAIL" | null;
  filled: boolean; error: string | null;
  isins: string[]; portfolioId: string | null;
  /** Position (same horizon) whose portfolio this one repeats: either the same list found twice or an empty position mapped to it. */
  sharedWith: number | null; mappedFrom: number | null;
};
export type Assembled = { rows: SnapshotRow[]; filled: number; distinct: number; blockers: string[] };

export const portfolioIdOf = (isins: string[]) => [...isins].sort().join(",");

const close = (a: number, b: number, tol: number) => Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= tol;

/** Independent check of one stored band against the bond rows. Returns the recomputed figures or the first reason it fails. */
export function validateBand(sb: StoredBand, bonds: Map<string, PublicBond>, cands: Map<string, BandCand>, duration: number, band: { k: number; min: number; max: number; allowed?: number[] }, newest: string | null = newestQuote([...bonds.values()])):
  { ok: true; ytm: number; dur: number; risk: number; el: number; worst: number; min: number; max: number } | { ok: false; error: string; min?: number; max?: number } {
  if (sb.status !== "ok") return { ok: false, error: sb.reason ?? "No list of 10 bonds exists for this position under the approved rules" };
  if (sb.isins.length !== LIST_SIZE || new Set(sb.isins).size !== LIST_SIZE) return { ok: false, error: `Needs exactly ${LIST_SIZE} different ISINs` };
  const rows: PublicBond[] = [];
  const sel: BandCand[] = [];
  for (const i of sb.isins) {
    const b = bonds.get(i), c = cands.get(i);
    if (!b || !c) return { ok: false, error: `${i} is not in the current bond data (stale list)` };
    if (b.grossYtm === null || !Number.isFinite(b.grossYtm) || b.modifiedDuration === null || !Number.isFinite(b.modifiedDuration) || bondRisk(b) === null)
      return { ok: false, error: `${i} has a missing yield, duration or risk` };
    rows.push(b); sel.push(c);
  }
  const scores = rows.map((b) => bondRisk(b)!);
  const min = Math.min(...scores), max = Math.max(...scores);
  if (max - min > MAX_SPREAD) return { ok: false, error: `Risk spread ${max - min} (bond scores ${min} to ${max}): more than 2 classes apart`, min, max };
  const ytm = rows.reduce((s, b) => s + b.grossYtm!, 0) / LIST_SIZE;
  const dur = rows.reduce((s, b) => s + b.modifiedDuration!, 0) / LIST_SIZE;
  const risk = rows.reduce((s, b) => s + bondRisk(b)!, 0) / LIST_SIZE;
  if (!close(ytm, sb.ytm ?? NaN, 0.0051) || !close(dur, sb.avgDur ?? NaN, 0.0051) || !close(risk, sb.avgRisk ?? NaN, 0.051))
    return { ok: false, error: "Stored averages differ from the bond rows (different price batch?)" };
  // The spec's data exclusions, re-judged on today's rows: a stored list never keeps a bond that has since gone stale or turned out subordinated.
  for (const b of rows) { const why = specExclusion(b, newest); if (why) return { ok: false, error: `${b.isin} is excluded by the spec (${why})` }; }
  // The bond duration window of the ladder step the list was found at (lists of step 2 and 3 may hold bonds outside the strict window).
  const step = Math.min(3, Math.max(0, sb.ladder ?? 0)) as LadderStep;
  const win = poolWindowOf(duration, step) * duration + 1e-6;
  for (const b of rows) if (Math.abs(b.modifiedDuration! - duration) > win + 2) return { ok: false, error: `${b.isin} lies outside the duration window of ladder step ${step}`, min, max };
  // The one validator of the spec: allowed classes of the position, class spread, the average-risk band, duration window, issuer and sector caps.
  const bad = checkNsList(sel.map((c, i) => ({ isin: c.b.isin, group: c.group ?? c.b.isin, sector: c.sector, cls: c.cls, dur: c.dur, exempt: sectorExempt(rows[i]) })), band.allowed ?? Array.from({ length: 10 }, (_, i) => i + 1), specRules(duration, step), sb.sumLo !== undefined && sb.sumHi !== undefined ? { sum: { lo: sb.sumLo, hi: sb.sumHi } } : {}).filter((c) => !c.ok);
  if (bad.length) return { ok: false, error: `Breaks the portfolio spec: ${bad.map((c) => c.detail).join("; ")}`, min, max };
  const s = statOf(sel);
  if (![ytm, dur, risk, s.el].every(Number.isFinite)) return { ok: false, error: "Non-finite figure" };
  return { ok: true, ytm, dur, risk, el: s.el, worst: max, min, max };
}

/** The 90 rows from the three stored sets (short, medium, long) over one price batch. `sets[i]` null = nothing stored for that horizon. */
export function assemble(sets: (StoredBands | null)[], bonds: PublicBond[], cfg: BandConfig, policy: "strict" | "share" = EMPTY_POLICY, onHorizon?: (h: number) => void): Assembled {
  const byIsin = new Map(bonds.map((b) => [b.isin, b]));
  const newest = newestQuote(bonds);
  const rows: SnapshotRow[] = [];
  const blockers: string[] = [];
  TERMS.forEach((t, h) => {
    const set = sets[h];
    const wide = specCandidates(bonds, t.duration, 3);
    const seen = new Map<string, number>();
    const part: SnapshotRow[] = [];
    for (const cb of cfg.bands) {
      const sb = set?.bands[cb.k - 1];
      // The band of this key (anchored bands depend on the key); the config only names the positions.
      const band = sb ? { k: cb.k, min: sb.min, max: sb.max, allowed: sb.allowed } : cb;
      const base = { rowNo: h * POSITIONS + band.k, horizon: horizonOf(h), position: band.k, durationTarget: t.duration, bandMin: band.min, bandMax: band.max, ladder: sb?.ladder ?? null, classLo: sb?.allowed ? Math.min(...sb.allowed) : null, classHi: sb?.allowed ? Math.max(...sb.allowed) : null, target: sb?.target ?? null };
      const empty: SnapshotRow = { ...base, status: "PENDING", ytm: null, duration: null, risk: null, expectedLoss: null, worstRisk: null, optimal: false, riskMin: null, riskMax: null, riskSpread: null, riskConsistency: null, filled: false, error: null, isins: [], portfolioId: null, sharedWith: null, mappedFrom: null };
      if (!sb) { part.push({ ...empty, error: "Nothing stored for this horizon (run the precompute job)" }); continue; }
      const v = validateBand(sb, byIsin, new Map(wide.map((c) => [c.b.isin, c])), t.duration, band, newest);
      if (!v.ok) { part.push({ ...empty, status: sb.status === "none" && !sb.failed ? "INFEASIBLE" : "ERROR", error: v.error, ...(v.min !== undefined ? { riskMin: v.min, riskMax: v.max!, riskSpread: v.max! - v.min, riskConsistency: "FAIL" as const } : {}) }); continue; }
      const pid = portfolioIdOf(sb.isins);
      const first = seen.get(pid);
      if (first === undefined) seen.set(pid, band.k);
      part.push({ ...base, status: "VALID", ytm: v.ytm, duration: v.dur, risk: v.risk, expectedLoss: v.el, worstRisk: v.worst, optimal: sb.optimal, riskMin: v.min, riskMax: v.max, riskSpread: v.max - v.min, riskConsistency: "PASS", filled: true, error: null, isins: [...sb.isins].sort(), portfolioId: pid, sharedWith: first ?? null, mappedFrom: null });
    }
    if (policy === "share") {
      part.forEach((r, i) => {
        if (r.filled) return;
        let best: SnapshotRow | null = null;
        for (const o of part) if (o.filled && !o.mappedFrom && (!best || Math.abs(o.position - r.position) < Math.abs(best.position - r.position))) best = o;
        if (best) part[i] = { ...best, rowNo: r.rowNo, position: r.position, bandMin: r.bandMin, bandMax: r.bandMax, sharedWith: best.position, mappedFrom: best.position, error: `Empty under the approved rules; shows position ${best.position}'s portfolio` };
      });
    }
    rows.push(...part);
    onHorizon?.(h);
    const miss = part.filter((r) => !r.filled && r.status !== "INFEASIBLE");
    if (miss.length) blockers.push(`${horizonOf(h)}: ${miss.length}/30 empty (positions ${miss.map((r) => r.position).join(", ")}). ${[...new Set(miss.map((r) => r.error))].join("; ")}`);
  });
  const filled = rows.filter((r) => r.filled).length;
  return { rows, filled, distinct: new Set(rows.filter((r) => r.portfolioId).map((r) => r.horizon + r.portfolioId)).size, blockers };
}

/** Whole-snapshot checks: 90 rows, 30 per horizon, no gap or duplicate index, every row resolved as VALID or INFEASIBLE. Returns the list of problems (empty = publishable; INFEASIBLE rows are allowed, ERROR and PENDING are not). */
export function snapshotProblems(rows: SnapshotRow[]): string[] {
  const bad: string[] = [];
  if (rows.length !== 90) bad.push(`${rows.length} rows instead of 90`);
  for (const h of HORIZONS) {
    const ps = rows.filter((r) => r.horizon === h).map((r) => r.position).sort((a, b) => a - b);
    if (ps.length !== POSITIONS || ps.some((p, i) => p !== i + 1)) bad.push(`${h} positions are not exactly 1..30`);
  }
  if (rows.some((r, i) => r.rowNo !== i + 1)) bad.push("Row numbers are not 1..90 in order");
  if (rows.some((r) => r.filled && (r.riskConsistency !== "PASS" || (r.riskSpread ?? 99) > MAX_SPREAD))) bad.push("A filled position breaks the risk-consistency rule (spread above 2)");
  const open = rows.filter((r) => r.status === "ERROR" || r.status === "PENDING").length;
  if (open) bad.push(`${open} positions not resolved (ERROR or PENDING)`);
  if (rows.some((r) => r.filled !== (r.status === "VALID"))) bad.push("Filled flag and status disagree");
  return bad;
}
