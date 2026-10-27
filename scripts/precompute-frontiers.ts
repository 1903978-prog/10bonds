// Works out the spread-rules lists for the four searches the finder offers (EUR and USD, all sizes and small orders; short, medium and long term) and saves them
// in the database (app.frontier_cache), so the live site reads them at once instead of solving for minutes after a release.
// A list already saved for exactly the current data and rules is kept as it is.
// Usage: npx vite-node -c vitest.config.ts scripts/precompute-frontiers.ts
process.env.ALLOW_LIVE_SOLVE = "1"; // this job is where the lists are solved
import { loadBondsFor } from "@/lib/bonds";
import { frontierKey } from "@/lib/frontierCache";
import { loadSavedFrontier, saveFrontier } from "@/lib/frontierStore";
import { coherentFrontier } from "@/lib/coherentFrontier";
import { TERMS } from "@/lib/limits";
import { sliderFor } from "@/lib/sliderCache";

const FILTERS = [
  { currency: "EUR", size: "100k" },
  { currency: "EUR", size: "1k" },
  { currency: "USD", size: "100k" },
  { currency: "USD", size: "1k" },
] as const;
for (const f of FILTERS) {
  const src = await loadBondsFor(f);
  console.log(`\n${f.currency} ${f.size}: ${src.bonds.length} bonds`);
  for (const t of TERMS) {
    const t0 = Date.now();
    const key = frontierKey(src, f, t.duration, "spread");
    const saved = await loadSavedFrontier(key);
    if (saved && !saved.stale) { console.log(`${t.key} (${t.duration}y): already saved`); continue; }
    try {
      const fr = await coherentFrontier(src.bonds, t.duration);
      await saveFrontier(key, fr);
      console.log(`${t.key} (${t.duration}y): ${fr.points.length} lists saved, ${Math.round((Date.now() - t0) / 1000)} s`);
    } catch (e) {
      console.log(`${t.key} (${t.duration}y): not solved (${(e as Error).message})`);
    }
  }
  // The slider positions (chart dots and the two tiles under the slider) are saved too, so the finder has them at once.
  for (const t of TERMS) {
    const { positions } = await sliderFor(f, t.duration, "spread", true).catch(() => ({ positions: null }));
    console.log(`${t.key} (${t.duration}y): ${positions?.length ?? 0} slider positions`);
  }
}
await new Promise((done) => setTimeout(done, 2000)); // let the saves finish
process.exit(0);
