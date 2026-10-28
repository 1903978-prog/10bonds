import type { PublicBond } from "../types";
import { DEFAULT_RATES, DEFAULT_YEARS } from "../seo/defaultRates";
import { SOVEREIGN_YEARS, isSovereignBond, sovereignRow } from "../sovereign";
import { bondNotch, bondRisk, riskBand } from "../ratings";
import { lgdOf, rankOf } from "../seniority";
import { issuerClass, countryCode } from "../seo/classify";
import { sectorOf } from "../sectors";
import { yearsToMaturity } from "../riskPremium/benchmark";
import { SP_CORPORATE_YEARS, SP_CORPORATE_VERSION, spCorporateRow } from "./spReference";
import { annualEquivalentPd, annualLossBp, besLabel, cumulativePd, curveYield, grossSpreadBp, MIN_PEERS, percentileRank } from "./math";

// Bond Efficiency Score (BES), methodology bes-1.0 (owner brief 28/10/2026). Diagnostic only: it never feeds the optimizer or the 30-band matrix.
//  PD            = cumulative default chance to maturity from the SAME combined table the site already uses (lib/seo/defaultRates.ts,
//                  governments: lib/sovereign.ts), interpolated linearly on survival, never extrapolated beyond 15 years.
//  Benchmark     = government yield curve of the bond's currency built from the same daily copy (EUR: Bund, USD: US Treasuries ...),
//                  YTM at the same remaining maturity. This is a benchmark YTM SPREAD APPROXIMATION, not a Z-spread.
//  Net spread    = gross spread - incremental annual credit loss (bond loss - benchmark loss). Liquidity: no bid/ask data -> not estimated, never zero.
//  BES           = percentile rank of the credit-adjusted net spread among comparable peers.
export const BES_METHOD = "bes-1.0";

export type BesStatus = "valid" | "limited" | "unavailable";
export type BesRow = {
  isin: string;
  riskClass: number | null;
  ratingEquivalent: string | null;
  currency: string;
  issuerType: string;
  sector: string;
  rank: string;
  yearsLeft: number | null;
  ytm: number | null;
  benchmarkYield: number | null;
  benchmarkSource: string | null;
  grossSpreadBp: number | null;
  cumulativePd: number | null;
  annualPd: number | null;
  lgd: number | null;
  cumulativeLoss: number | null;
  annualLossBp: number | null;
  benchmarkLossBp: number | null;
  liquidityCostBp: number | null;
  netSpreadBp: number | null;
  fullyAdjustedBp: number | null;
  spCumulativePd: number | null; // S&P Table 24 reference (corporate only), admin comparison only
  peerGroup: string | null;
  peerCount: number;
  bes: number | null;
  status: BesStatus;
  notes: string[];
};

/** Government benchmark per currency: country of the curve and the notch used for the benchmark's own (tiny) credit loss. */
const BENCH: Record<string, { cc: string; name: string; notch: number }> = {
  EUR: { cc: "DE", name: "German Bund YTM curve (same daily copy)", notch: 0 },
  USD: { cc: "US", name: "US Treasury YTM curve (same daily copy)", notch: 1 },
  GBP: { cc: "GB", name: "UK Gilt YTM curve (same daily copy)", notch: 1 },
};
const MIN_CURVE_POINTS = 6;
const BUCKETS = [2, 4, 7, 10, 16];
const bucketOf = (y: number) => { const i = BUCKETS.findIndex((b) => y < b); return i < 0 ? BUCKETS.length : i; };

type Curve = { years: number; ytm: number }[];

