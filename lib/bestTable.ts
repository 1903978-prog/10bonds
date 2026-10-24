import { loadBonds, loadBondsFor, type BondSource } from "./bonds";
import { filterKey, isDefaultFilter, type BondFilter } from "./bondFilter";
import { accountsConfigured, accountsSql } from "./accounts";
import { DURATION_STEPS, LIMITS, snapDuration } from "./limits";
import { curveByLevel } from "./singleBond";
import { withinRisk, ytmCaps, ytmCapsByRisk } from "./ranking";
import type { RankedBond } from "./types";
import { recordYields } from "./ytmHistory";
import { recordPrices } from "./priceHistory";

/**
 * The "best bonds" table: for every duration step of the slider and every risk step (1 .. 10),
 * the bonds with the highest yield, one per issuer, ranked. Stored in app.best_bonds and rebuilt
 * whenever a new copy of public_bonds is loaded, so the one-bond chart and the slider limits are read, not computed.
 */
export type BestTable = {
  signature: string;
  // grid[duration][level] = ranked bonds
  grid: Record<string, Record<number, RankedBond[]>>;
  caps: Record<string, Record<string, number | null>>;
};

const key = (d: number) => String(Math.round(d * 100) / 100);

export function durationSteps(): number[] {
  return [...DURATION_STEPS];
}

/** Signature of a bond copy: changes whenever the daily copy brings new yields. */
export function signatureOf(src: BondSource): string {
  // The leading version changes when the way the table is computed changes, so a new deploy rebuilds it.
  return `v13:${src.source}:${src.bonds.length}:${src.asOf ?? "none"}:${src.bonds.reduce((s, b) => s + (b.grossYtm ?? 0), 0).toFixed(4)}`;
}

/** The ranked bonds per duration and risk step (quick: what the one-bond chart reads). */
export function computeGrid(src: BondSource): BestTable["grid"] {
  const grid: BestTable["grid"] = {};
  for (const d of durationSteps()) {
    grid[key(d)] = {};
    for (const p of curveByLevel(src.bonds, d)) grid[key(d)][p.level] = p.bonds;
  }
  return grid;
}

export function computeBestTable(src: BondSource): BestTable {
  return { signature: signatureOf(src), grid: computeGrid(src), caps: ytmCapsByRisk(src.bonds, DURATION_STEPS, LIMITS.ytm) };
}

/**
 * The same slider maximums as ytmCapsByRisk, one cell at a time with a pause between cells. They run the ranking many
 * times per cell (seconds on a full copy), so computing them in one go held up every other request, the one-bond chart included.
 */
export async function capsInSteps(bonds: BondSource["bonds"], refine = true): Promise<BestTable["caps"]> {
  const out: BestTable["caps"] = {};
  for (let r = LIMITS.risk.min; r <= LIMITS.risk.max; r++) {
    const pool = withinRisk(bonds, r);
    out[String(r)] = {};
    for (const d of DURATION_STEPS) {
      Object.assign(out[String(r)], ytmCaps(pool, [d], LIMITS.ytm, refine));
      await new Promise((done) => setImmediate(done));
    }
  }
  return out;
}

async function fullTable(src: BondSource): Promise<BestTable> {
  return { signature: signatureOf(src), grid: computeGrid(src), caps: await capsInSteps(src.bonds) };
}

let memo: BestTable | null = null;
let building: Promise<BestTable> | null = null;

/** The current table: from memory, else from app.best_bonds, rebuilt there first when the copy has changed. */
export async function bestTable(): Promise<BestTable> {
  const src = await loadBonds();
  const sig = signatureOf(src);
  if (memo?.signature === sig) return memo;
  building ??= load(src, sig).finally(() => (building = null));
  return building;
}

const filtered = new Map<string, BestTable>();
const filteredCaps = new Map<string, Promise<BestTable["caps"]>>();

/**
 * The table for one filter: the stored one for the default, otherwise computed in memory and kept until the copy changes.
 * A filtered table carries the bond grid only (its caps stay empty): the slider maximums come from capsFor.
 */
