import type { PublicBond } from "./types";
import { bondNotch, bondRisk } from "./ratings";
import { lossAdjustedYield, LOSS_GIVEN_DEFAULT } from "./expectedLoss";
import { lgdOf } from "./seniority";
import { isSovereignBond } from "./sovereign";
import { pdOf } from "./tiers";
import { lifeYears } from "./lifeYears";
import { sectorOf, UNCLASSIFIED } from "./sectors";
import { issuerKey } from "./ranking";
import { bundCurve } from "./riskPremium/benchmark";
import { spreadBp, type BundPt } from "./bundSpread";
import { issuerOf } from "./seo/bondPages";

// The Bond Card: one bond with every figure the site holds for it. Only re-arranges stored data (no solver).
// Efficiency = the bond's return after expected losses (return minus its yearly expected default loss), and its rating 0-100 =
// the share of similar bonds (same currency, duration within 20%) it beats on that figure. A comparison, not advice.

export type CardBond = {
  isin: string; issuer: string; name: string; currency: string; country: string | null; industry: string | null;
  coupon: number | null; couponType: string | null; seniority: string | null; maturity: string | null; issueDate: string | null; callable: boolean | null;
  minInvestment: number | null; price: number | null; priceDate: string | null;
  risk: number | null; lrScore: number | null; ret: number | null; duration: number | null; lifeYears: number;
  defaultChance: number | null; lossGivenDefault: number; expectedLoss: number | null; afterLoss: number | null;
  benchmark: "bund" | "treasury"; spreadBp: number | null;
  efficiency: number | null; peerRank: number | null; peers: number | null;
};

export type CardAlt = { isin: string; issuer: string; coupon: number | null; maturity: string | null; ret: number; duration: number; risk: number | null; afterLoss: number; efficiency: number | null };

const score = (b: PublicBond): number | null => {
  const n = bondNotch(b);
  return n === null || b.grossYtm === null || b.modifiedDuration === null ? null : lossAdjustedYield(b.grossYtm, n, b.modifiedDuration, lgdOf(b), isSovereignBond(b));
};

const near = (x: PublicBond, d: number) => x.modifiedDuration !== null && Math.abs(x.modifiedDuration - d) <= d * 0.2;

export type Benchmark = { kind: "bund" | "treasury"; points: BundPt[] };

/** The government curve for a currency: EUR = official Bund curve (else the Bunds in the copy), USD = Fed Treasury curve; other currencies have none. Chosen by currency, never by issuer. */
export function benchmarkFor(currency: string, all: PublicBond[], asOf: string | null, official: { bund: BundPt[] | null; us: BundPt[] | null }): Benchmark {
  if (currency === "USD") return { kind: "treasury", points: official.us ?? [] };
  if (currency !== "EUR") return { kind: "bund", points: [] };
  return { kind: "bund", points: official.bund?.length ? official.bund : bundCurve(all, asOf).points.map((p) => ({ years: p.years, ytm: p.ytm })) };
}

export function cardOf(b: PublicBond, all: PublicBond[], curve: Benchmark): CardBond {
  const own = score(b);
  const d = b.modifiedDuration;
  let rank: number | null = null, peers: number | null = null, eff: number | null = null;
  if (own !== null && d !== null) {
    const scores = all.filter((x) => x.currency === b.currency && near(x, d)).map(score).filter((s): s is number => s !== null);
    peers = Math.max(scores.length, 1);
    rank = scores.filter((s) => s > own).length + 1;
    eff = peers > 1 ? Math.round(100 * (1 - (rank - 1) / (peers - 1))) : 100;
  }
  const life = lifeYears(b);
  const industry = sectorOf(b);
  const pd = bondNotch(b) === null ? null : pdOf(b);
  return {
    isin: b.isin, issuer: issuerOf(b), name: b.name, currency: b.currency, country: b.country, industry: industry === UNCLASSIFIED ? null : industry,
    coupon: b.coupon, couponType: b.couponType ?? null, seniority: b.seniority ?? null, maturity: b.maturity, issueDate: b.issueDate ?? null, callable: b.callable ?? null,
    minInvestment: b.minInvestment ?? null, price: b.cleanPrice ?? null, priceDate: b.ytmAsOf,
    risk: bondRisk(b), lrScore: b.lrScore ?? null, ret: b.grossYtm, duration: d, lifeYears: Math.round(life * 100) / 100,
    defaultChance: pd, lossGivenDefault: lgdOf(b) ?? LOSS_GIVEN_DEFAULT,
    expectedLoss: own !== null && b.grossYtm !== null ? Math.round((b.grossYtm - own) * 100) / 100 : null,
    afterLoss: own === null ? null : Math.round(own * 100) / 100,
    benchmark: curve.kind, spreadBp: spreadBp(curve.points, b.grossYtm, life),
    efficiency: eff, peerRank: rank, peers,
  };
}

/** Same currency, same risk score, similar duration, higher return; one bond per issuer, most efficient first. */
export function alternativesOf(b: PublicBond, all: PublicBond[], max = 10): CardAlt[] {
  const d = b.modifiedDuration, risk = bondRisk(b);
  if (d === null || b.grossYtm === null || risk === null) return [];
  const own = issuerKey(b);
  const scored = all
    .filter((x) => x.isin !== b.isin && x.currency === b.currency && bondRisk(x) === risk && near(x, d) && x.grossYtm !== null && x.grossYtm > b.grossYtm! + 1e-9 && issuerKey(x) !== own)
    .map((x) => ({ x, s: score(x) }))
    .filter((e): e is { x: PublicBond; s: number } => e.s !== null)
    .sort((p, q) => q.s - p.s || p.x.isin.localeCompare(q.x.isin));
  const peers = all.filter((x) => x.currency === b.currency && near(x, d)).map(score).filter((s): s is number => s !== null);
  const seen = new Set<string>();
  const out: CardAlt[] = [];
  for (const { x, s } of scored) {
    const k = issuerKey(x);
    if (seen.has(k)) continue;
    seen.add(k);
    const rank = peers.filter((p) => p > s).length + 1;
    out.push({
      isin: x.isin, issuer: issuerOf(x), coupon: x.coupon, maturity: x.maturity, ret: x.grossYtm!, duration: x.modifiedDuration!, risk: bondRisk(x),
      afterLoss: Math.round(s * 100) / 100, efficiency: peers.length > 1 ? Math.round(100 * (1 - (rank - 1) / (peers.length - 1))) : 100,
    });
    if (out.length === max) break;
  }
  return out;
}

/** Plain reason key for a bond the card does not show: `why` from lib/bonds.ts whyHidden for a bond in the data, or null when the data has no such ISIN. */
export function notShownReason(inData: boolean, why: string | null): "not_listed" | "quality" | "no_rating" | "matured" | "dormant" | "no_yield" | "structure" {
  if (!inData) return "not_listed";
  if (why === null) return "quality";
  if (why.startsWith("no rating")) return "no_rating";
  if (why.startsWith("already matured")) return "matured";
  if (why.startsWith("dormant")) return "dormant";
  if (why.startsWith("no yield")) return "no_yield";
  return "structure";
}
