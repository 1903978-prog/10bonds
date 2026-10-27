// Works out the spread-rules lists for the default search (EUR, all sizes; short, medium and long term) and saves them
// in the database (app.frontier_cache), so the live site reads them at once instead of solving for minutes after a release.
// A list already saved for exactly the current data and rules is kept as it is.
// Usage: npx vite-node -c vitest.config.ts scripts/precompute-frontiers.ts
import { loadBondsFor } from "@/lib/bonds";
import { frontierKey } from "@/lib/frontierCache";
import { loadSavedFrontier, saveFrontier } from "@/lib/frontierStore";
import { coherentFrontier } from "@/lib/coherentFrontier";
import { TERMS } from "@/lib/limits";
import { sliderFor } from "@/lib/sliderCache";

const f = { currency: "EUR", size: "100k" } as const;
const src = await loadBondsFor(f);
console.log(`${src.bonds.length} bonds`);
for (const t of TERMS) {
  const t0 = Date.now();
  const key = frontierKey(src, f, t.duration, "spread");
  const saved = await loadSavedFrontier(key);
  if (saved && !saved.stale) { console.log(`${t.key} (${t.duration}y): already saved`); continue; }
  const fr = await coherentFrontier(src.bonds, t.duration);
  await saveFrontier(key, fr);
  console.log(`${t.key} (${t.duration}y): ${fr.points.length} lists saved, ${Math.round((Date.now() - t0) / 1000)} s`);
}
// The slider positions (chart dots and the two tiles under the slider) are saved too, so the finder has them at once.
for (const t of TERMS) {
  const { positions } = await sliderFor(f, t.duration, "spread", true);
  console.log(`${t.key} (${t.duration}y): ${positions?.length ?? 0} slider positions`);
}
await new Promise((done) => setTimeout(done, 2000)); // let the saves finish
process.exit(0);
