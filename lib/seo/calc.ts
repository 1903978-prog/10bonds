// Yield to maturity, gross and after tax, for a fixed-coupon bond bought today. Used by the public calculators.
// Conventions (kept simple and stated on the page): coupons on the maturity day's anniversaries, ACT/ACT time in years,
// accrued interest added to the clean price, annual compounding of the yield. Tax: coupons are taxed at the chosen
// rate when paid; at maturity the gain (100 - clean price) is taxed at the same rate when positive. Losses are
// not offset (they could be against other gains, which the calculator cannot know).

export type BondInput = {
  price: number; // clean price per 100 nominal
  coupon: number; // annual coupon in % of nominal
  frequency: 1 | 2 | 4;
  maturity: string; // yyyy-mm-dd
  settlement: string; // yyyy-mm-dd
  taxRate: number; // % on coupons and gains, 0 for gross only
};

export type BondResult = {
  years: number;
  accrued: number;
  dirtyPrice: number;
  grossYtm: number; // % a year
  netYtm: number; // % a year
  currentYield: number; // coupon / clean price, %
  cashflows: { date: string; gross: number; net: number }[];
};

const DAY = 86_400_000;
const parse = (d: string) => Date.parse(d + "T00:00:00Z");
const ymd = (t: number) => new Date(t).toISOString().slice(0, 10);

function addMonths(t: number, months: number): number {
  const d = new Date(t);
  const day = d.getUTCDate();
  const r = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1));
  const last = new Date(Date.UTC(r.getUTCFullYear(), r.getUTCMonth() + 1, 0)).getUTCDate();
  r.setUTCDate(Math.min(day, last));
  return r.getTime();
}

/** Input problems in plain words, or null when the bond can be computed. */
export function checkBond(b: BondInput): string | null {
  if (!Number.isFinite(b.price) || b.price <= 0 || b.price > 300) return "price";
  if (!Number.isFinite(b.coupon) || b.coupon < 0 || b.coupon > 30) return "coupon";
  if (!Number.isFinite(b.taxRate) || b.taxRate < 0 || b.taxRate > 60) return "tax";
  const m = parse(b.maturity);
  const s = parse(b.settlement);
  if (!Number.isFinite(m) || !Number.isFinite(s) || m <= s) return "maturity";
  if (m - s > 100 * 365 * DAY) return "maturity";
  return null;
}

/** Annual rate r with sum(cf / (1 + r)^t) = price, by bisection (robust for any sign pattern we produce). */
export function solveYield(price: number, flows: { t: number; amount: number }[]): number {
  const pv = (r: number) => flows.reduce((s, f) => s + f.amount / Math.pow(1 + r, f.t), 0);
  let lo = -0.99;
  let hi = 10;
  if ((pv(lo) - price) * (pv(hi) - price) > 0) return NaN;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (pv(mid) > price) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

export function bondYield(b: BondInput): BondResult {
  const m = parse(b.maturity);
  const s = parse(b.settlement);
  const step = 12 / b.frequency;
  const coupon = b.coupon / b.frequency;
  // Coupon dates: back from maturity until the last one before settlement.
  const dates: number[] = [];
  let t = m;
  while (t > s) {
    dates.unshift(t);
    t = addMonths(m, -step * (dates.length));
  }
  const prev = t;
  const next = dates[0];
  const accrued = b.coupon === 0 ? 0 : coupon * ((s - prev) / (next - prev));
  const dirtyPrice = b.price + accrued;
  const tax = b.taxRate / 100;
  const gain = Math.max(0, 100 - b.price);
  const years = (d: number) => (d - s) / (365.25 * DAY);
  const cashflows = dates.map((d, i) => {
    const last = i === dates.length - 1;
    const gross = coupon + (last ? 100 : 0);
    const net = coupon * (1 - tax) + (last ? 100 - gain * tax : 0);
    return { date: ymd(d), gross, net, t: years(d) };
  });
  const grossYtm = solveYield(dirtyPrice, cashflows.map((c) => ({ t: c.t, amount: c.gross })));
  // The buyer pays accrued interest to the seller and gets it back, taxed only on the part earned while holding:
  // keep it simple and treat accrued as cost, the first coupon net as above.
  const netYtm = solveYield(dirtyPrice, cashflows.map((c) => ({ t: c.t, amount: c.net })));
  return {
    years: years(m),
    accrued,
    dirtyPrice,
    grossYtm: grossYtm * 100,
    netYtm: netYtm * 100,
    currentYield: b.price > 0 ? (b.coupon / b.price) * 100 : 0,
    cashflows: cashflows.map(({ date, gross, net }) => ({ date, gross, net })),
  };
}
