import { accountsConfigured, accountsSql } from "./accounts";
import { loadAllShown } from "./bonds";
import { cleanPriceFromYield } from "./bondPrice";
import { bondRisk } from "./ratings";
import type { PublicBond } from "./types";

// Price drops (admin only, the owner 21/10/2026: 52-week values stay private for data-supplier rights).
// The nightly copy holds today's yield only, so the site keeps its own history:
// - app.bond_price_weeks: each bond's lowest and highest yield per week, for the 52-week range (from 19 Oct 2026);
// - app.bond_daily_prices: each bond's yield and indicative price per day, about 40 days, for the 1-week and 1-month moves.
// The 52-week range uses the copy's own high_52w / low_52w when it has them, else the recorded yields priced as of
// today (so the slow pull of every price toward 100 is not counted as a move). Missing history stays null ("–").

export type SortKey = "ytm" | "vsMax" | "vsMin" | "d1w" | "d1m" | "gain1y";
export const SORT_KEYS: SortKey[] = ["ytm", "vsMax", "d1w", "d1m", "vsMin", "gain1y"];
// Yield: highest first; drops: most negative first; distance from the low: closest first; gain: highest first.
const ASCENDING: Record<SortKey, boolean> = { ytm: false, vsMax: true, d1w: true, d1m: true, vsMin: true, gain1y: false };

export type DropRow = {
  isin: string;
  issuer: string;
  name: string;
  currency: string;
  risk: number;
  maturity: string | null;
  coupon: number | null;
  price: number;
  ytm: number | null; // today's yield to maturity, %
  min52w: number | null;
  max52w: number | null;
  vsMax: number | null; // % from the 52-week max (zero or negative)
  vsMin: number | null; // % above the 52-week min (zero or positive)
  d1w: number | null; // % change over about a week
  d1m: number | null; // % change over about a month
  gain1y: number | null; // % of today's price: back to the 52-week max plus one year of coupon
};

/** For each sort, the rows to show (indexes into `rows`): the 100 best overall (10 pages of 10) and the 3 best per risk, one per issuer. */
export type DropLists = Record<SortKey, { top: number[]; byRisk: Record<number, number[]> }>;
export type DropsData = { rows: DropRow[]; EUR: DropLists; USD: DropLists; since: string | null; asOf: string | null };

export const TOP_N = 100;
export const PER_RISK = 3;
const DAY = 86_400_000;

/** Today's price of a bond: the copy's own price when it has one, else worked out from the yield. */
export function priceOf(b: PublicBond): number | null {
  if (b.cleanPrice != null) return b.cleanPrice;
  const day = b.ytmAsOf ? new Date(b.ytmAsOf) : new Date();
  return cleanPriceFromYield(b.coupon, b.maturity, b.grossYtm, day);
}

/** The price the bond would have today at a past yield: the recorded high (lowest yield) or low (highest yield). */
export function priceAtYield(b: PublicBond, ytm: number): number | null {
  const day = b.ytmAsOf ? new Date(b.ytmAsOf) : new Date();
  return cleanPriceFromYield(b.coupon, b.maturity, ytm, day);
}

/** Monday of the week a quote belongs to, YYYY-MM-DD. */
export function weekOf(iso: string | null, now = new Date()): string {
  const d = iso ? new Date(iso) : now;
  const day = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  day.setUTCDate(day.getUTCDate() - ((day.getUTCDay() + 6) % 7));
  return day.toISOString().slice(0, 10);
}

const pct = (now: number, then: number | null) => (then === null || then <= 0 ? null : ((now - then) / then) * 100);

export type History = {
  range: Map<string, { minYtm: number; maxYtm: number }>; // recorded over the past year
  daily: Map<string, { day: string; price: number }[]>; // oldest first
};

/** The price on the latest recorded day between `days` + 4 and `days` days before `today` (null when there is none). */
export function priceAgo(series: { day: string; price: number }[] | undefined, today: string, days: number): number | null {
  if (!series) return null;
  const latest = Date.parse(today) - days * DAY;
  const earliest = latest - 4 * DAY;
  let hit: number | null = null;
  for (const s of series) {
    const d = Date.parse(s.day);
    if (d >= earliest && d <= latest) hit = s.price;
  }
  return hit;
}

