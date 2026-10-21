import { accountsConfigured, accountsSql } from "./accounts";
import { loadAllShown } from "./bonds";
import { cleanPriceFromYield } from "./bondPrice";
import { bondRisk } from "./ratings";
import type { PublicBond } from "./types";

// Biggest price drops from the highest price in the site's own records. The nightly copy holds today's yield only, so
// the site keeps each bond's lowest and highest yield per week in app.bond_price_weeks, from the day this started. The
// high is the lowest recorded yield of the past year priced as of today, so the slow pull toward 100 is not a drop.
// The data supplier's own 52-week high/low is never used for the drop and is shown to the admin only (the owner, 21/10/2026).

export type DropRow = {
  isin: string;
  issuer: string;
  name: string;
  currency: string;
  risk: number;
  maturity: string | null;
  price: number;
  high: number; // never shown: only the drop is
  dropPct: number; // negative, e.g. -6.2
  // Admin only (set by forViewer): the data supplier's 52-week price low and high, never used for the drop itself.
  low52w?: number | null;
  high52w?: number | null;
};

export type DropLists = { top: DropRow[]; byRisk: Record<number, DropRow[]> };
export type DropsData = { EUR: DropLists; USD: DropLists; since: string | null; asOf: string | null };

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

/** The price the bond would have today at its lowest yield of the period: its recorded high, without the pull to 100. */
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
    const high = Math.max(highs.get(b.isin) ?? -Infinity, price ?? -Infinity);
    if (risk === null || price === null || !Number.isFinite(high) || high <= 0) continue;
    const dropPct = ((price - high) / high) * 100;
    if (dropPct > MIN_DROP) continue;
    rows.push({ isin: b.isin, issuer: b.issuer ?? b.name, name: b.name, currency: b.currency, risk, maturity: b.maturity, price, high, dropPct, low52w: b.low52w ?? null, high52w: b.high52w ?? null });
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
      // Without the history the page shows no drops.
    }
  }
  const rows = computeDrops(bonds, highs);
  return { EUR: listsFor(rows, "EUR"), USD: listsFor(rows, "USD"), since, asOf };
}

/** What one viewer may see: the 52-week low/high stay on the server unless the viewer is the admin. */
export function forViewer(data: DropsData, admin: boolean): DropsData {
  if (admin) return data;
  const strip = (rows: DropRow[]) => rows.map(({ low52w: _l, high52w: _h, ...r }) => r);
  const lists = (l: DropLists): DropLists => ({ top: strip(l.top), byRisk: Object.fromEntries(Object.entries(l.byRisk).map(([k, v]) => [k, strip(v)])) });
  return { ...data, EUR: lists(data.EUR), USD: lists(data.USD) };
}
