// Independent yield arithmetic (owner brief 27/10, workstream F): redo the quoted yield from price, coupon and dates, and take the worst yield over
// optional call dates. Used to CHECK the feed's yields and to build yield-to-worst when a call schedule exists; nothing here changes live figures.
// Conventions: street YTM (ISMA/ICMA), coupons paid `freq` times a year, ACT/ACT within the coupon period, price quoted clean per 100.

export type Bullet = { coupon: number; freq: 1 | 2 | 4; maturity: string; /** redemption per 100, default 100 */ redemption?: number };
export type CallPoint = { date: string; price: number };

const t = (d: string) => Date.parse(d + "T00:00:00Z");
const addMonths = (ms: number, m: number) => { const d = new Date(ms); const day = d.getUTCDate(); d.setUTCMonth(d.getUTCMonth() + m); if (d.getUTCDate() !== day) d.setUTCDate(0); return d.getTime(); };

/** Coupon dates after `settle` up to `end` (walking back from `end` in whole periods), plus the previous coupon date. */
export function couponSchedule(settle: string, end: string, freq: number): { prev: number; next: number[] } | null {
  const s = t(settle), e = t(end);
  if (!(e > s)) return null;
  const step = 12 / freq;
  const dates: number[] = [];
  for (let k = 0; ; k++) {
    const d = addMonths(e, -step * k);
    if (d <= s) { return { prev: d, next: dates.reverse() }; }
    dates.push(d);
    if (k > 1000) return null;
  }
}

/** Accrued interest per 100 at settlement (ACT/ACT within the period). */
export function accrued(b: Bullet, settle: string, end = b.maturity): number {
  const sc = couponSchedule(settle, end, b.freq);
  if (!sc) return 0;
  const next = sc.next[0];
  return (b.coupon / b.freq) * ((t(settle) - sc.prev) / (next - sc.prev));
}

/** Present value per 100 (dirty) of the cash flows to `end` redeemed at `redemption`, at yield `y` (decimal). */
export function dirtyPrice(b: Bullet, settle: string, y: number, end = b.maturity, redemption = b.redemption ?? 100): number {
  const sc = couponSchedule(settle, end, b.freq);
  if (!sc) return NaN;
  const f = b.freq, c = b.coupon / f;
  const first = (sc.next[0] - t(settle)) / (sc.next[0] - sc.prev); // fraction of the first period still to run
  let pv = 0;
  sc.next.forEach((_, i) => { pv += (c + (i === sc.next.length - 1 ? redemption : 0)) / Math.pow(1 + y / f, first + i); });
  return pv;
}

/** Yield (decimal per year, compounded `freq` times) at which the cash flows to `end` are worth the dirty price. null if no solution in (-50%, 500%). */
export function yieldFromClean(b: Bullet, settle: string, clean: number, end = b.maturity, redemption = b.redemption ?? 100): number | null {
  const dirty = clean + accrued(b, settle, end);
  let lo = -0.5, hi = 5;
  if (!(dirtyPrice(b, settle, lo, end, redemption) >= dirty) || !(dirtyPrice(b, settle, hi, end, redemption) <= dirty)) return null;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (dirtyPrice(b, settle, mid, end, redemption) > dirty) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

/** Yield to worst: the lowest of yield-to-maturity and the yield to each call date at its call price (a bond is assumed called if that is worse for the holder). */
export function yieldToWorst(b: Bullet, settle: string, clean: number, calls: CallPoint[] = []): { ytw: number; to: "maturity" | string; ytm: number } | null {
  const ytm = yieldFromClean(b, settle, clean);
  if (ytm === null) return null;
  let best = { ytw: ytm, to: "maturity" as "maturity" | string };
  for (const c of calls) {
    if (!(t(c.date) > t(settle)) || t(c.date) >= t(b.maturity)) continue;
    const y = yieldFromClean(b, settle, clean, c.date, c.price);
    if (y !== null && y < best.ytw) best = { ytw: y, to: c.date };
  }
  return { ...best, ytm };
}

/** Macaulay-based modified duration (years) by a one-basis-point bump of the yield; independent of the feed's figure. */
export function modifiedDuration(b: Bullet, settle: string, y: number): number {
  const h = 1e-4, p0 = dirtyPrice(b, settle, y), up = dirtyPrice(b, settle, y + h), dn = dirtyPrice(b, settle, y - h);
  return (dn - up) / (2 * h * p0);
}
