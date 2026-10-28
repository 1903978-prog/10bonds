import { accountsSql } from "../accounts";
import { besTablesReady } from "./store";

/** The Bond Efficiency Score tile above a list: average of the bonds that have a score (valid or limited), and how many of the list have one. */
export type BesTile = { avg: number | null; scored: number; total: number };

export function besTileOf(scores: (number | null)[]): BesTile {
  const got = scores.filter((x): x is number => x !== null && Number.isFinite(x));
  return { avg: got.length ? Math.round((got.reduce((a, b) => a + b, 0) / got.length) * 10) / 10 : null, scored: got.length, total: scores.length };
}

/** One query for the whole list; never throws (the tile just shows a dash if the scores are not there). */
export async function besTileFor(isins: string[]): Promise<BesTile | undefined> {
  if (!isins.length) return undefined;
  try {
    await besTablesReady();
    const s = await accountsSql();
    const rows = await s`
      select b.isin, b.efficiency_score from app.bes_bonds b
      join app.bes_runs r on r.id = b.run_id and r.status = 'published'
      where b.isin in ${s(isins)} and b.efficiency_status in ('valid','limited')`;
    const by = new Map<string, number>(rows.map((r) => [String(r.isin), Number(r.efficiency_score)]));
    return besTileOf(isins.map((i) => by.get(i) ?? null));
  } catch { return undefined; }
}
