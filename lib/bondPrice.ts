// Indicative clean price (per 100 nominal) worked out from the yield, because the daily copy holds yields, not prices.
// Assumes one coupon a year paid on the maturity day's anniversary (the usual case for euro bonds) and actual/365 days.

const DAY = 86_400_000;

function addYears(d: Date, years: number): Date {
  const x = new Date(d);
  x.setUTCFullYear(x.getUTCFullYear() + years);
  return x;
}

/** Clean price per 100 nominal, or null when the coupon, maturity or yield is missing. */
export function cleanPriceFromYield(coupon: number | null, maturity: string | null, ytm: number | null, today: Date = new Date()): number | null {
  if (coupon === null || maturity === null || ytm === null) return null;
  const mat = new Date(`${maturity}T00:00:00Z`);
  if (Number.isNaN(mat.getTime()) || mat <= today) return null;
  const y = ytm / 100;
  if (y <= -0.99) return null;

  // Coupon dates still to come, counting back from maturity.
  let n = 0;
  while (addYears(mat, -(n + 1)) > today) n++;
  const lastCoupon = addYears(mat, -(n + 1));
  let dirty = 0;
  for (let k = 0; k <= n; k++) {
    const t = (addYears(mat, -k).getTime() - today.getTime()) / (365 * DAY);
    dirty += (coupon + (k === 0 ? 100 : 0)) / Math.pow(1 + y, t);
  }
  const accrued = (coupon * (today.getTime() - lastCoupon.getTime())) / (365 * DAY);
  return Math.round((dirty - accrued) * 1000) / 1000;
}

/** Yield in % that gives the clean price (per 100 nominal): the inverse of cleanPriceFromYield, same convention. Null when out of reach. */
export function yieldFromCleanPrice(coupon: number | null, maturity: string | null, price: number | null, today: Date = new Date()): number | null {
  if (price === null || !(price > 0)) return null;
  let lo = -50, hi = 100;
  const at = (y: number) => cleanPriceFromYield(coupon, maturity, y, today);
  const pLo = at(lo), pHi = at(hi);
  if (pLo === null || pHi === null || price > pLo || price < pHi) return null;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    const p = at(mid)!;
    if (p > price) lo = mid; else hi = mid;
  }
  return Math.round(((lo + hi) / 2) * 1000) / 1000;
}
