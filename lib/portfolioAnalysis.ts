import type { PublicBond } from "./types";
import type { Holding } from "./replacement";
import { bondRisk, RISK_MAX, RISK_MIN } from "./ratings";
import { cleanPriceFromYield } from "./bondPrice";

// Portfolio check-up for Pro: indicative prices, market values, and the value-weighted yield, duration and
// risk score, compared with what the market pays at each risk score for a similar duration (±20%).
// Only 10BONDS risk scores leave the server, never agency grades.

export const DURATION_BAND = 0.2;

export type Position = {
  isin: string;
  name: string;
  quantity: number; // nominal held
  price: number | null; // indicative clean price per 100
  value: number; // quantity × price / 100 (at 100 when the price cannot be worked out)
  ytm: number;
  duration: number;
  risk: number | null;
};

export type CurvePoint = { risk: number; best: number; typical: number; count: number };

export type PortfolioAnalysis = {
  positions: Position[];
  notFound: string[];
  totals: { nominal: number; value: number; ytm: number | null; duration: number | null; risk: number | null };
  band: { from: number; to: number } | null;
  curve: CurvePoint[];
};

export function analysePortfolio(holdings: Holding[], universe: PublicBond[], today: Date = new Date()): PortfolioAnalysis {
  const byIsin = new Map(universe.filter((b) => b.grossYtm !== null && b.modifiedDuration !== null).map((b) => [b.isin, b]));
  const positions: Position[] = [];
  const notFound: string[] = [];
  for (const h of holdings) {
    const b = byIsin.get(h.isin);
    if (!b) {
      notFound.push(h.isin);
      continue;
    }
    const price = cleanPriceFromYield(b.coupon, b.maturity, b.grossYtm, today);
    positions.push({
      isin: b.isin,
      name: b.name,
      quantity: h.amount,
      price,
      value: (h.amount * (price ?? 100)) / 100,
      ytm: b.grossYtm!,
      duration: b.modifiedDuration!,
      risk: bondRisk(b),
    });
  }

  const weighted = (f: (p: Position) => number | null) => {
    const xs = positions.filter((p) => f(p) !== null);
    const w = xs.reduce((s, p) => s + p.value, 0);
    return w > 0 ? xs.reduce((s, p) => s + f(p)! * p.value, 0) / w : null;
  };
  const totals = {
    nominal: positions.reduce((s, p) => s + p.quantity, 0),
    value: positions.reduce((s, p) => s + p.value, 0),
    ytm: weighted((p) => p.ytm),
    duration: weighted((p) => p.duration),
    risk: weighted((p) => p.risk),
  };

  let band: PortfolioAnalysis["band"] = null;
  const curve: CurvePoint[] = [];
  if (totals.duration !== null) {
    band = { from: totals.duration * (1 - DURATION_BAND), to: totals.duration * (1 + DURATION_BAND) };
    const pool = [...byIsin.values()].filter((b) => b.modifiedDuration! >= band!.from && b.modifiedDuration! <= band!.to);
    for (let r = RISK_MIN; r <= RISK_MAX; r++) {
      const ytms = pool.filter((b) => bondRisk(b) === r).map((b) => b.grossYtm!).sort((a, b) => a - b);
      if (!ytms.length) continue;
      curve.push({ risk: r, best: ytms[ytms.length - 1], typical: median(ytms), count: ytms.length });
    }
  }
  return { positions, notFound, totals, band, curve };
}

function median(sorted: number[]): number {
  const m = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[m] : (sorted[m - 1] + sorted[m]) / 2;
}
