// Temporary: per-bond default chance and the list KPIs for Livio's two screenshots (EUR, 1k-10k, 5y, risk <= 6).
import { loadBondsFor } from "@/lib/bonds";
import { rankBonds } from "@/lib/ranking";
import { bondRisk } from "@/lib/ratings";
import { listLossChance, listLifeLoss } from "@/lib/expectedLoss";
import { pdOf } from "@/lib/tiers";
import { lifeYears } from "@/lib/lifeYears";
const { bonds } = await loadBondsFor({ currency: "EUR", size: "1k" }, 2);
for (const t of [4.14, 4.1, 3.8, 4.4]) {
  const { results } = rankBonds(bonds, 5, t, 10, 6);
  console.log(`\n== target ${t}`);
  for (const r of results) console.log(` ${r.issuer?.slice(0, 30).padEnd(30)} risk ${bondRisk(r)} yrs ${lifeYears(r).toFixed(1)} pd ${pdOf(r).toFixed(2)}%`);
  const pds = results.map(pdOf);
  console.log(` chance ${listLossChance(pds).toFixed(2)}%  expected loss ${listLifeLoss(pds).toFixed(3)}%`);
}
process.exit(0);
