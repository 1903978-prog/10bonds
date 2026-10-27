// Works out the 30 risk-band portfolios (lib/riskBands.ts) for every search the finder offers (EUR and USD, all sizes and small orders; short,
// medium and long term) with the exact solver and saves them in the database, so the finder shows a clicked point from storage in a few
// milliseconds. A set already saved for exactly the current data and band table is kept.
// Usage: npx vite-node -c vitest.config.ts scripts/precompute-bands.ts [EUR:100k ...]
process.env.ALLOW_LIVE_SOLVE = "1";
import { loadBondsFor } from "@/lib/bonds";
import { TERMS } from "@/lib/limits";
import { buildBands } from "@/lib/riskBandsBuild";
import { bandsKey } from "@/lib/riskBandsServe";
import { loadBandConfig, loadStoredBands, saveStoredBands } from "@/lib/riskBandsStore";

const ALL = ["EUR:100k", "EUR:1k", "USD:100k", "USD:1k"];
const want = process.argv.slice(2).length ? process.argv.slice(2) : ALL;
const cfg = await loadBandConfig();
for (const w of want) {
  const [currency, size] = w.split(":") as ["EUR" | "USD", "100k" | "1k"];
  const f = { currency, size } as const;
  const src = await loadBondsFor(f);
  console.log(`\n${w}: ${src.bonds.length} bonds`);
  for (const t of TERMS) {
    const key = bandsKey(src, f, t.duration, cfg);
    const saved = await loadStoredBands(key);
    if (saved && !saved.stale) { console.log(`${t.key} (${t.duration}y): already saved`); continue; }
    const t0 = Date.now();
    try {
      const sb = await buildBands(src.bonds, t.duration, cfg, key.split("|")[0]);
      await saveStoredBands(key, sb);
      const ok = sb.bands.filter((b) => b.status === "ok");
      console.log(`${t.key} (${t.duration}y): ${ok.length}/30 bands, ${ok.filter((b) => b.optimal).length} proven optimal, candidates ${sb.candidates.kept}/${sb.candidates.all}, ${Math.round((Date.now() - t0) / 1000)} s${sb.nonMonotonic.length ? `, yield not rising at band(s) ${sb.nonMonotonic.join(",")}` : ""}`);
    } catch (e) {
      console.log(`${t.key} (${t.duration}y): not solved (${(e as Error).message})`);
    }
  }
}
// The stored lists for EUR, all sizes: position x horizon (average risk, average return, expected loss), for the run summary.
{
  const f = { currency: "EUR", size: "100k" } as const;
  const src = await loadBondsFor(f);
  const sets = await Promise.all(TERMS.map(async (t) => (await loadStoredBands(bandsKey(src, f, t.duration, cfg)))?.data ?? null));
  console.log("\n| Position | Band | " + TERMS.map((t) => `${t.key} risk | ${t.key} return % | ${t.key} loss %`).join(" | ") + " |");
  console.log("|---:|---|" + TERMS.map(() => "---:|---:|---:").join("|") + "|");
  for (const b of cfg.bands) {
    const cells = sets.map((sb) => { const x = sb?.bands[b.k - 1]; return x && x.status === "ok" ? `${x.avgRisk?.toFixed(1)} | ${x.ytm?.toFixed(2)}${x.optimal ? "" : "*"} | ${x.el?.toFixed(3)}` : "no list | – | –"; });
    console.log(`| ${b.k} | ${b.min.toFixed(1)}–${b.max.toFixed(1)} | ${cells.join(" | ")} |`);
  }
  console.log("\n* = valid list, not proven optimal by the solver within its time limit");
}
await new Promise((done) => setTimeout(done, 2000)); // let the saves finish
process.exit(0);
