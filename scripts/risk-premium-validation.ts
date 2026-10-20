// Validation of the risk premium model (Version 1.0) on the live bond copy: universe counts, current vs
// risk-adjusted top 10 for a few 5-year searches, bonds below the hurdle, exceptional spreads, sensitivity.
// Read-only. Prints issuer names, yields and 10BONDS risk scores (what a free account sees), no ISINs or agency grades.
// Usage: npx vite-node -c vitest.config.ts scripts/risk-premium-validation.ts
import { loadBonds, loadOutliers } from "@/lib/bonds";
import { V1_CURVE } from "@/lib/riskPremium/curve";
import { compareScenario, contextFor, sensitivity, universeReport, type Row } from "@/lib/riskPremium/shadow";

const data = await loadBonds();
const ctx = contextFor(data.bonds, data.asOf, V1_CURVE);
console.log(`source ${data.source} · EUR bonds shown ${data.bonds.length} · data as of ${data.asOf} · Bund points ${ctx.bund.points.length}`);
console.log("Bund curve (years: yield):", ctx.bund.points.filter((_, i) => i % 3 === 0).map((p) => `${p.years.toFixed(1)}:${p.ytm.toFixed(2)}`).join(" "));

const u = universeReport(data.bonds, ctx);
console.log("\n== Universe (EUR) by status", JSON.stringify(u.counts));
console.log("== Not evaluated, by reason", JSON.stringify(Object.entries(u.reasons).sort((a, b) => b[1] - a[1])));

const fmt = (r: Row) => `${String(r.rank).padStart(2)} ${r.issuer.slice(0, 34).padEnd(34)} ytm ${r.ytm.toFixed(2)} dur ${r.duration.toFixed(1)} risk ${r.risk ?? "-"} req ${r.requiredBp ?? "-"} spread ${r.spreadBp?.toFixed(0) ?? "-"} surplus ${r.surplusBp?.toFixed(0) ?? "-"} ${r.status}`;
for (const sc of [{ duration: 5, ytm: 4, risk: 7 }, { duration: 5, ytm: 3.5, risk: 6 }, { duration: 5, ytm: 3, risk: 6 }, { duration: 4, ytm: 3.5, risk: 6 }]) {
  const c = compareScenario(data.bonds, ctx, sc);
  console.log(`\n== Scenario duration ${sc.duration} target ${sc.ytm}% risk<=${sc.risk}: overlap ${c.overlap}/10, risk-adjusted target reached ${c.riskAdjusted.targetReached}`);
  console.log("pool statuses", JSON.stringify(c.riskAdjusted.counts));
  console.log("-- current", JSON.stringify(c.current.summary));
  c.current.rows.forEach((r) => console.log(fmt(r)));
  console.log("-- risk-adjusted", JSON.stringify(c.riskAdjusted.summary));
  c.riskAdjusted.rows.forEach((r) => console.log(fmt(r)));
}

const br = compareScenario(data.bonds, ctx, { duration: 5, ytm: 4, risk: 7 }, await loadOutliers()).bracket;
console.log(`\n== Bracket 5y / 4% / risk 7: ${br.length} EUR bonds, reasons`);
const kinds: Record<string, number> = {};
for (const r of br) { const k = r.why.split(/[:(]/)[0]; kinds[k] = (kinds[k] ?? 0) + 1; }
console.log(JSON.stringify(kinds));
br.slice(0, 25).forEach((r) => console.log(`${r.issuer.slice(0, 30).padEnd(30)} ${r.ytm.toFixed(2)} risk ${r.risk} · ${r.why}`));

console.log(`\n== Below required compensation: ${u.belowHurdle.length} (worst 20)`);
u.belowHurdle.slice(0, 20).forEach((r) => console.log(fmt(r)));
console.log(`\n== Exceptional spread review: ${u.exceptional.length}`);
u.exceptional.slice(0, 30).forEach((r) => console.log(fmt(r)));
console.log(`\n== Eligible: ${u.eligible.length} (best 15)`);
u.eligible.slice(0, 15).forEach((r) => console.log(fmt(r)));

console.log("\n== Sensitivity (default search 5y / 4% / risk 7)");
for (const s of sensitivity(data.bonds, ctx)) console.log(JSON.stringify(s));
process.exit(0);
