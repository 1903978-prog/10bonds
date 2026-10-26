// Which bonds the outlier rule (lib/outliers.ts) leaves out on the live copy, the 5-year top 10 after it, and the
// admin "why in or out" reasons for the 4-6y bracket. Read-only. Usage: npx vite-node -c vitest.config.ts scripts/outliers-live-check.ts
import { loadBonds, loadOutliers } from "@/lib/bonds";
import { bondRisk } from "@/lib/ratings";
import { rankBonds } from "@/lib/ranking";
import { V1_CURVE } from "@/lib/riskPremium/curve";
import { compareScenario, contextFor, DEFAULT_SCENARIO } from "@/lib/riskPremium/shadow";

for (const sd of [0.5, 1, 1.5, 2, 2.5, 3, 4, 5]) console.log(`sd ${sd}: ${(await loadOutliers(sd)).length} outliers`);
const data = await loadBonds();
const outliers = await loadOutliers();
console.log(`\nshown EUR bonds ${data.bonds.length} · left out as outliers at 2 sd (all currencies) ${outliers.length}`);
const count = (xs: string[]) => Object.entries(xs.reduce<Record<string, number>>((m, x) => ((m[x] = (m[x] ?? 0) + 1), m), {})).map(([k, n]) => `${k} ${n}`).join(" · ");
for (const cur of ["EUR", "USD", "all"]) {
  const out = outliers.filter((o) => cur === "all" || o.bond.currency === cur);
  const shown = data.bonds.filter((b) => cur === "all" || b.currency === cur);
  console.log(`${cur}: left out by reason: ${count(out.map((o) => o.reason))} · by seniority text of the rank/name cuts: ${count(out.filter((o) => o.reason !== "yield").map((o) => o.bond.seniority ?? "(none)"))} · shown with seniority text ${shown.filter((b) => b.seniority).length} of ${shown.length}; shown senior non-preferred ${shown.filter((b) => /non[- ]?preferred/i.test(b.seniority ?? "")).length}`);
}
for (const o of outliers.filter((o) => o.bond.currency === "EUR").sort((a, b) => b.bond.grossYtm! - a.bond.grossYtm!))
  console.log(`${o.reason.padEnd(5)} ${o.bond.currency} risk ${bondRisk(o.bond)} dur ${o.bond.modifiedDuration?.toFixed(1)} ytm ${o.bond.grossYtm?.toFixed(2)} avg ${o.peerMean?.toFixed(2) ?? "-"} sd ${o.peerSd?.toFixed(2) ?? "-"} ${o.bond.name.slice(0, 60)}`);
for (const sc of [{ d: 5, y: 4, r: 7 }, { d: 5, y: 3.5, r: 6 }]) {
  console.log(`\n== top 10, ${sc.d}y target ${sc.y}% risk<=${sc.r}`);
  for (const b of rankBonds(data.bonds, sc.d, sc.y, undefined, sc.r).results) console.log(`${String(b.rank).padStart(2)} ${b.name.slice(0, 44).padEnd(44)} ytm ${b.grossYtm!.toFixed(2)} dur ${b.modifiedDuration!.toFixed(1)} risk ${bondRisk(b)}`);
}
const cmp = compareScenario(data.bonds, contextFor(data.bonds, data.asOf, V1_CURVE), DEFAULT_SCENARIO, outliers);
console.log(`\n== 4-6y bracket, Pareto and Romania rows (${cmp.bracket.length} bonds)`);
for (const r of cmp.bracket.filter((r) => /Pareto/.test(r.why) || /romania/i.test(r.issuer)).slice(0, 40))
  console.log(`${r.issuer.slice(0, 30).padEnd(30)} ytm ${r.ytm.toFixed(2)} risk ${r.risk} dur ${r.duration.toFixed(1)} · ${r.why}`);
process.exit(0);
