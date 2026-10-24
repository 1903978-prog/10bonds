// Minimum extra return per risk step (lib/stepGap.ts) on live data, read-only: the slider frontier for every horizon
// and order size in EUR without the rule (before) and with it (after), side by side. Fails if a frontier is not monotonic.
// Usage: npx vite-node -c vitest.config.ts scripts/step-gap-live-check.ts
import { loadBondsFor } from "@/lib/bonds";
import { buildSlider } from "@/lib/sliderPortfolios";
import { exactFrontier, NO_STEPS, type ExactFrontier } from "@/lib/exactFrontier";
import { averageRisk, bondNotch, bondRisk } from "@/lib/ratings";
import { stepGap } from "@/lib/stepGap";
import { issuerKey } from "@/lib/ranking";
import { pdOf } from "@/lib/tiers";
import { TERMS } from "@/lib/limits";
import type { PublicBond } from "@/lib/types";

const f2 = (x: number) => x.toFixed(2);
let bad = 0;
for (const size of ["100k", "1k"] as const) for (const t of TERMS) {
  const src = await loadBondsFor({ currency: "EUR", size });
  const by = new Map(src.bonds.map((b) => [b.isin, b]));
  const run = (label: string, f: ExactFrontier, ms: number) => {
    const pos = buildSlider(f);
    let mono = true;
    for (let i = 1; i < pos.length; i++) if (!(pos[i].ytm! > pos[i - 1].ytm! && pos[i].expectedLoss! > pos[i - 1].expectedLoss!)) mono = false;
    if (!mono) bad++;
    // Riskier bonds in a list while a safer bond not in it pays within the step's minimum.
    let tiny = 0;
    const rows = pos.map((p) => p.isins.map((x) => by.get(x)!));
    for (const list of rows) {
      const used = new Set(list.map(issuerKey));
      for (const b of list) if (src.bonds.some((d: PublicBond) => !used.has(issuerKey(d)) && bondNotch(d)! < bondNotch(b)! && pdOf(d) < pdOf(b) && d.grossYtm! >= b.grossYtm! - stepGap(bondNotch(d)!, bondNotch(b)!) && Math.abs(d.modifiedDuration! - t.duration) <= t.duration * 0.2)) tiny++;
    }
    console.log(`${label}: ${pos.length} points, ${f2(pos[0]?.ytm ?? 0)}-${f2(pos.at(-1)?.ytm ?? 0)}%, solved in ${(ms / 1000).toFixed(2)}s, monotonic ${mono}, bonds paying under the step minimum ${tiny}`);
    console.log(`  ${pos.map((p, i) => `${p.position}:${f2(p.ytm!)}%/risk ${averageRisk(rows[i].map(bondRisk))?.toFixed(1)}/loss ${f2(p.expectedLoss!)}%`).join("  ")}`);
  };
  console.log(`\n== EUR ${size === "1k" ? "retail" : "all orders"} ${t.key} (${t.duration}y), ${src.bonds.length} bonds`);
  let t0 = Date.now();
  const before = exactFrontier(src.bonds, t.duration, NO_STEPS);
  run("before", before, Date.now() - t0);
  t0 = Date.now();
  const after = exactFrontier(src.bonds, t.duration);
  run("after ", after, Date.now() - t0);
}
console.log(bad ? `\nNOT MONOTONIC: ${bad}` : "\nall monotonic");
process.exit(bad ? 1 : 0);