export async function bestTableFor(f: BondFilter): Promise<BestTable> {
  if (isDefaultFilter(f)) return bestTable();
  const src = await loadBondsFor(f);
  const k = `${filterKey(f)}|${signatureOf(src)}`;
  let t = filtered.get(k);
  if (!t) {
    if (filtered.size > 8) filtered.clear();
    t = { signature: signatureOf(src), grid: computeGrid(src), caps: {} };
    filtered.set(k, t);
  }
  return t;
}

/**
 * The slider maximums for one filter, kept until the copy changes. Other filters than the default (USD, other minimum
 * orders) use the quick maximum: the refined one stalled the server for every visitor, the one-bond chart included.
 */
export async function capsFor(f: BondFilter): Promise<BestTable["caps"]> {
  if (isDefaultFilter(f)) return (await bestTable()).caps;
  const src = await loadBondsFor(f);
  const k = `${filterKey(f)}|${signatureOf(src)}`;
  let p = filteredCaps.get(k);
  if (!p) {
    if (filteredCaps.size > 8) filteredCaps.clear();
    p = capsInSteps(src.bonds, false);
    p.catch(() => filteredCaps.delete(k));
    filteredCaps.set(k, p);
  }
  return p;
}

async function load(src: BondSource, sig: string): Promise<BestTable> {
  if (!accountsConfigured()) return (memo = await fullTable(src));
  // A new copy: add its prices to the price history too (for the biggest-drops page).
  void recordPrices().catch(() => {});
  try {
    const sql = await accountsSql();
    const [stored] = await sql`select value from app.settings where key = 'best_bonds_signature'`;
    if (stored?.value !== sig) {
      const table = await fullTable(src);
      const rows = Object.entries(table.grid).flatMap(([d, levels]) =>
        Object.entries(levels).flatMap(([level, bonds]) => bonds.map((b) => ({ duration: d, level: Number(level), rank: b.rank, isin: b.isin, bond: b }))),
      );
      await sql.begin(async (tx) => {
        await tx`delete from app.best_bonds`;
        for (let i = 0; i < rows.length; i += 500) {
          const chunk = rows.slice(i, i + 500).map((r) => ({ ...r, bond: tx.json(r.bond as never) }));
          await tx`insert into app.best_bonds ${tx(chunk, "duration", "level", "rank", "isin", "bond")}`;
        }
        for (const [k, v] of [["best_bonds_caps", JSON.stringify(table.caps)], ["best_bonds_signature", sig]]) {
          await tx`insert into app.settings (key, value) values (${k}, ${v}) on conflict (key) do update set value = excluded.value, updated_at = now()`;
        }
      });
      void recordYields(src);
      return (memo = table);
    }
    const rows = await sql`select duration, level, bond from app.best_bonds order by duration, level, rank`;
    const [caps] = await sql`select value from app.settings where key = 'best_bonds_caps'`;
    const grid: BestTable["grid"] = {};
    for (const d of durationSteps()) {
      grid[key(d)] = {};
      for (let l = 1; l <= 10; l++) grid[key(d)][l] = [];
    }
    for (const r of rows) (grid[key(Number(r.duration))] ??= {})[r.level] ??= [], grid[key(Number(r.duration))][r.level].push(r.bond as RankedBond);
    return (memo = { signature: sig, grid, caps: caps ? JSON.parse(caps.value) : computeBestTable(src).caps });
  } catch (e) {
    console.error("[best-bonds] stored table unavailable, computing in memory:", (e as Error).message);
    return (memo = computeBestTable(src));
  }
}

/** The ranked bonds per risk step for the duration step nearest to `d`. */
export function curveAt(table: BestTable, d: number) {
  const levels = table.grid[key(snapDuration(d))] ?? {};
  return Array.from({ length: 10 }, (_, i) => i + 1).map((level) => ({ level, bonds: levels[level] ?? [] }));
}
