// Read-only analysis (Livio 27/10): how many EUR bonds survive "top N by return per duration bucket x risk score", and does pruning change the
// efficient lists for Short / Medium / Long? Runs the real engine (coherentFrontier) on the full set and on each pruned set.
// Usage: npx vite-node -c vitest.config.ts scripts/prune-analysis.ts
import fs from "node:fs";
import { loadBondsFor } from "@/lib/bonds";
import { coherentFrontier } from "@/lib/coherentFrontier";
import { liveRiskConfig } from "@/lib/riskPremium/store";
import { buildSlider } from "@/lib/sliderPortfolios";
import { bondRisk } from "@/lib/ratings";
import { issuerKey } from "@/lib/ranking";
import { activePolicy } from "@/lib/coherence";
import { LIMITS, TERMS } from "@/lib/limits";
import type { PublicBond } from "@/lib/types";

await liveRiskConfig();
const { bonds, asOf } = await loadBondsFor({ currency: "EUR", size: "100k" });
const out = process.env.QUANT_OUT ?? "quant-out";
fs.mkdirSync(out, { recursive: true });
const md: string[] = [`# Pruning analysis, EUR, data ${asOf}`, "", `EUR bonds passing today's filters (rated, seniority/name rule, outlier rule, price checks, any minimum order): **${bonds.length}**`, ""];

function prune(all: PublicBond[], width: number, n: number, distinctIssuers = false): PublicBond[] {
  const cells = new Map<string, PublicBond[]>();
  for (const b of all) {
    const k = `${Math.floor(b.modifiedDuration! / width)}|${bondRisk(b)}`;
    (cells.get(k) ?? cells.set(k, []).get(k)!).push(b);
  }
  const keep: PublicBond[] = [];
  for (const list of cells.values()) {
    const sorted = [...list].sort((a, b) => b.grossYtm! - a.grossYtm! || a.isin.localeCompare(b.isin));
    if (!distinctIssuers) { keep.push(...sorted.slice(0, n)); continue; }
    const seen = new Set<string>();
    for (const b of sorted) { const k = issuerKey(b); if (!seen.has(k)) { seen.add(k); keep.push(b); if (seen.size >= n) break; } }
  }
  return keep;
}
const variants = [
  { name: "bucket 0.5y, top 10", width: 0.5, n: 10, d: false },
  { name: "bucket 1y, top 10", width: 1, n: 10, d: false },
  { name: "bucket 2y, top 10", width: 2, n: 10, d: false },
  { name: "bucket 1y, top 10 issuers", width: 1, n: 10, d: true },
  { name: "bucket 1y, top 30", width: 1, n: 30, d: false },
];
const kept = variants.map((v) => ({ ...v, set: prune(bonds, v.width, v.n, v.d) }));
md.push("## How many survive", "", "| Rule | Bonds kept | Share of EUR set | Share of 13,000 |", "|---|---:|---:|---:|");
for (const v of kept) md.push(`| ${v.name} | ${v.set.length} | ${(100 * v.set.length / bonds.length).toFixed(1)}% | ${(100 * v.set.length / 13000).toFixed(1)}% |`);
md.push("");

const pol = activePolicy();
md.push("## Do the lists change? (real engine, same policy)", "");
const sum: Record<string, unknown> = {};
for (const t of TERMS) {
  const t0 = Date.now();
  const full = await coherentFrontier(bonds, t.duration, pol, LIMITS.risk.max);
  const fullSlider = buildSlider(full);
  md.push(`### ${t.key} (${t.duration}y): full set ${full.points.length} efficient lists, ${fullSlider.length} slider positions (${((Date.now() - t0) / 1000).toFixed(0)} s)`, "", "| Rule | Efficient lists | Lists identical to full | Slider positions | Positions identical | Worst return shortfall at same target (pt) | Targets unreachable |", "|---|---:|---:|---:|---:|---:|---:|");
  for (const v of kept) {
    const fr = await coherentFrontier(v.set, t.duration, pol, LIMITS.risk.max);
    const sl = buildSlider(fr);
    const fullKeys = new Set(full.points.map((p) => p.isins.join()));
    const same = fr.points.filter((p) => fullKeys.has(p.isins.join())).length;
    const slSame = sl.filter((p, i) => fullSlider[i] && p.ytm === fullSlider[i].ytm && p.expectedLoss === fullSlider[i].expectedLoss).length;
    let worst = 0, unreachable = 0;
    for (const p of full.points) {
      const q = fr.at(p.ytm - 1e-9);
      if (!q) { unreachable++; continue; }
      worst = Math.max(worst, p.ytm - q.ytm > 0 ? p.ytm - q.ytm : 0);
    }
    // loss difference at the same target return
    let worstLoss = 0;
    for (const p of full.points) { const q = fr.at(p.ytm - 1e-9); if (q) worstLoss = Math.max(worstLoss, q.el - p.el); }
    md.push(`| ${v.name} | ${fr.points.length} | ${same} | ${sl.length} | ${slSame} | return ${worst.toFixed(3)}; extra loss up to ${worstLoss.toFixed(3)} | ${unreachable} |`);
    sum[`${t.key}|${v.name}`] = { points: fr.points.length, same, sl: sl.length, slSame, worst, worstLoss, unreachable };
  }
  md.push("");
}
fs.writeFileSync(`${out}/prune.md`, md.join("\n"));
fs.writeFileSync(`${out}/prune.json`, JSON.stringify(sum, null, 1));
console.log(md.join("\n"));
process.exit(0);
