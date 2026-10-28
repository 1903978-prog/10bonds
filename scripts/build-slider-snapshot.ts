// Builds the 90-position slider snapshot (lib/sliderSnapshot.ts) for the current price batch from the stored risk-band lists, validates it and
// publishes it only when all 90 rows pass. Run by the "Precompute portfolio lists" job right after the band lists. Exit code 0 unless the run failed.
// Usage: npx vite-node -c vitest.config.ts scripts/build-slider-snapshot.ts
import { buildSnapshot, snapshotRows } from "@/lib/sliderSnapshot";

const r = await buildSnapshot("script", undefined, true);
console.log(`\n${r.status.toUpperCase()}: ${r.message}`);
for (const b of r.blockers) console.log(`- ${b}`);
if (r.snapshotId) {
  const rows = await snapshotRows(r.snapshotId);
  console.log("\n| Row | Position | YTM / Duration | Avg risk | Filled |\n|---:|---|---|---:|---|");
  for (const x of rows) console.log(`| ${x.row_no} | ${x.horizon} ${String(x.position).padStart(2, "0")} | ${x.filled ? `${Number(x.avg_ytm).toFixed(2)}% / ${Number(x.avg_duration).toFixed(2)}y` : "–"} | ${x.filled ? Number(x.avg_risk).toFixed(1) : "–"} | ${x.filled ? "YES" : "NO"} |`);
}
await new Promise((done) => setTimeout(done, 1500));
process.exit(r.status === "failed" ? 1 : 0);
