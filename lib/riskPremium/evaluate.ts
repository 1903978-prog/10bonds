import type { PublicBond } from "../types";
import { bondNotch, ratingSourceLabel } from "../ratings";
import { issuerClass, type IssuerClass } from "../seo/classify";
import { issuerKey } from "../ranking";
import { bpToPct, cleanBp, curveRatingOf, notchOfCurve, pctToBp, type CurveConfig, type CurveRating } from "./curve";
import { bundYieldAt, yearsToMaturity, type BundCurve } from "./benchmark";

// One bond through the risk premium model: data checks, then whether the Version 1.0 corporate curve applies,
// then the required premium, the spread over the maturity-matched Bund and the risk compensation surplus.
// Nothing is guessed: a bond missing what a step needs stops at that step with the reason.

export { STATUS_LABEL, type RiskStatus } from "./status";
import type { RiskStatus } from "./status";

export type Evaluation = {
  isin: string;
  issuer: string;
  name: string;
  currency: string;
  category: IssuerClass;
  status: RiskStatus;
  reason: string | null;
  rating: CurveRating | null; // S&P-scale symbol used (admin only; never sent to customers)
  ratingSource: string | null; // e.g. "S&P BBB+" or "Moody's Baa1"
  notch: number | null;
  ytm: number | null; // %
  duration: number | null;
  maturityYears: number | null;
  requiredBp: number | null;
  benchmarkYtm: number | null; // %
  spreadBp: number | null; // observed spread over the Bund
  riskAdjustedYtm: number | null; // % (ytm - required premium): a ranking score, not a yield anyone earns
  surplusBp: number | null; // spread - required
  ytmAsOf: string | null;
  versionId: number;
  version: string;
};

export type EvalContext = {
  curve: CurveConfig;
  bund: BundCurve;
  /** Newest pricing date in the copy: maturities and staleness are measured from it. */
  asOf: string | null;
  /** Admin decisions on exceptional spreads, by ISIN. */
  reviews?: ReadonlyMap<string, "approved" | "rejected">;
};

// Names that suggest a structure the plain YTM-minus-Bund spread cannot judge (subordinated, hybrid, perpetual,
// callable, contingent convertible, floating). The copy has no seniority or call columns, so the name is all there is.
const NON_STANDARD = /\b(sub|subord|subordinated|jr|junior|perp|perpetual|hybrid|tier ?[12]|t[12]|at1|lt2|coco|contingent|callable|call|nc\d+|frn|float|floating|var|variable|fix to float|resettable)\b/i;
// Public-sector issuers the shared name check (lib/seo/classify.ts) files as companies: German Länder by their bare
// name, and state or municipal development banks. Seen on the live copy 20/10/2026 (Hamburg, Investitionsbank Berlin).
const LAENDER = /^(freie und hansestadt |freistaat |land )?(baden wurttemberg|bayern|berlin|brandenburg|bremen|hamburg|hessen|mecklenburg vorpommern|niedersachsen|nordrhein westfalen|rheinland pfalz|saarland|sachsen|sachsen anhalt|schleswig holstein|thuringen)$/;
const PUBLIC_BANKS = /\b(investitionsbank|waterschapsbank|nederlandse gemeenten|bng bank|kommunalbanken|kommuninvest|municipality finance|foerderbank|forderbank|wirtschafts und infrastrukturbank|action logement)\b/;
const YTM_RANGE = { min: -2, max: 30 };
// Same rule as lib/bonds.ts dropStale: a quote this many days behind the newest one is stale.
const STALE_DAYS = 10;
const MIN_SPREAD_BP = -10;

