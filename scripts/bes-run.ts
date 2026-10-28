// Bond Efficiency Score run (lib/bes). Runs on a GitHub runner, never in the web process. Skips a price batch that is already calculated,
// unless an admin asked for a recalculation (a 'requested' row) or --force is given. Usage: npx vite-node -c vitest.config.ts scripts/bes-run.ts [--force]
import { loadAllShown } from "@/lib/bonds";
import { runBes } from "@/lib/bes/store";

const force = process.argv.includes("--force");
const { bonds, source } = await loadAllShown();
if (source !== "live") { console.log("FAILED: no live bond data."); process.exit(1); }
console.log(`Bonds shown on the site: ${bonds.length}`);
const r = await runBes(bonds, process.env.BES_TRIGGER ?? "script", force);
console.log(`\n${r.status.toUpperCase()}: ${r.message}`);
await new Promise((done) => setTimeout(done, 1500));
process.exit(r.status === "failed" ? 1 : 0);
