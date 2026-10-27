// Impact of dependence on the portfolios the engine produces today, on the frozen snapshot (read-only; EXPERIMENTAL presets,
// lib/correlatedLoss.ts, NOT calibrated). For EUR Short / Medium / Long: lowest, middle, highest slider position, each ten-bond list
// under independent / moderate / severe common-factor scenarios: expected loss, chance of any default, joint default of a pair,
// default-count distribution, VaR and CVaR 95 (% of the money, to each bond's maturity, undiscounted).
// Usage: QUANT_SNAPSHOT=snapshot.json.gz QUANT_OUT=out npx vite-node -c vitest.config.ts scripts/quant-correlation-impact.ts
import fs from "node:fs";
import zlib from "node:zlib";
import path from "node:path";
import { coherentFrontier } from "@/lib/coherentFrontier";
import { buildSlider } from "@/lib/sliderPortfolios";
import { portfolioRisk, PRESETS, CORRELATION_MODEL_VERSION, type Exposure } from "@/lib/correlatedLoss";
import { pdOf } from "@/lib/tiers";
import { lgdOf } from "@/lib/seniority";
import { sectorOf } from "@/lib/sectors";
import { TERMS } from "@/lib/limits";
import type { BondSource } from "@/lib/bonds";

const src: BondSource = JSON.parse(zlib.gunzipSync(fs.readFileSync(process.env.QUANT_SNAPSHOT!)).toString());
const out = process.env.QUANT_OUT ?? "quant-out";
fs.mkdirSync(out, { recursive: true });
const f2 = (x: number) => x.toFixed(2);
const md = [`# Dependence impact on today's portfolios (EXPERIMENTAL, uncalibrated presets, model ${CORRELATION_MODEL_VERSION})`, `Frozen data ${src.asOf}, ${src.bonds.length} bonds. Loss in % of the money to maturity; 200,000 scenarios, seed 1. Presets are illustrative stress settings, not estimates.`, ""];
const json: any = {};
for (const t of TERMS) {
  const fr = await coherentFrontier(src.bonds, t.duration);
  const sl = buildSlider(fr);
  const by = new Map(fr.points.flatMap((p) => p.rows.map((r) => [r.isin, r] as const)));
  md.push(`## ${t.key} (${t.duration}y)`, "", "| Position | Return % | Independent: EL / any default / CVaR95 | Moderate: EL / any default / CVaR95 | Severe: EL / any default / CVaR95 | Pair joint default % (ind / mod / sev) |", "|---|---|---|---|---|---|");
  json[t.key] = [];
  for (const k of sl.length ? [0, Math.floor((sl.length - 1) / 2), sl.length - 1] : []) {
    const p = sl[k];
    const items: Exposure[] = p.isins.map((i) => { const b = by.get(i)!; return { pd: pdOf(b) / 100, lgd: lgdOf(b), sector: sectorOf(b), country: b.country ?? "n/a" }; });
    const r = (["independent", "moderate", "severe"] as const).map((id) => portfolioRisk(items, PRESETS[id], 200_000, 1));
    const cell = (x: (typeof r)[number]) => `${f2(x.expectedLossPct)} / ${f2(x.anyDefaultPct)} / ${f2(x.cvar95Pct)}`;
    md.push(`| ${k === 0 ? "lowest" : k === sl.length - 1 ? "highest" : "middle"} ${p.position}/${sl.length} | ${f2(p.ytm!)} | ${cell(r[0])} | ${cell(r[1])} | ${cell(r[2])} | ${r.map((x) => x.jointDefaultPairPct.toFixed(3)).join(" / ")} |`);
    json[t.key].push({ position: p.position, of: sl.length, ytm: p.ytm, isins: p.isins, risk: r });
  }
  md.push("");
}
md.push("Reading: expected loss stays about the same by construction (each bond keeps its default chance); dependence lowers the chance that anything defaults, raises the chance that several default together, and raises the tail loss (CVaR).");
fs.writeFileSync(path.join(out, "correlation.json"), JSON.stringify(json, null, 1));
fs.writeFileSync(path.join(out, "correlation.md"), md.join("\n"));
console.log(md.join("\n"));
process.exit(0);