/** Plain fixed-coupon government bonds of one country and currency, by remaining maturity; same-maturity points averaged. */
export function benchmarkCurves(bonds: PublicBond[], today: string): Record<string, Curve> {
  const out: Record<string, Curve> = {};
  for (const [cur, { cc }] of Object.entries(BENCH)) {
    const by = new Map<number, number[]>();
    for (const b of bonds) {
      if (b.currency !== cur || b.grossYtm === null || !isSovereignBond(b) || countryCode(b) !== cc) continue;
      if (b.couponType && !/^(fixed|zero)$/.test(b.couponType) || b.callable) continue;
      const y = yearsToMaturity(b.maturity, b.ytmAsOf ?? today);
      if (y === null || y <= 0.25) continue;
      const k = Math.round(y * 50) / 50;
      by.set(k, [...(by.get(k) ?? []), b.grossYtm]);
    }
    const pts = [...by].map(([years, ys]) => ({ years, ytm: ys.reduce((s, v) => s + v, 0) / ys.length })).sort((a, b) => a.years - b.years);
    if (pts.length >= MIN_CURVE_POINTS) out[cur] = pts;
  }
  return out;
}

function issuerType(b: PublicBond): string {
  if (isSovereignBond(b)) return "government";
  if (issuerClass(b) === "agency") return "agency";
  return sectorOf(b) === "Financials" ? "financial" : "corporate";
}

const pctRow = (notch: number, sovereign: boolean) =>
  sovereign ? { row: sovereignRow(notch), years: SOVEREIGN_YEARS as readonly number[] } : { row: DEFAULT_RATES[Math.min(Math.max(0, notch), DEFAULT_RATES.length - 1)][2], years: DEFAULT_YEARS as readonly number[] };

/** Per-bond inputs and economics (no peer ranking yet). */
export function economics(b: PublicBond, curves: Record<string, Curve>, newest: string | null, today: string): BesRow {
  const notes: string[] = [];
  const risk = bondRisk(b);
  const notch = bondNotch(b);
  const sovereign = isSovereignBond(b);
  const row: BesRow = {
    isin: b.isin, riskClass: risk, ratingEquivalent: risk ? riskBand(risk) : null, currency: b.currency, issuerType: issuerType(b), sector: sectorOf(b), rank: rankOf(b),
    yearsLeft: null, ytm: b.grossYtm, benchmarkYield: null, benchmarkSource: null, grossSpreadBp: null, cumulativePd: null, annualPd: null, lgd: null,
    cumulativeLoss: null, annualLossBp: null, benchmarkLossBp: null, liquidityCostBp: null, netSpreadBp: null, fullyAdjustedBp: null, spCumulativePd: null,
    peerGroup: null, peerCount: 0, bes: null, status: "unavailable", notes,
  };
  const fail = (why: string) => { notes.push(why); return row; };
  if (risk === null || notch === null) return fail("No risk class (unrated or in default).");
  if (b.grossYtm === null) return fail("No yield.");
  if (b.couponType && !/^(fixed|zero)$/.test(b.couponType)) return fail(`Coupon type "${b.couponType}": a yield spread is not meaningful.`);
  const years = yearsToMaturity(b.maturity, b.ytmAsOf ?? today);
  if (years === null || years <= 0) return fail("No remaining maturity.");
  row.yearsLeft = years;
  if (!(b.grossYtm > -1 && b.grossYtm < 30)) return fail(`Yield ${b.grossYtm}% outside the plausible range.`);
  if (b.ytmAsOf && newest && Date.parse(newest) - Date.parse(b.ytmAsOf) > 7 * 86_400_000) return fail("Stale price (more than 7 days older than the newest quote).");
  const bench = BENCH[b.currency];
  const curve = curves[b.currency];
  if (!bench || !curve) return fail(`No benchmark curve for ${b.currency}.`);
  const by = curveYield(curve, years);
  if (by === null) return fail("Remaining maturity outside the benchmark curve (not extrapolated).");
  row.benchmarkYield = by;
  row.benchmarkSource = bench.name;
  row.grossSpreadBp = grossSpreadBp(b.grossYtm, by);
  if (Math.abs(row.grossSpreadBp) > 1500) return fail(`Gross spread ${Math.round(row.grossSpreadBp)} bp: possible price error.`);
  const { row: pcts, years: hz } = pctRow(notch, sovereign);
  const pd = cumulativePd(pcts, hz, years);
  if (pd === null) return fail("Remaining maturity beyond the 15-year default table (not extrapolated).");
  const lgd = lgdOf(b);
  row.cumulativePd = pd; row.lgd = lgd; row.cumulativeLoss = pd * lgd;
  row.annualPd = annualEquivalentPd(pd, years);
  row.annualLossBp = annualLossBp(row.annualPd, lgd);
  const bp = pctRow(bench.notch, true);
  const bpd = cumulativePd(bp.row, bp.years, years);
  row.benchmarkLossBp = bpd === null ? null : annualLossBp(annualEquivalentPd(bpd, years), 0.6);
  if (row.benchmarkLossBp === null) return fail("No benchmark default estimate at this maturity.");
  row.netSpreadBp = row.grossSpreadBp - Math.max(0, row.annualLossBp - row.benchmarkLossBp);
  if (!sovereign) {
    const sp = spCorporateRow(notch);
    row.spCumulativePd = cumulativePd(sp.pct, SP_CORPORATE_YEARS, years);
  }
  row.status = "valid";
  if (b.callable) { row.status = "limited"; notes.push("Callable: yield-to-maturity spread ignores the call option."); }
  if (risk >= 9) { row.status = "limited"; notes.push("Risk 9-10 uses the aggregated CCC/C default row (no separate figures per class)."); }
  notes.push("Liquidity cost not estimated (no bid/ask data); net spread excludes it.");
  return row;
}

