// Stored lists of the unified portfolio engine for the exact years 1 to 15 (Plus and above pick one; the three terms are years 2, 4 and 10 and are
// built by the Portfolio Efficiency job, scripts/portfolio-efficiency.ts). Same spec, same solver, same validator as the terms (docs/PORTFOLIO_SPEC.md).
// EUR, 100k only; other filters are solved live on request. A year already saved for exactly the current prices and spec version is kept.
// Needs the Bond Efficiency run of the current prices (the Portfolio Efficiency job makes it first).
// With --m3 it builds Methodology 3's average-risk bands instead (admin-only, on demand: the production site never serves them).
// Usage: npx vite-node -c vitest.config.ts scripts/precompute-bands.ts [--m3]
process.env.ALLOW_LIVE_SOLVE = "1";
import { loadAllShown, loadBondsFor } from "@/lib/bonds";
import { EXACT_YEARS, TERMS } from "@/lib/limits";
import { batchIdOf } from "@/lib/bes/store";
import { buildBands } from "@/lib/riskBandsBuild";
import { bandsKey } from "@/lib/riskBandsServe";
import { loadBandConfig, loadStoredBands, saveStoredBands } from "@/lib/riskBandsStore";
import { buildHorizon, horizonOfYear } from "@/lib/netSpread/build";
import { specConfig } from "@/lib/netSpread/config";
import { publishHorizon } from "@/lib/netSpread/publishBands";
import { loadBes } from "@/lib/netSpread/store";

const f = { currency: "EUR", size: "100k" } as const;
const src = await loadBondsFor(f);
console.log(`Bonds (EUR, 100k): ${src.bonds.length}`);

if (process.argv.includes("--m3")) {
  const cfg = await loadBandConfig();
  for (const t of TERMS) {
    const key = bandsKey(src, f, t.duration, cfg);
    const saved = await loadStoredBands(key);
    if (saved && !saved.stale) { console.log(`M3 ${t.key}: already saved`); continue; }
    const sb = await buildBands(src.bonds, t.duration, cfg, key.split("|")[0]);
    await saveStoredBands(key, sb);
    console.log(`M3 ${t.key}: ${sb.bands.filter((b) => b.status === "ok").length}/30 bands`);
  }
  await new Promise((done) => setTimeout(done, 2000));
  process.exit(0);
}

const bes = await loadBes(batchIdOf((await loadAllShown()).bonds));
if (!bes) { console.log("FAILED: no Bond Efficiency run for this price batch (run the Portfolio Efficiency job first)."); process.exit(1); }
const cfg = specConfig();
let failed = 0;
for (const y of EXACT_YEARS.filter((y) => !TERMS.some((t) => t.duration === y))) {
  const key = bandsKey(src, f, y, cfg);
  const saved = await loadStoredBands(key);
  if (saved && !saved.stale) { console.log(`year ${y}: already saved`); continue; }
  const t0 = Date.now();
  try {
    const results = await buildHorizon({ bonds: src.bonds, bes: bes.bonds, seedKey: key, light: true }, horizonOfYear(y), y, 1);
    await publishHorizon(src, f, y, results);
    const count = (s: string) => results.filter((r) => r.status === s).length;
    console.log(`year ${y}: ${count("optimal") + count("uncertified")}/30 lists (${count("optimal")} proven optimal), ${count("infeasible")} infeasible, ${count("error")} errors, ${results.filter((r) => r.repeatOf && r.repeatOf !== r.position).length} repeats, ${Math.round((Date.now() - t0) / 1000)} s`);
    if (count("error")) failed++;
  } catch (e) {
    failed++;
    console.log(`year ${y}: not solved (${(e as Error).message})`);
  }
}
await new Promise((done) => setTimeout(done, 2000)); // let the saves finish
process.exit(failed ? 1 : 0);
