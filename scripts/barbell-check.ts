// Diagnostic: Portfolio EUR/All, risk <= 6, 5y. Pool per risk score, and the top 10 under different risk costs.
import { loadBondsFor } from "@/lib/bonds";
import { rankBonds, portfolioPool, withinRisk, issuerKey } from "@/lib/ranking";
import { bondRisk } from "@/lib/ratings";
import { listLossChance } from "@/lib/expectedLoss";
import { pdOf } from "@/lib/tiers";

const { bonds } = await loadBondsFor({ currency: "EUR", size: "100k" }, 2);
for (const d of [3, 5, 7]) for (const risk of [6, 8]) {
  const { pool, band } = portfolioPool(withinRisk(bonds, risk), d);
  const by: Record<number, number[]> = {};
  for (const b of pool) (by[bondRisk(b) ?? 0] ??= []).push(b.grossYtm!);
  console.log(`\n== ${d}y risk<=${risk} band ${band} pool ${pool.length} issuers ${new Set(pool.map(issuerKey)).size}`);
  for (const [r, ys] of Object.entries(by)) { ys.sort((a, b) => b - a); console.log(` risk ${r}: n=${ys.length} max ${ys[0].toFixed(2)} p25 ${ys[Math.floor(ys.length / 4)].toFixed(2)} median ${ys[Math.floor(ys.length / 2)].toFixed(2)}`); }
  for (const t of [3.8, 4.2, 4.48, 5.0]) {
    const { results } = rankBonds(bonds, d, t, 10, risk);
    const rs = results.map((r) => bondRisk(r) as number);
    const avg = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
    console.log(` t=${t} risks ${rs.join(",")} avgY ${avg(results.map((r) => r.grossYtm!)).toFixed(2)} avgR ${avg(rs).toFixed(2)} avgD ${avg(results.map((r) => r.modifiedDuration!)).toFixed(1)} loss% ${listLossChance(results.map(pdOf)).toFixed(1)}`);
  }
}
// Monotonic: more risk accepted never gives a higher average risk for the same target.
for (const d of [2, 5, 10]) for (const t of [3.5, 4.0, 4.48]) {
  const row: string[] = [];
  for (let risk = 1; risk <= 8; risk++) { const { results } = rankBonds(bonds, d, t, 10, risk); row.push(results.length ? listLossChance(results.map(pdOf)).toFixed(1) + "%/" + (results.reduce((s, r) => s + r.grossYtm!, 0) / results.length).toFixed(2) : "-"); }
  console.log(`${d}y t=${t}: ${row.join("  ")}`);
}
const t0 = Date.now(); rankBonds(bonds, 5, 4.48, 10, 8); console.log("ms", Date.now() - t0);
process.exit(0);
