import { loadAllBonds, type BondSource } from "./bonds";
import { bestTable, computeBestTable, signatureOf, type BestTable } from "./bestTable";
import { applyFilters, filterKey, isDefault, type SearchFilters } from "./filters";

/** The bonds the search page may show for these toggles (EUR/USD, minimum order). */
export async function searchSource(f: SearchFilters): Promise<BondSource> {
  const all = await loadAllBonds();
  const bonds = applyFilters(all.bonds, f);
  const dates = bonds.map((b) => b.ytmAsOf).filter((d): d is string => !!d).sort();
  return { bonds, source: all.source, asOf: dates.at(-1) ?? null };
}

// One table per toggle combination, rebuilt only when the daily copy changes. The default (EUR, any order) is the stored table.
const memo = new Map<string, BestTable>();

export async function searchTable(f: SearchFilters): Promise<BestTable> {
  if (isDefault(f)) return bestTable();
  const src = await searchSource(f);
  const k = filterKey(f);
  const sig = signatureOf(src);
  const hit = memo.get(k);
  if (hit?.signature === sig) return hit;
  const table = computeBestTable(src);
  memo.set(k, table);
  return table;
}
