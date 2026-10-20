// Temporary: expected loss on your money across target yields, 5y, EUR, All, risk <= 7.
import { loadBondsFor } from "@/lib/bonds";
import { rankBonds, capOf } from "@/lib/ranking";
import { bondRisk } from "@/lib/ratings";
import { listLifeLoss, listLossChance } from "@/lib/expectedLoss";
import { pdOf } from "@/lib/tiers";
const { bonds } = await loadBondsFor({ currency: "EUR", size: "100k" }, 2);
const top = rankBonds(bonds, 5, 99, 10, 7).results;
console.log("cap(top10 avg)", capOf(top.map((r) => r.grossYtm!)));
const targets = [1.0, 2.0, 3.0, 3.5, 3.75, 4.0, 4.25, 4.48, 4.75, 5.0, 5.25, 5.5, 5.75, 6.0, 6.25, 6.5, 6.75, 6.89];
for (const t of targets) {
  const { results } = rankBonds(bonds, 5, t, 10, 7);
  if (!results.length) { console.log(`t=${t} none`); continue; }
  const pds = results.map(pdOf);
  const avgY = results.reduce((s, r) => s + r.grossYtm!, 0) / results.length;
  const avgR = results.reduce((s, r) => s + (bondRisk(r) ?? 0), 0) / results.length;
  const avgD = results.reduce((s, r) => s + r.modifiedDuration!, 0) / results.length;
  console.log(`t=${t} avgYield=${avgY.toFixed(2)} avgRisk=${avgR.toFixed(2)} avgDur=${avgD.toFixed(2)} expLoss=${listLifeLoss(pds).toFixed(3)} chance=${listLossChance(pds).toFixed(2)}`);
}
process.exit(0);
