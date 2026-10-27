// The 30 average-rating-risk bands (owner's framework, 27/10/2026) against the exact efficient frontier of one frozen bond snapshot.
// Band k covers average rating risk [1 + 0.3 (k-1), 1 + 0.3 (k-1) + 0.2] (band 1 = 1.0-1.2 ... band 30 = 9.7-10.0). Bands are TARGET ranges:
// nothing is forced, smoothed or invented. A band no efficient list falls in stays empty and is reported with the reason.
// Read-only. Usage: QUANT_SNAPSHOT=snapshot.json.gz QUANT_OUT=out npx vite-node -c vitest.config.ts scripts/quant-bands.ts
import fs from "node:fs";
import zlib from "node:zlib";
import { coherentFrontier } from "@/lib/coherentFrontier";
import { activePolicy, policySignature } from "@/lib/coherence";
import { activeEngine, engineSignature } from "@/lib/enginePolicy";
import { buildSlider } from "@/lib/sliderPortfolios";
import { bondRisk } from "@/lib/ratings";
import { LIMITS, TERMS } from "@/lib/limits";
import type { BondSource } from "@/lib/bonds";

const src: BondSource = JSON.parse(zlib.gunzipSync(fs.readFileSync(process.env.QUANT_SNAPSHOT!)).toString());
const out = process.env.QUANT_OUT ?? "quant-out";
fs.mkdirSync(out, { recursive: true });
const f2 = (x: number) => x.toFixed(2), f3 = (x: number) => x.toFixed(3);
const BANDS = Array.from({ length: 30 }, (_, i) => { const lo = Math.round((1 + 0.3 * i) * 10) / 10; return { k: i + 1, lo, hi: i === 29 ? 10 : Math.round((lo + 0.2) * 10) / 10 }; });
const avgRisk = (rows: { ratingSp?: string | null }[]) => rows.reduce((s, r) => s + (bondRisk(r as never) ?? LIMITS.risk.max), 0) / rows.length;

const md: string[] = [`# 30 rating-risk bands on the frozen snapshot`, `data ${src.source} ${src.asOf}, ${src.bonds.length} bonds. Rules: ${policySignature()} ${engineSignature() || "(legacy engine)"} ${JSON.stringify(activeEngine())}`, "Bands are target ranges only; an empty band is reported, never filled.", ""];
const result: any = { asOf: src.asOf, engine: activeEngine(), horizons: {} };
for (const t of TERMS) {
  const fr = await coherentFrontier(src.bonds, t.duration, activePolicy(), LIMITS.risk.max);
  const sl = buildSlider(fr);
  const lists = fr.points.map((p) => ({ ytm: p.ytm, el: p.el, avgRisk: avgRisk(p.rows), end: p.end ?? null, isins: p.isins }));
  const rows = BANDS.map((b) => {
    const inBand = lists.filter((l) => l.avgRisk >= b.lo - 1e-9 && l.avgRisk <= b.hi + 1e-9);
    const best = inBand.slice().sort((x, y) => x.el - y.el || y.ytm - x.ytm)[0] ?? null;
    return { ...b, lists: inBand.length, best };
  });
  const populated = rows.filter((r) => r.lists > 0);
  const gaps = lists.filter((l) => !BANDS.some((b) => l.avgRisk >= b.lo - 1e-9 && l.avgRisk <= b.hi + 1e-9)).length;
  const c = fr.cert;
  md.push(`## ${t.key} (${t.duration}y)`, `Efficient lists: ${lists.length}. Slider positions after display rounding: ${sl.length} (strictly rising return and loss). Populated bands: ${populated.length} of 30; empty: ${30 - populated.length}; lists between two bands (average risk in a 0.1 gap): ${gaps}.`, `Solver: ${c.certified ? "certified optimal" : "UNCERTIFIED"}, ${c.solves} solves (${c.optimal} optimal, ${c.infeasible} infeasible, ${c.uncertified} uncertified), ${c.seconds} s, gap ${c.absGap}.`, "", "| Band | Avg risk | Efficient lists | Lowest-loss list: return % / loss % |", "|---|---|---|---|");
  for (const r of rows) md.push(`| ${r.k} | ${r.lo.toFixed(1)}-${r.hi.toFixed(1)} | ${r.lists} | ${r.best ? `${f2(r.best.ytm)} / ${f3(r.best.el)} (avg ${r.best.avgRisk.toFixed(2)})` : "empty: no efficient list has this average risk"} |`);
  md.push("");
  result.horizons[t.key] = { duration: t.duration, efficient: lists.length, slider: sl.length, populated: populated.length, empty: rows.filter((r) => r.lists === 0).map((r) => r.k), betweenBands: gaps, cert: c, bands: rows, lists };
}
md.push("Active constraints (all horizons): 10 bonds, one per issuer group, at most 3 per sector, loss share of any bond at most 25%, at most 2 bonds at B+ or lower, each bond within +-20% and the average within +-5% of the horizon, risk ceiling 10; spread table label only, no house rating window (owner 1B 2B). The two slider ends follow their own rules. Not implemented: forcing a list into each band (an average-risk window constraint inside the optimiser).");
fs.writeFileSync(`${out}/bands.md`, md.join("\n"));
fs.writeFileSync(`${out}/bands.json`, JSON.stringify(result, null, 1));
console.log(md.join("\n"));
