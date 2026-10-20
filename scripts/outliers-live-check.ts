// Which bonds the outlier rule (lib/outliers.ts) leaves out on the live copy, and the 5-year top 10 after it.
// Read-only. Usage: npx vite-node -c vitest.config.ts scripts/outliers-live-check.ts
import { loadBonds, loadOutliers } from "@/lib/bonds";
import { bondRisk } from "@/lib/ratings";
import { rankBonds } from "@/lib/ranking";

const data = await loadBonds();
const outliers = await loadOutliers();
console.log(`shown EUR bonds ${data.bonds.length} · left out as outliers (all currencies) ${outliers.length}`);
for (const o of outliers.sort((a, b) => b.bond.grossYtm! - a.bond.grossYtm!))
  console.log(`${o.reason.padEnd(5)} ${o.bond.currency} risk ${bondRisk(o.bond)} dur ${o.bond.modifiedDuration?.toFixed(1)} ytm ${o.bond.grossYtm?.toFixed(2)} peers ${o.peerMedian?.toFixed(2) ?? "-"} ${o.bond.name.slice(0, 60)}`);
for (const sc of [{ d: 5, y: 4, r: 7 }, { d: 5, y: 3.5, r: 6 }]) {
  console.log(`\n== top 10, ${sc.d}y target ${sc.y}% risk<=${sc.r}`);
  for (const b of rankBonds(data.bonds, sc.d, sc.y, undefined, sc.r).results) console.log(`${String(b.rank).padStart(2)} ${b.name.slice(0, 44).padEnd(44)} ytm ${b.grossYtm!.toFixed(2)} dur ${b.modifiedDuration!.toFixed(1)} risk ${bondRisk(b)}`);
}
process.exit(0);
