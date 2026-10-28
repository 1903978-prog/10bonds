import type { BondSource } from "./bonds";
import type { BondFilter } from "./bondFilter";
import type { PublicBond, RankedBond } from "./types";
import { isExactYear, isTermHorizon, TERMS } from "./limits";
import { snapshotHolding } from "./sliderSnapshot";
import { loadBandConfig } from "./riskBandsStore";
import { configSignature, type BandConfig } from "./riskBands";
import { bondsOfBand, servedBands } from "./riskBandsServe";
import { cachedLive, liveBand, rememberLive, type LiveStep } from "./riskBandsLive";
import { rowsOf, r2, r3 } from "./riskBandsBuild";
import { statOf, type RiskBand } from "./riskBands";
import type { BandCand } from "./coherentFrontier";

// The list behind one band position for /api/bonds?band=n (owner, 27/10/2026): the stored portfolio when there is one (a few milliseconds),
// else the progressive search (greedy start, swaps, time-boxed exact solve).

export type BandMeta = {
  k: number; min: number; max: number;
  /** Actual average risk score (0.1), average return (%), expected loss on your money (%), average duration (years). */
  avgRisk: number; ytm: number; el: number; avgDur: number;
  /** The exact solve proved this list best for the band. */
  optimal: boolean;
  /** "stored" = read from storage; "live" = worked out for this request (blacklist, advanced filters, cold start). */
  source: "stored" | "live";
  /** Stored set saved for slightly older prices (the next precompute replaces it). */
  stale?: boolean;
  phase?: LiveStep["phase"];
};
export type BandAnswer = { kind: "list"; results: RankedBond[]; meta: BandMeta } | { kind: "none"; band: RiskBand | null };

export const bandNumber = (raw: string | null): number | null => {
  const n = Number(raw);
  return raw !== null && Number.isInteger(n) && n >= 1 && n <= 30 ? n : null;
};
export const bandTerm = (duration: number) => isTermHorizon(duration);
/** A stored horizon: a term, or an exact year (only for plans that have it, checked by the caller). */
export const bandHorizon = (duration: number) => isTermHorizon(duration) || isExactYear(duration);

export function metaOfSel(band: RiskBand, sel: BandCand[], optimal: boolean, extra: Partial<BandMeta> = {}): BandMeta {
  const s = statOf(sel);
  return { k: band.k, min: band.min, max: band.max, avgRisk: Math.round(s.avgRisk * 10) / 10, ytm: r2(s.ytm), el: r3(s.el), avgDur: r2(s.avgDur), optimal, source: "live", ...extra };
}
/** Rows for a progressive step, shaped like a stored list. */
export const rowsOfSel = (sel: BandCand[]): RankedBond[] => rowsOf(sel.map((c) => c.b));

export const liveKey = (data: BondSource, filter: BondFilter, duration: number, n: number, exclusionKey: string, cfg: BandConfig) =>
  [data.asOf, data.bonds.length, filter.currency, filter.size, duration, n, exclusionKey, cfg.perCell, cfg.bands[n - 1].min, cfg.bands[n - 1].max, configSignature(cfg)].join("|");

