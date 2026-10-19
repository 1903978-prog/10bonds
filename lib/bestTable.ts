import { loadBonds, type BondSource } from "./bonds";
import { accountsConfigured, accountsSql } from "./accounts";
import { LIMITS } from "./limits";
import { curveByLevel } from "./singleBond";
import { ytmCapsByRisk } from "./ranking";
import type { RankedBond } from "./types";

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
  const out: number[] = [];
  for (let d = LIMITS.duration.min; d <= LIMITS.duration.max + 1e-9; d += LIMITS.duration.step) out.push(Math.round(d * 100) / 100);
  return out;
}

/** Signature of a bond copy: changes whenever the daily copy brings new yields. */
export function signatureOf(src: BondSource): string {
  // The leading version changes when the way the table is computed changes, so a new deploy rebuilds it.
  return `v2:${src.source}:${src.bonds.length}:${src.asOf ?? "none"}:${src.bonds.reduce((s, b) => s + (b.grossYtm ?? 0), 0).toFixed(4)}`;
}

export function computeBestTable(src: BondSource): BestTable {
  const grid: BestTable["grid"] = {};
  for (const d of durationSteps()) {
    grid[key(d)] = {};
    for (const p of curveByLevel(src.bonds, d)) grid[key(d)][p.level] = p.bonds;
  }
  return { signature: signatureOf(src), grid, caps: ytmCapsByRisk(src.bonds, LIMITS.duration, LIMITS.ytm) };
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

async function load(src: BondSource, sig: string): Promise<BestTable> {
  if (!accountsConfigured()) return (memo = computeBestTable(src));
  try {
    const sql = await accountsSql();
    const [stored] = await sql`select value from app.settings where key = 'best_bonds_signature'`;
    if (stored?.value !== sig) {
      const table = computeBestTable(src);
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
  const step = LIMITS.duration.step;
  const snapped = Math.min(LIMITS.duration.max, Math.max(LIMITS.duration.min, Math.round(d / step) * step));
  const levels = table.grid[key(snapped)] ?? {};
  return Array.from({ length: 10 }, (_, i) => i + 1).map((level) => ({ level, bonds: levels[level] ?? [] }));
}
