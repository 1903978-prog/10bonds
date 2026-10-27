// Works out the 30 risk bands lists (revised 30-band method, lib/bandFrontier.ts) for the default search (EUR, all sizes; short, medium and long term)
// and saves them in the database (app.bands30_cache), so the live site only reads them. Lists already saved for exactly the current data are kept.
// Usage: npx vite-node -c vitest.config.ts scripts/precompute-bands30.ts
import { loadBondsFor } from "@/lib/bonds";
import { bandsKey, loadBands, saveBands } from "@/lib/bands30";
import { buildFrontier, pickPositions, verifyList } from "@/lib/bandFrontier";
import { activePolicy } from "@/lib/coherence";
import { TERMS } from "@/lib/limits";

const f = { currency: "EUR", size: "100k" } as const;
const src = await loadBondsFor(f);
console.log(`${src.bonds.length} bonds`);
for (const t of TERMS) {
  const t0 = Date.now();
  const key = bandsKey(src, f, t.duration);
  const saved = await loadBands(key);
  if (saved && !saved.stale) { console.log(`${t.key} (${t.duration}y): already saved`); continue; }
  const fr = await buildFrontier(src.bonds, t.duration);
  const shown = pickPositions(fr.efficient, 30);
  const lists = shown
    .map((p) => ({ isins: p.sel.map((c) => c.b.isin).sort(), kind: p.src === "low end" ? ("low-end" as const) : p.src === "high end" ? ("high-end" as const) : ("regular" as const) }))
    .filter((l) => {
      const v = verifyList(l.isins, src.bonds, t.duration, activePolicy(), l.kind !== "regular");
      if (!v.ok) console.error(`  left out (failed re-check): ${v.problems.join("; ")}`);
      return v.ok;
    });
  await saveBands(key, { duration: t.duration, lists, complete: fr.complete, asOf: src.asOf ?? "" });
  console.log(`${t.key} (${t.duration}y): ${lists.length} lists saved (certification complete: ${fr.complete}), ${Math.round((Date.now() - t0) / 1000)} s`);
}
process.exit(0);