export function evaluateBond(b: PublicBond, ctx: EvalContext): Evaluation {
  const { curve } = ctx;
  const notch = bondNotch(b);
  const rating = notch === null ? null : curveRatingOf(notch);
  const maturityYears = yearsToMaturity(b.maturity, ctx.asOf);
  const ev: Evaluation = {
    isin: b.isin,
    issuer: b.issuer ?? b.name,
    name: b.name,
    currency: b.currency,
    category: categoryOf(b),
    status: "eligible",
    reason: null,
    rating,
    ratingSource: notch === null ? null : ratingSourceLabel(b),
    notch,
    ytm: b.grossYtm,
    duration: b.modifiedDuration,
    maturityYears: maturityYears === null ? null : Math.round(maturityYears * 100) / 100,
    requiredBp: rating ? curve.premiums[rating] : null,
    benchmarkYtm: null,
    spreadBp: null,
    riskAdjustedYtm: null,
    surplusBp: null,
    ytmAsOf: b.ytmAsOf,
    versionId: curve.id,
    version: curve.version,
  };
  const stop = (status: RiskStatus, reason: string) => ({ ...ev, status, reason });

  // Figures are filled in whenever the inputs exist, so the admin can see them even for bonds that stop below.
  if (ev.requiredBp !== null && ev.ytm !== null && Number.isFinite(ev.ytm)) {
    ev.riskAdjustedYtm = round4(ev.ytm - bpToPct(ev.requiredBp));
    const bench = maturityYears === null ? null : bundYieldAt(ctx.bund, maturityYears);
    if (bench !== null) {
      ev.benchmarkYtm = round4(bench);
      ev.spreadBp = round2(cleanBp(pctToBp(ev.ytm - bench)));
      ev.surplusBp = round2(cleanBp(ev.spreadBp - ev.requiredBp));
    }
  }

  // 1. Data quality.
  if (ev.ytm === null || !Number.isFinite(ev.ytm) || ev.ytm < YTM_RANGE.min || ev.ytm > YTM_RANGE.max) return stop("insufficient_data", "Missing or invalid yield");
  if (ev.duration === null || !(ev.duration > 0)) return stop("insufficient_data", "Missing or invalid duration");
  if (!b.maturity || maturityYears === null) return stop("insufficient_data", "No maturity date (perpetual or missing)");
  if (maturityYears <= 0) return stop("insufficient_data", "Maturity date in the past");
  if (ev.duration > maturityYears + 0.25) return stop("insufficient_data", "Duration longer than the time to maturity");
  if (!b.ytmAsOf) return stop("insufficient_data", "No pricing date");
  if (ctx.asOf && Date.parse(b.ytmAsOf) < Date.parse(ctx.asOf) - STALE_DAYS * 86_400_000) return stop("insufficient_data", "Stale price");

  // 2. Does the Version 1.0 curve apply?
  // Governments, agencies, states and supranationals use the same curve: only the rating matters (Livio, 20/10/2026:
  // "a AA gov bond is the same as a AA corp bond"). The category is still recorded for the admin.
  if (b.currency !== curve.currency) return stop("unsupported", `Curve is ${curve.currency} only`);
  if (NON_STANDARD.test(b.name)) return stop("unsupported", "Possible subordinated, callable, perpetual or floating structure");

  // 3. Credit assessment and floor.
  if (notch === null) return stop("insufficient_data", "No verified agency rating");
  if (notch > notchOfCurve(curve.floor)) return stop("below_floor", `Rated below ${curve.floor}`);
  if (!rating) return stop("below_floor", "Rating not on the curve");

  // 4. Maturity range of the curve.
  if (maturityYears < curve.minMaturity - 1e-9 || maturityYears > curve.maxMaturity + 1e-9)
    return stop("unsupported", `Maturity ${maturityYears.toFixed(1)}y outside the ${curve.minMaturity}-${curve.maxMaturity}y curve`);

  // 5. Benchmark and surplus.
  if (ev.surplusBp === null) return stop("insufficient_data", "No Bund benchmark at this maturity");
  // A corporate yielding clearly less than the Bund points to a bad price or a structure the copy does not describe.
  if (ev.spreadBp! < MIN_SPREAD_BP) return stop("insufficient_data", "Yield below the Bund: price or data likely unreliable");
  if (ev.surplusBp >= curve.exceptionalBp) {
    const d = ctx.reviews?.get(b.isin);
    if (d === "rejected") return stop("rejected", `Surplus ${fmtBp(ev.surplusBp)}: rejected after review`);
    // Always left out, even after an approval (Livio, 20/10/2026): a spread this wide usually means a structure the rating misses.
    return stop("review", `Surplus ${fmtBp(ev.surplusBp)} at or above ${curve.exceptionalBp} bp: left out`);
  }
  // The bond passes only when its spread is strictly above the hurdle; equality does not pass.
  if (ev.surplusBp <= 0) return stop("below_hurdle", `Spread ${fmtBp(ev.spreadBp!)} vs ${ev.requiredBp} bp required`);
  return ev;
}

function categoryOf(b: PublicBond): IssuerClass {
  const c = issuerClass(b);
  if (c !== "corporate") return c;
  const k = issuerKey(b);
  return LAENDER.test(k) || PUBLIC_BANKS.test(k) ? "agency" : c;
}

export const fmtBp = (bp: number) => `${bp > 0 ? "+" : ""}${Math.round(bp)} bp`;
const round2 = (x: number) => Math.round(x * 100) / 100;
const round4 = (x: number) => Math.round(x * 10000) / 10000;