/** The stored (or already finished) list for a band, "none" when the stored set says no list exists, or null when nothing applies (the progressive search then runs). */
export async function bandStored(data: BondSource, filter: BondFilter, duration: number, n: number, skip: ((b: PublicBond) => boolean) | null, exclusionKey: string, config?: BandConfig): Promise<BandAnswer | null> {
  const cfg = config ?? (await loadBandConfig());
  const band = cfg.bands[n - 1];
  if (!skip) {
    const sv = await servedBands(filter, duration, cfg);
    const sb = sv?.stored.bands[n - 1];
    if (sv && sb) {
      if (sb.status === "none") return { kind: "none", band };
      const bonds = bondsOfBand(sb, new Map(data.bonds.map((b) => [b.isin, b])));
      if (bonds && sb.ytm !== null && sb.el !== null && sb.avgRisk !== null && sb.avgDur !== null) {
        return { kind: "list", results: rowsOf(bonds), meta: { k: n, min: sb.min, max: sb.max, avgRisk: sb.avgRisk, ytm: sb.ytm, el: sb.el, avgDur: sb.avgDur, optimal: sb.optimal, source: "stored", ...(sv.stale ? { stale: true } : {}) } };
      }
    }
  }
  // The published snapshot is what the slider shows, so its list answers when the band store has none for that position (never an empty page for a position the slider offers).
  const term = !skip && isTermHorizon(duration) ? TERMS.find((t) => t.duration === duration)?.key : undefined;
  if (term) {
    try {
      const h = await snapshotHolding(filter, term as "short" | "mid" | "long", n);
      const byIsin = new Map(data.bonds.map((b) => [b.isin, b]));
      const bonds = h?.isins.map((i) => byIsin.get(i));
      if (h && bonds?.length && bonds.every((b): b is PublicBond => !!b) && h.pos.ytm !== null && h.pos.expectedLoss !== null && h.pos.avgRisk !== null) {
        const avgDur = bonds.reduce((a, b) => a + (b.modifiedDuration ?? 0), 0) / bonds.length;
        return { kind: "list", results: rowsOf(bonds), meta: { k: n, min: h.pos.band?.min ?? band.min, max: h.pos.band?.max ?? band.max, avgRisk: h.pos.avgRisk, ytm: h.pos.ytm, el: h.pos.expectedLoss, avgDur: r2(avgDur), optimal: h.pos.optimal === true, source: "stored" } };
      }
    } catch (e) { console.error("[bands] snapshot fallback failed:", (e as Error).message); }
  }
  const hit = cachedLive(liveKey(data, filter, duration, n, exclusionKey, cfg));
  return hit ? { kind: "list", results: rowsOfSel(hit.sel), meta: metaOfSel(band, hit.sel, hit.optimal, { phase: "done" }) } : null;
}

/** The progressive search run for a short time and answered with whatever it has (used when the caller does not stream). */
export async function bandLiveOnce(data: BondSource, filter: BondFilter, duration: number, n: number, skip: ((b: PublicBond) => boolean) | null, exclusionKey: string, config?: BandConfig): Promise<BandAnswer> {
  const cfg = config ?? (await loadBandConfig());
  const band = cfg.bands[n - 1];
  const pool = skip ? data.bonds.filter((b) => !skip(b)) : data.bonds;
  let last: LiveStep | null = null;
  const t0 = Date.now();
  for await (const st of liveBand(pool, duration, band, cfg, { exact: lowMemory() })) {
    last = st;
    if (st.phase === "exact" || st.phase === "done" || Date.now() - t0 > 1500) break;
  }
  if (!last) return { kind: "none", band };
  if (last.phase === "exact" || last.phase === "done") rememberLive(liveKey(data, filter, duration, n, exclusionKey, cfg), { sel: last.sel, stat: last.stat, optimal: last.optimal });
  return { kind: "list", results: rowsOfSel(last.sel), meta: metaOfSel(band, last.sel, last.optimal, { phase: last.phase }) };
}

/** The exact solve is skipped while the server is short of memory (a solve grows the solver's memory). */
export const lowMemory = () => process.memoryUsage().rss < 650 * 1024 * 1024;

/**
 * Keeps each bond in its row while the progressive search swaps bonds (owner 27/10): a swap puts the new bond in the row of the one that left,
 * so the page replaces that row in place; a jump to the exact list keeps the bonds both lists share where they are. `rank` is the row number.
 */
export class RowSlots {
  private order: string[] = [];
  /** Rows for this list in slot order, and the row numbers (1-based) that changed since the last call. */
  next(sel: BandCand[]): { rows: RankedBond[]; changed: number[] } {
    const ranked = rowsOf(sel.map((c) => c.b));
    const incoming = new Set(ranked.map((r) => r.isin));
    const first = this.order.length === 0;
    const kept = this.order.map((i) => (incoming.has(i) ? i : null));
    const fresh = ranked.map((r) => r.isin).filter((i) => !kept.includes(i));
    const order = first ? ranked.map((r) => r.isin) : kept.map((i) => i ?? fresh.shift()!);
    const changed = first ? [] : order.map((i, k) => (i === this.order[k] ? 0 : k + 1)).filter(Boolean);
    this.order = order;
    const by = new Map(ranked.map((r) => [r.isin, r]));
    return { rows: order.map((i, k) => ({ ...by.get(i)!, rank: k + 1 })), changed };
  }
}
