import { accountsConfigured, accountsSql } from "./accounts";
import { loadAllShown } from "./bonds";
import { cleanPriceFromYield } from "./bondPrice";
import { bondRisk } from "./ratings";
import type { PublicBond } from "./types";

// Biggest price drops from the 52-week high. The nightly copy holds today's yield only, so the site keeps each bond's
// lowest and highest yield per week in app.bond_price_weeks, from the day this started. The high is the lowest yield
// of the last 52 weeks priced as of today, so the slow pull of every price toward 100 is not counted as a drop.
// Once the copy carries real prices and 52-week highs (docs/handover/price-history.md), those are used instead.

export type DropRow = {
  isin: string;
  issuer: string;
  name: string;
  currency: string;
  risk: number;
  maturity: string | null;
  price: number;
  high: number;
  dropPct: number; // negative, e.g. -6.2
};

export type DropLists = { top: DropRow[]; byRisk: Record<number, DropRow[]> };
export type DropsData = { EUR: DropLists; USD: DropLists; since: string | null; fromCopy: boolean; asOf: string | null };

export const TOP_N = 10;
export const PER_RISK = 3;
// Smaller moves are rounding and the slow pull of every bond's price toward 100, not drops.
const MIN_DROP = -0.5;

/** Today's price of a bond: the copy's own price when it has one, else worked out from the yield. */
export function priceOf(b: PublicBond): number | null {
  if (b.cleanPrice != null) return b.cleanPrice;
  const day = b.ytmAsOf ? new Date(b.ytmAsOf) : new Date();
  return cleanPriceFromYield(b.coupon, b.maturity, b.grossYtm, day);
}

/** The price the bond would have today at its lowest yield of the period: its 52-week high, without the pull to 100. */
export function highFromYield(b: PublicBond, lowestYtm: number): number | null {
  const day = b.ytmAsOf ? new Date(b.ytmAsOf) : new Date();
  return cleanPriceFromYield(b.coupon, b.maturity, lowestYtm, day);
}

/** Monday of the week a quote belongs to, YYYY-MM-DD. */
export function weekOf(iso: string | null, now = new Date()): string {
  const d = iso ? new Date(iso) : now;
  const day = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  day.setUTCDate(day.getUTCDate() - ((day.getUTCDay() + 6) % 7));
  return day.toISOString().slice(0, 10);
}

/** Every bond with a drop of at least MIN_DROP from its high, most negative first. */
export function computeDrops(bonds: PublicBond[], highs: Map<string, number>): DropRow[] {
  const rows: DropRow[] = [];
  for (const b of bonds) {
    const risk = bondRisk(b);
    const price = priceOf(b);
    const high = Math.max(b.high52w ?? -Infinity, highs.get(b.isin) ?? -Infinity, price ?? -Infinity);
    if (risk === null || price === null || !Number.isFinite(high) || high <= 0) continue;
    const dropPct = ((price - high) / high) * 100;
    if (dropPct > MIN_DROP) continue;
    rows.push({ isin: b.isin, issuer: b.issuer ?? b.name, name: b.name, currency: b.currency, risk, maturity: b.maturity, price, high, dropPct });
  }
  return rows.sort((a, b) => a.dropPct - b.dropPct);
}

/** The first n rows, one bond per issuer. */
export function onePerIssuer(rows: DropRow[], n: number): DropRow[] {
  const seen = new Set<string>();
  const out: DropRow[] = [];
  for (const r of rows) {
    const k = r.issuer.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(r);
    if (out.length === n) break;
  }
  return out;
}

export function listsFor(rows: DropRow[], currency: string): DropLists {
  const mine = rows.filter((r) => r.currency === currency);
  const byRisk: Record<number, DropRow[]> = {};
  for (let risk = 1; risk <= 10; risk++) byRisk[risk] = onePerIssuer(mine.filter((r) => r.risk === risk), PER_RISK);
  return { top: onePerIssuer(mine, TOP_N), byRisk };
}

let recorded: string | null = null;

/** Adds today's prices to their week's high and low. Runs once per new copy; quietly does nothing without the database. */
export async function recordPrices(): Promise<void> {
  if (!accountsConfigured()) return;
  const { bonds, source, asOf } = await loadAllShown();
  if (source !== "live") return;
  const sig = `${asOf}:${bonds.length}`;
  if (recorded === sig) return;
  const rows = bonds.flatMap((b) => (b.grossYtm === null ? [] : [{ isin: b.isin, week: weekOf(b.ytmAsOf), min_ytm: b.grossYtm, max_ytm: b.grossYtm }]));
  const sql = await accountsSql();
  for (let i = 0; i < rows.length; i += 1000) {
    await sql`insert into app.bond_price_weeks ${sql(rows.slice(i, i + 1000), "isin", "week", "min_ytm", "max_ytm")}
      on conflict (isin, week) do update set
        min_ytm = least(app.bond_price_weeks.min_ytm, excluded.min_ytm),
        max_ytm = greatest(app.bond_price_weeks.max_ytm, excluded.max_ytm)`;
  }
  await sql`insert into app.settings (key, value) values ('price_history_since', ${(asOf ?? new Date().toISOString()).slice(0, 10)})
    on conflict (key) do nothing`;
  recorded = sig;
}

/** The drop lists for both currencies. */
export async function loadDrops(): Promise<DropsData> {
  const { bonds, asOf } = await loadAllShown();
  const highs = new Map<string, number>();
  let since: string | null = null;
  if (accountsConfigured()) {
    try {
      await recordPrices();
      const sql = await accountsSql();
      const rows = await sql<{ isin: string; ytm: number }[]>`
        select isin, min(min_ytm) ytm from app.bond_price_weeks where week >= current_date - 364 group by isin`;
      const byIsin = new Map(bonds.map((b) => [b.isin, b]));
      for (const r of rows) {
        const b = byIsin.get(r.isin);
        const high = b ? highFromYield(b, Number(r.ytm)) : null;
        if (high !== null) highs.set(r.isin, high);
      }
      const [first] = await sql<{ value: string }[]>`select value from app.settings where key = 'price_history_since'`;
      since = first?.value ?? null;
    } catch {
      // Without the history the page still shows the copy's own 52-week highs, when it has them.
    }
  }
  const fromCopy = bonds.some((b) => b.high52w != null);
  const rows = computeDrops(bonds, highs);
  return { EUR: listsFor(rows, "EUR"), USD: listsFor(rows, "USD"), since: fromCopy ? null : since, fromCopy, asOf };
}