/** Every rated bond with today's price, its 52-week range and its moves. */
export function computeRows(bonds: PublicBond[], h: History): DropRow[] {
  const rows: DropRow[] = [];
  for (const b of bonds) {
    const risk = bondRisk(b);
    const price = priceOf(b);
    if (risk === null || price === null) continue;
    const r = h.range.get(b.isin);
    const ownMax = r ? priceAtYield(b, r.minYtm) : null;
    const ownMin = r ? priceAtYield(b, r.maxYtm) : null;
    const max52w = b.high52w ?? (ownMax === null ? null : Math.max(ownMax, price));
    const min52w = b.low52w ?? (ownMin === null ? null : Math.min(ownMin, price));
    const today = (b.ytmAsOf ?? new Date().toISOString()).slice(0, 10);
    const series = h.daily.get(b.isin);
    rows.push({
      isin: b.isin, issuer: b.issuer ?? b.name, name: b.name, currency: b.currency, risk, maturity: b.maturity, coupon: b.coupon, price, ytm: b.grossYtm,
      min52w, max52w,
      vsMax: pct(price, max52w),
      vsMin: pct(price, min52w),
      d1w: pct(price, priceAgo(series, today, 7)),
      d1m: pct(price, priceAgo(series, today, 30)),
      gain1y: max52w === null || b.coupon === null ? null : ((max52w - price + b.coupon) / price) * 100,
    });
  }
  return rows;
}

/** The first n rows, one bond per issuer. */
export function onePerIssuer<T extends { issuer: string }>(rows: T[], n: number): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const r of rows) {
    const k = r.issuer.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(r);
    if (out.length === n) break;
  }
  return out;
}

/** Rows sorted by one key (rows without a value left out). */
export function sortedBy(rows: DropRow[], key: SortKey): DropRow[] {
  const has = rows.filter((r) => r[key] !== null);
  return has.sort((a, b) => (ASCENDING[key] ? a[key]! - b[key]! : b[key]! - a[key]!));
}

export function listsFor(rows: DropRow[], currency: string): DropLists {
  const index = new Map(rows.map((r, i) => [r, i]));
  const mine = rows.filter((r) => r.currency === currency);
  const ids = (list: DropRow[]) => list.map((r) => index.get(r)!);
  const out = {} as DropLists;
  for (const key of SORT_KEYS) {
    const sorted = sortedBy(mine, key);
    const byRisk: Record<number, number[]> = {};
    for (let risk = 1; risk <= 10; risk++) byRisk[risk] = ids(onePerIssuer(sorted.filter((r) => r.risk === risk), PER_RISK));
    out[key] = { top: ids(onePerIssuer(sorted, TOP_N)), byRisk };
  }
  return out;
}

/** Only the rows some list shows, with the lists' indexes renumbered (keeps the page small). */
export function compact(rows: DropRow[]): Pick<DropsData, "rows" | "EUR" | "USD"> {
  const eur = listsFor(rows, "EUR");
  const usd = listsFor(rows, "USD");
  const used = [...new Set([eur, usd].flatMap((l) => SORT_KEYS.flatMap((k) => [...l[k].top, ...Object.values(l[k].byRisk).flat()])))].sort((a, b) => a - b);
  const remap = new Map(used.map((old, i) => [old, i]));
  const re = (l: DropLists): DropLists =>
    Object.fromEntries(SORT_KEYS.map((k) => [k, { top: l[k].top.map((i) => remap.get(i)!), byRisk: Object.fromEntries(Object.entries(l[k].byRisk).map(([r, v]) => [r, v.map((i) => remap.get(i)!)])) }])) as DropLists;
  return { rows: used.map((i) => rows[i]), EUR: re(eur), USD: re(usd) };
}

let recorded: string | null = null;

