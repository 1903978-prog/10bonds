// Frontier slider check on live data (read-only): for every horizon, currency and order size, the new frontier
// positions (lib/sliderPortfolios.ts) against the earlier 30 risk-ceiling positions (lib/sliderPortfoliosOld.ts, copied
// from main by the workflow, medium term only). Prints the returns and spacing, and fails if a new frontier is not monotonic.
// Usage: npx vite-node -c vitest.config.ts scripts/frontier-live-check.ts
import { loadBondsFor } from "@/lib/bonds";
import { pickRanking } from "@/lib/pickRanking";
import { isWeak } from "@/lib/frontierGuard";
import { buildSlider } from "@/lib/sliderPortfolios";
import { exactFrontier } from "@/lib/exactFrontier";
import { gapsOf } from "@/lib/frontierPoints";
import { TERMS } from "@/lib/limits";
import type { BondFilter } from "@/lib/bondFilter";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore only present in the workflow
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const old: any = await import("@/lib/sliderPortfoliosOld").catch(() => null);
const f2 = (x: number) => x.toFixed(2);
const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)] ?? 0; };
let bad = 0;
for (const currency of ["EUR", "USD"] as const) for (const size of ["100k", "1k"] as const) for (const t of TERMS) {
  const filter: BondFilter = { currency, size };
  const src = await loadBondsFor(filter);
  const label = `${currency} ${size === "1k" ? "retail (min order <= 10k)" : "all orders"} ${t.key} (${t.duration}y)`;
  const t0 = Date.now();
  const f = exactFrontier(src.bonds, t.duration);
  const ms = Date.now() - t0;
  const pos = buildSlider(f);
  const by = new Map(src.bonds.map((b) => [b.isin, b]));
  let mono = true, weakMax = 0;
  for (let i = 0; i < pos.length; i++) {
    weakMax = Math.max(weakMax, pos[i].isins.filter((x) => isWeak(by.get(x)!)).length);
    if (i && !(pos[i].ytm! > pos[i - 1].ytm! && pos[i].expectedLoss! >= pos[i - 1].expectedLoss!)) mono = false;
  }
  const g = gapsOf(pos.map((p) => ({ ytm: p.ytm!, el: p.expectedLoss! })));
  const rg = pos.slice(1).map((p, i) => p.ytm! - pos[i].ytm!);
  console.log(`\n== ${label}: ${src.bonds.length} bonds, ${f.size} bonds in the optimiser, ${f.points.length} efficient lists, ${pos.length} points, solved in ${(ms / 1000).toFixed(2)}s, monotonic ${mono}, max weak bonds ${weakMax}`);
  console.log(`new: ${pos.map((p) => `${p.position}:${f2(p.ytm!)}%/${f2(p.expectedLoss!)}`).join(" ")}`);
  if (g.length) console.log(`new spacing: return gap max ${f2(Math.max(...rg))} median ${f2(median(rg))}; curve gap max/median ${(Math.max(...g) / (median(g) || 1)).toFixed(1)}x`);
  if (!mono) bad++;
  // The old build takes a while (dozens of rankings), so only for the medium term.
  if (old && t.key === "mid") {
    const o = await old.buildSlider(async (ytm: number, risk: number) => (await pickRanking(src.bonds, src.asOf, t.duration, ytm, risk)).results);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const shown = o.filter((p: any) => !p.unavailable && !p.sameAs);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const org = shown.slice(1).map((p: any, i: number) => p.ytm - shown[i].ytm);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    console.log(`old: ${o.map((p: any) => `${p.position}:${p.ytm == null ? "-" : f2(p.ytm)}${p.sameAs ? `=#${p.sameAs}` : ""}`).join(" ")}`);
    console.log(`old spacing: ${shown.length} distinct of 30; return gap max ${org.length ? f2(Math.max(...org)) : "-"} median ${f2(median(org))}`);
  }
}
console.log(bad ? `\nNOT MONOTONIC: ${bad}` : "\nall monotonic");
process.exit(bad ? 1 : 0);
