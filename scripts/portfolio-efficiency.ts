// Portfolio Efficiency Optimization (Methodology 5, lib/netSpread): the 90 portfolios with the highest equal-weight credit-adjusted net spread.
// Runs on a runner, never in the web process. Skips a price batch that is already optimised unless an admin asked for a recalculation or --force is given.
// Usage: npx vite-node -c vitest.config.ts scripts/portfolio-efficiency.ts [--force]
import { loadBondsFor } from "@/lib/bonds";
import { DEFAULT_FILTER } from "@/lib/bondFilter";
import { runPe } from "@/lib/netSpread/store";

const force = process.argv.includes("--force");
const src = await loadBondsFor(DEFAULT_FILTER);
if (src.source !== "live") { console.log("FAILED: no live bond data."); process.exit(1); }
console.log(`Bonds (EUR, 100k): ${src.bonds.length}`);
const r = await runPe(src.bonds, process.env.PE_TRIGGER ?? "script", force, (m) => console.log(m));
console.log(`\n${r.status.toUpperCase()}: ${r.message}`);
if (r.stats) console.log(JSON.stringify(r.stats, null, 1));
await new Promise((done) => setTimeout(done, 1500));
process.exit(r.status === "failed" ? 1 : 0);