type Level = { name: string; key: (r: BesRow) => string };
const LEVELS: Level[] = [
  { name: "L0 currency+risk+maturity band+issuer type+rank", key: (r) => [r.currency, r.riskClass, bucketOf(r.yearsLeft!), r.issuerType, r.rank].join("|") },
  { name: "L1 currency+risk+issuer type+rank (any maturity)", key: (r) => [r.currency, r.riskClass, r.issuerType, r.rank].join("|") },
];

/** Whole run: economics for every bond, then peer ranking with a fixed fallback hierarchy and a minimum peer count. Deterministic for one input. */
export function calculateBes(bonds: PublicBond[], today = new Date().toISOString().slice(0, 10)): BesRow[] {
  const newest = bonds.reduce<string | null>((m, b) => (b.ytmAsOf && (!m || b.ytmAsOf > m) ? b.ytmAsOf : m), null);
  const curves = benchmarkCurves(bonds, today);
  const rows = bonds.map((b) => economics(b, curves, newest, today));
  const pool = rows.filter((r) => r.netSpreadBp !== null);
  const groups = LEVELS.map((lv) => {
    const m = new Map<string, BesRow[]>();
    for (const r of pool) { const k = lv.key(r); m.set(k, [...(m.get(k) ?? []), r]); }
    return m;
  });
  for (const r of pool) {
    let done = false;
    for (let i = 0; i < LEVELS.length && !done; i++) {
      const peers = groups[i].get(LEVELS[i].key(r))!;
      if (peers.length < MIN_PEERS) continue;
      r.bes = Math.round(percentileRank(r.netSpreadBp!, peers.map((p) => p.netSpreadBp!))! * 10) / 10;
      r.peerCount = peers.length;
      r.peerGroup = `${LEVELS[i].name} = ${LEVELS[i].key(r)}`;
      if (i > 0 && r.status === "valid") { r.status = "limited"; r.notes.push("Fallback peer group (maturity bands merged)."); }
      done = true;
    }
    if (!done) {
      r.status = "unavailable"; r.peerCount = groups[1].get(LEVELS[1].key(r))!.length;
      r.notes.push(`BES unavailable: insufficient comparable bonds (${r.peerCount} < ${MIN_PEERS}).`);
    }
  }
  return rows;
}

export const BES_REFERENCE_VERSION = `combined-2026-10 + ${SP_CORPORATE_VERSION}(ref) + sov-t16`;
export { besLabel };