/**
 * Adds today's yields to the week's range and to the daily record. Idempotent: runs once per new copy, and a second run
 * on the same day only overwrites that day. Dormant bonds are never in the shown list, so they are never recorded.
 * Quietly does nothing without the database.
 */
export async function recordPrices(): Promise<void> {
  if (!accountsConfigured()) return;
  const { bonds, source, asOf } = await loadAllShown();
  if (source !== "live") return;
  const sig = `${asOf}:${bonds.length}`;
  if (recorded === sig) return;
  const withYield = bonds.filter((b) => b.grossYtm !== null);
  const weeks = withYield.map((b) => ({ isin: b.isin, week: weekOf(b.ytmAsOf), min_ytm: b.grossYtm!, max_ytm: b.grossYtm! }));
  const days = withYield.map((b) => ({ as_of: (b.ytmAsOf ?? new Date().toISOString()).slice(0, 10), isin: b.isin, ytm: b.grossYtm!, price: priceOf(b) }));
  const sql = await accountsSql();
  for (let i = 0; i < weeks.length; i += 1000) {
    await sql`insert into app.bond_price_weeks ${sql(weeks.slice(i, i + 1000), "isin", "week", "min_ytm", "max_ytm")}
      on conflict (isin, week) do update set
        min_ytm = least(app.bond_price_weeks.min_ytm, excluded.min_ytm),
        max_ytm = greatest(app.bond_price_weeks.max_ytm, excluded.max_ytm)`;
  }
  for (let i = 0; i < days.length; i += 1000) {
    await sql`insert into app.bond_daily_prices ${sql(days.slice(i, i + 1000), "as_of", "isin", "ytm", "price")}
      on conflict (as_of, isin) do update set ytm = excluded.ytm, price = excluded.price`;
  }
  // The daily yields the newsletter has kept since 20 Oct 2026 (EUR) fill the days before this record started.
  await sql`insert into app.bond_daily_prices (as_of, isin, ytm)
    select as_of, isin, ytm from app.ytm_history where as_of >= current_date - 40
    on conflict (as_of, isin) do nothing`.catch(() => {});
  await sql`insert into app.settings (key, value) values ('price_history_since', ${(asOf ?? new Date().toISOString()).slice(0, 10)})
    on conflict (key) do nothing`;
  recorded = sig;
}

/** The lists for both currencies. */
export async function loadDrops(): Promise<DropsData> {
  const { bonds, asOf } = await loadAllShown();
  const h: History = { range: new Map(), daily: new Map() };
  let since: string | null = null;
  if (accountsConfigured()) {
    try {
      await recordPrices();
      const sql = await accountsSql();
      const range = await sql<{ isin: string; min: number; max: number }[]>`
        select isin, min(min_ytm) min, max(max_ytm) max from app.bond_price_weeks where week >= current_date - 364 group by isin`;
      for (const r of range) h.range.set(r.isin, { minYtm: Number(r.min), maxYtm: Number(r.max) });
      const byIsin = new Map(bonds.map((b) => [b.isin, b]));
      const daily = await sql<{ as_of: string; isin: string; ytm: number; price: number | null }[]>`
        select as_of::text as_of, isin, ytm, price from app.bond_daily_prices where as_of >= current_date - 40 order by as_of`;
      for (const d of daily) {
        const b = byIsin.get(d.isin);
        // Days kept as a yield only are priced as of that day.
        const price = d.price !== null ? Number(d.price) : b ? cleanPriceFromYield(b.coupon, b.maturity, Number(d.ytm), new Date(`${d.as_of}T00:00:00Z`)) : null;
        if (price === null) continue;
        const list = h.daily.get(d.isin) ?? [];
        list.push({ day: d.as_of, price });
        h.daily.set(d.isin, list);
      }
      const [first] = await sql<{ value: string }[]>`select value from app.settings where key = 'price_history_since'`;
      since = first?.value ?? null;
    } catch {
      // Without the history every move shows "–".
    }
  }
  return { ...compact(computeRows(bonds, h)), since, asOf };
}
