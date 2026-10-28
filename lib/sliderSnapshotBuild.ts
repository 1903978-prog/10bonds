import type { PublicBond } from "./types";
import { candidatesOf, type BandCand } from "./coherentFrontier";
import { bondRisk } from "./ratings";
import { listOk, LIST_SIZE, statOf, type BandConfig } from "./riskBands";
import { rulesFor, type StoredBand, type StoredBands } from "./riskBandsBuild";
import { TERMS } from "./limits";
import { MAX_SPREAD } from "./riskWindow";

// Assembles and checks the 90 slider positions (owner, 28/10/2026): 30 per horizon, read from the stored risk-band lists
// (lib/riskBandsBuild.ts, solved by the precompute job, never here). Nothing is solved in this file and nothing is invented:
// every figure is recomputed from the bond rows of the same price batch before a position counts as filled.

export const METHOD_VERSION = "bands-v1";
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

export type SnapshotRow = {
  rowNo: number; horizon: Horizon; position: number; durationTarget: number;
  ytm: number | null; duration: number | null; risk: number | null; expectedLoss: number | null; worstRisk: number | null;
  bandMin: number; bandMax: number; optimal: boolean;
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
export function validateBand(sb: StoredBand, bonds: Map<string, PublicBond>, cands: Map<string, BandCand>, duration: number, band: { k: number; min: number; max: number }):
  { ok: true; ytm: number; dur: number; risk: number; el: number; worst: number; min: number; max: number } | { ok: false; error: string; min?: number; max?: number } {
  if (sb.status !== "ok") return { ok: false, error: "No list of 10 bonds exists for this risk band under the approved rules" };
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
  const rules = rulesFor(duration);
  if (!listOk(sel, band, sb.sectorCapLifted ? { ...rules, perSector: LIST_SIZE } : rules)) return { ok: false, error: "Breaks a portfolio rule (risk band, issuer or sector cap, or duration window)" };
  const s = statOf(sel);
  if (![ytm, dur, risk, s.el].every(Number.isFinite)) return { ok: false, error: "Non-finite figure" };
  return { ok: true, ytm, dur, risk, el: s.el, worst: max, min, max };
}

/** The 90 rows from the three stored sets (short, medium, long) over one price batch. `sets[i]` null = nothing stored for that horizon. */
export function assemble(sets: (StoredBands | null)[], bonds: PublicBond[], cfg: BandConfig, policy: "strict" | "share" = EMPTY_POLICY, onHorizon?: (h: number) => void): Assembled {
  const byIsin = new Map(bonds.map((b) => [b.isin, b]));
  const rows: SnapshotRow[] = [];
  const blockers: string[] = [];
  TERMS.forEach((t, h) => {
    const set = sets[h];
    const cands = new Map(candidatesOf(bonds, t.duration, false).map((c) => [c.b.isin, c]));
    const seen = new Map<string, number>();
    const part: SnapshotRow[] = [];
    for (const band of cfg.bands) {
      const base = { rowNo: h * POSITIONS + band.k, horizon: horizonOf(h), position: band.k, durationTarget: t.duration, bandMin: band.min, bandMax: band.max };
      const sb = set?.bands[band.k - 1];
      const empty: SnapshotRow = { ...base, ytm: null, duration: null, risk: null, expectedLoss: null, worstRisk: null, optimal: false, riskMin: null, riskMax: null, riskSpread: null, riskConsistency: null, filled: false, error: null, isins: [], portfolioId: null, sharedWith: null, mappedFrom: null };
      if (!sb) { part.push({ ...empty, error: "Nothing stored for this horizon (run the precompute job)" }); continue; }
      const v = validateBand(sb, byIsin, cands, t.duration, band);
      if (!v.ok) { part.push({ ...empty, error: v.error, ...(v.min !== undefined ? { riskMin: v.min, riskMax: v.max!, riskSpread: v.max! - v.min, riskConsistency: "FAIL" as const } : {}) }); continue; }
      const pid = portfolioIdOf(sb.isins);
      const first = seen.get(pid);
      if (first === undefined) seen.set(pid, band.k);
      part.push({ ...base, ytm: v.ytm, duration: v.dur, risk: v.risk, expectedLoss: v.el, worstRisk: v.worst, optimal: sb.optimal, riskMin: v.min, riskMax: v.max, riskSpread: v.max - v.min, riskConsistency: "PASS", filled: true, error: null, isins: [...sb.isins].sort(), portfolioId: pid, sharedWith: first ?? null, mappedFrom: null });
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
    const miss = part.filter((r) => !r.filled);
    if (miss.length) blockers.push(`${horizonOf(h)}: ${miss.length}/30 empty (positions ${miss.map((r) => r.position).join(", ")}). ${[...new Set(miss.map((r) => r.error))].join("; ")}`);
  });
  const filled = rows.filter((r) => r.filled).length;
  return { rows, filled, distinct: new Set(rows.filter((r) => r.portfolioId).map((r) => r.horizon + r.portfolioId)).size, blockers };
}

/** Whole-snapshot checks: 90 rows, 30 per horizon, no gap or duplicate index, all filled. Returns the list of problems (empty = publishable). */
export function snapshotProblems(rows: SnapshotRow[]): string[] {
  const bad: string[] = [];
  if (rows.length !== 90) bad.push(`${rows.length} rows instead of 90`);
  for (const h of HORIZONS) {
    const ps = rows.filter((r) => r.horizon === h).map((r) => r.position).sort((a, b) => a - b);
    if (ps.length !== POSITIONS || ps.some((p, i) => p !== i + 1)) bad.push(`${h} positions are not exactly 1..30`);
  }
  if (rows.some((r, i) => r.rowNo !== i + 1)) bad.push("Row numbers are not 1..90 in order");
  if (rows.some((r) => r.filled && (r.riskConsistency !== "PASS" || (r.riskSpread ?? 99) > MAX_SPREAD))) bad.push("A filled position breaks the risk-consistency rule (spread above 2)");
  const open = rows.filter((r) => !r.filled).length;
  if (open) bad.push(`${open} positions not filled`);
  return bad;
}
