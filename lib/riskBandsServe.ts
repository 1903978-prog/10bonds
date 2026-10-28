import type { BondSource } from "./bonds";
import { loadBondsFor } from "./bonds";
import type { BondFilter } from "./bondFilter";
import type { PublicBond } from "./types";
import { signatureOf } from "./bestTable";
import { policySignature } from "./coherence";
import { GROUP_TABLE_VERSION } from "./issuerGroups";
import { bondRisk } from "./ratings";
import { riskConsistent } from "./riskWindow";
import { configSignature, type BandConfig } from "./riskBands";
import { loadBandConfig, loadStoredBands } from "./riskBandsStore";
import type { StoredBand, StoredBands } from "./riskBandsBuild";
import type { SliderPosition } from "./sliderPortfolios";

// What the website serves for the 30 band positions (owner, 27/10/2026): the stored set, read from the database (the web server never
// solves a standard list). A set saved for slightly older prices is served at once; the precompute job replaces it after the next data copy.

/** The unified engine's band table (lib/netSpread/config.ts): its lists follow the portfolio spec, never the editable coherence policy of the admin-only methodologies. */
export const isSpecConfig = (cfg: BandConfig) => !!cfg.tag?.startsWith("spec");

export const bandsKey = (src: BondSource, f: BondFilter, duration: number, cfg: BandConfig) =>
  [signatureOf(src), f.currency, f.size, duration, configSignature(cfg), isSpecConfig(cfg) ? "spec" : policySignature(), GROUP_TABLE_VERSION].join("|");

export type ServedBands = { stored: StoredBands; stale: boolean; src: BondSource; cfg: BandConfig; key: string };

const memo = new Map<string, { at: number; v: ServedBands | null }>();
const MEMO_MS = 120_000;

/** The stored band set for a filter and horizon, or null when none was ever saved (cold start: the caller falls back to the progressive search). */
export async function servedBands(f: BondFilter, duration: number, config?: BandConfig): Promise<ServedBands | null> {
  const [src, cfg] = await Promise.all([loadBondsFor(f), config ?? loadBandConfig()]);
  const key = bandsKey(src, f, duration, cfg);
  const hit = memo.get(key);
  if (hit && Date.now() - hit.at < MEMO_MS) return hit.v;
  const got = await loadStoredBands(key);
  const v = got ? { stored: got.data, stale: got.stale, src, cfg, key } : null;
  if (memo.size > 24) memo.clear();
  memo.set(key, { at: Date.now(), v });
  return v;
}

/** The bonds of a stored list, in the order of its ISINs, or null if any bond is no longer in the data (a stale set after bonds matured). */
export function bondsOfBand(sb: StoredBand, byIsin: Map<string, PublicBond>): PublicBond[] | null {
  const out = sb.isins.map((i) => byIsin.get(i));
  if (!out.every((b): b is PublicBond => !!b)) return null;
  // A stored list is served only if its bonds still sit inside one risk window (older lists from before the rule are dropped here).
  const scores = out.map((b) => bondRisk(b));
  return scores.every((x): x is number => x !== null) && riskConsistent(scores) ? out : null;
}

/** Slider positions (the chart dots and tiles) from a stored set. A band with no list is `unavailable`. */
export function positionsOfBands(sv: ServedBands): SliderPosition[] {
  const byIsin = new Map(sv.src.bonds.map((b) => [b.isin, b]));
  return sv.stored.bands.map((b) => {
    const bonds = b.status === "ok" ? bondsOfBand(b, byIsin) : null;
    const ok = !!bonds && b.ytm !== null;
    return {
      position: b.k,
      target: null,
      query: ok ? { ytm: b.ytm!, risk: 10, guard: true, band: b.k } : null,
      ytm: ok ? b.ytm : null,
      expectedLoss: ok ? b.el : null,
      avgRisk: ok ? b.avgRisk : null,
      worstRisk: ok ? Math.max(...bonds!.map((x) => bondRisk(x) ?? 10)) : null,
      riskMin: ok ? Math.min(...bonds!.map((x) => bondRisk(x) ?? 10)) : null,
      riskMax: ok ? Math.max(...bonds!.map((x) => bondRisk(x) ?? 10)) : null,
      isins: ok ? b.isins : [],
      sameAs: ok && b.repeatOf ? b.repeatOf : null,
      unavailable: !ok,
      band: { min: b.min, max: b.max },
      ...(b.allowed ? { classes: b.allowed } : {}),
      slot: b.k,
      optimal: ok ? b.optimal : undefined,
      ...(ok && b.eff ? { eff: b.eff } : {}),
    };
  });
}

/**
 * What visitors and plans get as the slider (owner, 28/10/2026): only the positions that have a valid list, renumbered 1..n per horizon, with the
 * risk classes they hold. An infeasible position is never shown or filled; a position that repeats an earlier list (flag `sameAs`) is not a new
 * choice and is left out of the public slider (the admin sees it flagged). `query.band` keeps the stored position the list is read from.
 */
export function publicPositions(all: SliderPosition[]): SliderPosition[] {
  return all
    .filter((p) => !p.unavailable && p.sameAs == null)
    .map((p, i) => ({ ...p, position: i + 1, slot: p.slot ?? p.position, sameAs: null, query: p.query ? { ...p.query, band: p.query.band ?? p.position } : null }));
}

/** The bands without figures (no stored set yet): the finder still shows 30 positions and searches each one live. */
export function bareBandPositions(cfg: BandConfig): SliderPosition[] {
  return cfg.bands.map((b) => ({ position: b.k, target: null, query: { ytm: 4, risk: 10, guard: true, band: b.k }, ytm: null, expectedLoss: null, avgRisk: null, worstRisk: null, isins: [], sameAs: null, unavailable: false, band: { min: b.min, max: b.max }, ...(b.allowed ? { classes: b.allowed } : {}), slot: b.k }));
}
