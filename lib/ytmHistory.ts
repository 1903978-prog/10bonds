import { accountsSql } from "./accounts";
import type { BondSource } from "./bonds";

// The bond copy holds only today's yields. To report weekly and monthly moves (newsletter, alerts) we keep one
// yield per rated bond per day here, starting from the day this shipped. Kept for HISTORY_DAYS, then pruned.
export const HISTORY_DAYS = 120;
let ready: Promise<void> | null = null;

async function table() {
  const sql = await accountsSql();
  ready ??= (async () => {
    await sql`
      create table if not exists app.ytm_history (
        as_of date not null,
        isin text not null,
        ytm numeric not null,
        duration numeric,
        rating text,
        currency text not null,
        primary key (as_of, isin)
      )`;
    await sql`create index if not exists ytm_history_isin on app.ytm_history (isin, as_of)`;
  })().catch((e) => {
    ready = null;
    throw e;
  });
  await ready;
  return sql;
}

/** Rows to keep for one copy: rated bonds with a yield, dated by their own yield date (today if missing). */
export function historyRows(src: BondSource, today = new Date().toISOString().slice(0, 10)) {
  return src.bonds
    .filter((b) => b.grossYtm !== null && b.ratingResolved && b.ratingResolved !== "NR")
    .map((b) => ({ as_of: (b.ytmAsOf ?? today).slice(0, 10), isin: b.isin, ytm: b.grossYtm!, duration: b.modifiedDuration, rating: b.ratingResolved, currency: b.currency }));
}

/** Called when a new copy is loaded. Never throws: history is a side record, the site must not depend on it. */
export async function recordYields(src: BondSource): Promise<void> {
  if (src.source !== "live") return;
  try {
    const sql = await table();
    const rows = historyRows(src);
    for (let i = 0; i < rows.length; i += 500) {
      const chunk = rows.slice(i, i + 500);
      await sql`insert into app.ytm_history ${sql(chunk, "as_of", "isin", "ytm", "duration", "rating", "currency")} on conflict (as_of, isin) do nothing`;
    }
    await sql`delete from app.ytm_history where as_of < current_date - ${HISTORY_DAYS}::int`;
  } catch (e) {
    console.error("[ytm-history] not recorded:", (e as Error).message);
  }
}

export async function ytmHistoryReady(): Promise<void> {
  await table();
}
