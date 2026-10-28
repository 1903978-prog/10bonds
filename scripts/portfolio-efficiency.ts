// Portfolio Efficiency Optimization (Methodology 5, lib/netSpread): the 90 portfolios with the highest equal-weight credit-adjusted net spread.
// Runs on a runner, never in the web process. Skips a price batch that is already optimised unless an admin asked for a recalculation or --force is given.
// Usage: npx vite-node -c vitest.config.ts scripts/portfolio-efficiency.ts [--force]
import { loadBondsFor } from "@/lib/bonds";
import { DEFAULT_FILTER } from "@/lib/bondFilter";
import { runPe, runPositions } from "@/lib/netSpread/store";

const force = process.argv.includes("--force");
const src = await loadBondsFor(DEFAULT_FILTER);
if (src.source !== "live") { console.log("FAILED: no live bond data."); process.exit(1); }
console.log(`Bonds (EUR, 100k): ${src.bonds.length}`);
const r = await runPe(src, process.env.PE_TRIGGER ?? "script", force, (m) => console.log(m));
console.log(`\n${r.status.toUpperCase()}: ${r.message}`);
if (r.stats) console.log(JSON.stringify(r.stats, null, 1));
if (r.runId) {
  const rows = await runPositions(r.runId);
  const f = (v: unknown, d = 1) => (v === null || v === undefined ? "–" : Number(v).toFixed(d));
  console.log("\n| Term | Pos | Classes | Status | Return % | Dur | Gross bp | Loss bp | Net bp | Previous net | Change bp | Avg bond BES | Portfolio BES | Bonds changed |");
  console.log("|---|---:|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|---:|");
  const notes = new Map<string, number>();
  for (const p of rows) {
    const pv = p.previous ? (typeof p.previous === "string" ? JSON.parse(p.previous) : p.previous) : null;
    if (pv?.note) notes.set(pv.note, (notes.get(pv.note) ?? 0) + 1);
    const ok = pv?.reproducible && pv.feasibleUnderSameRules;
    console.log(`| ${p.horizon} | ${p.position}${p.repeat_of ? `=${p.repeat_of}` : ""} | ${(p.allowed as number[]).join(",")} | ${p.status} | ${f(p.ytm, 2)} | ${f(p.duration, 2)} | ${f(p.gross_spread_bp, 0)} | ${f(p.credit_loss_bp, 0)} | ${f(p.net_spread_bp, 1)} | ${pv?.reproducible ? f(pv.netSpreadBp, 1) : "n/a"} | ${ok ? f(pv.improvementBp, 1) : "n/a"} | ${f(p.avg_bond_bes)} | ${p.portfolio_bes === null ? "unavailable" : f(p.portfolio_bes)} | ${pv ? pv.added.length : "–"} |`);
  }
  console.log("\nComparison notes:");
  for (const [n, c] of notes) console.log(`- ${c}x ${n}`);
}
await new Promise((done) => setTimeout(done, 1500));
process.exit(r.status === "failed" ? 1 : 0);
