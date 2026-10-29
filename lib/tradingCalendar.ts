/** Trading-day calendars for quote age: EUR = TARGET2, USD = SIFMA bond-market closes. Dates are UTC calendar days, "YYYY-MM-DD". */
const DAY = 86_400_000;
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
const utc = (y: number, m: number, d: number) => Date.UTC(y, m - 1, d);

function easterSunday(y: number): number {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return utc(y, month, day);
}
/** n-th weekday (0 Sun .. 6 Sat) of a month; n = -1 means the last one. */
function nthWeekday(y: number, m: number, wd: number, n: number): number {
  if (n > 0) { const first = new Date(utc(y, m, 1)).getUTCDay(); return utc(y, m, 1 + ((wd - first + 7) % 7) + (n - 1) * 7); }
  const last = new Date(utc(y, m + 1, 0)); return utc(y, m, last.getUTCDate() - ((last.getUTCDay() - wd + 7) % 7));
}
/** Fixed-date US holiday: a Saturday is taken on the Friday before, a Sunday on the Monday after. */
function observed(y: number, m: number, d: number): number {
  const t = utc(y, m, d), wd = new Date(t).getUTCDay();
  return wd === 6 ? t - DAY : wd === 0 ? t + DAY : t;
}

const cache = new Map<string, Set<string>>();
export function holidays(currency: "EUR" | "USD", year: number): Set<string> {
  const key = `${currency}${year}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const easter = easterSunday(year);
  const days = currency === "EUR"
    ? [utc(year, 1, 1), easter - 2 * DAY, easter + DAY, utc(year, 5, 1), utc(year, 12, 25), utc(year, 12, 26)]
    : [observed(year, 1, 1), nthWeekday(year, 1, 1, 3), nthWeekday(year, 2, 1, 3), easter - 2 * DAY, nthWeekday(year, 5, 1, -1), observed(year, 6, 19),
       observed(year, 7, 4), nthWeekday(year, 9, 1, 1), nthWeekday(year, 10, 1, 2), observed(year, 11, 11), nthWeekday(year, 11, 4, 4), observed(year, 12, 25)];
  const set = new Set(days.map(iso));
  cache.set(key, set);
  return set;
}

export function isTradingDay(currency: "EUR" | "USD", day: string): boolean {
  const t = Date.parse(day.slice(0, 10)), wd = new Date(t).getUTCDay();
  return wd !== 0 && wd !== 6 && !holidays(currency, new Date(t).getUTCFullYear()).has(iso(t));
}

/** The last trading day on or before `day`. */
export function lastTradingDay(currency: "EUR" | "USD", day: string): string {
  let t = Date.parse(day.slice(0, 10));
  while (!isTradingDay(currency, iso(t))) t -= DAY;
  return iso(t);
}

/** Trading days after `older` up to and including `newer` (0 when older is not before newer). */
export function tradingDaysBetween(currency: "EUR" | "USD", older: string, newer: string): number {
  const a = Date.parse(older.slice(0, 10)), b = Date.parse(newer.slice(0, 10));
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return 0;
  let n = 0;
  for (let t = a + DAY; t <= b; t += DAY) if (isTradingDay(currency, iso(t))) n++;
  return n;
}
