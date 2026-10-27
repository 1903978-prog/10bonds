// Counts risk 1 (AAA) bonds and issuer groups in each horizon's candidate pool, read-only.
// Usage: npx vite-node -c vitest.config.ts scripts/risk1-count.ts
import { loadBondsFor } from "@/lib/bonds";
import { candidatesOf } from "@/lib/coherentFrontier";
import { TERMS } from "@/lib/limits";

for (const currency of ["EUR", "USD"] as const) {
  const src = await loadBondsFor({ currency, size: "100k" });
  for (const t of TERMS) {
    for (const spread of [false, true]) {
      const cs = candidatesOf(src.bonds, t.duration, spread);
      const one = cs.filter((c) => c.cls === 1);
      const groups = new Set(one.map((c) => c.group));
      const sectors = new Map<string, number>();
      for (const g of new Set(groups)) { const s = one.find((c) => c.group === g)!.sector; sectors.set(s, (sectors.get(s) ?? 0) + 1); }
      console.log(`${currency} ${t.key} spread=${spread}: pool ${cs.length}, risk1 bonds ${one.length}, groups ${groups.size}, sectors ${[...sectors].map(([s, n]) => s + ":" + n).join(",")}, beaten risk1 ${one.filter((c) => c.beatenBy.size).length}`);
    }
  }
}
// run
