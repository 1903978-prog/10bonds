// 30-band MODE (owner 27/10/2026): highest-YTM list of 10 per average rating-risk band, per horizon, on one frozen snapshot. Read-only; not used by production.
// Usage: QUANT_SNAPSHOT=snapshot.json.gz QUANT_OUT=out QUANT_HORIZONS=Medium npx vite-node -c vitest.config.ts scripts/quant-30bands.ts
import fs from "node:fs";
import zlib from "node:zlib";
import { runBands } from "@/lib/bandEngine";
import { coherentFrontier } from "@/lib/coherentFrontier";
import { activePolicy } from "@/lib/coherence";
import { buildSlider } from "@/lib/sliderPortfolios";
import { bondRisk } from "@/lib/ratings";
import { LIMITS, TERMS } from "@/lib/limits";
import type { BondSource } from "@/lib/bonds";

const src: BondSource = JSON.parse(zlib.gunzipSync(fs.readFileSync(process.env.QUANT_SNAPSHOT!)).toString());
const out = process.env.QUANT_OUT ?? "quant-out";
const want = (process.env.QUANT_HORIZONS ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
fs.mkdirSync(out, { recursive: true });
const f2 = (x: number) => x.toFixed(2), f3 = (x: number) => x.toFixed(3);
const avgRisk = (rows: { ratingSp?: string | null }[]) => rows.reduce((s, r) => s + (bondRisk(r as never) ?? LIMITS.risk.max), 0) / rows.length;

const md: string[] = ["# 30-band mode: highest return per average-risk band", `data ${src.source} ${src.asOf}, ${src.bonds.length} bonds. Exact optimiser (HiGHS), live policy limits, nothing forced or invented.`, ""];
const json: any = { asOf: src.asOf, horizons: {} };
for (const t of TERMS) {
  if (want.length && !want.includes(t.key.toLowerCase())) continue;
  const { results, cert, candidates } = await runBands(src.bonds, t.duration);
  const fr = await coherentFrontier(src.bonds, t.duration, activePolicy(), LIMITS.risk.max);
  const sl = buildSlider(fr).filter((s) => s.ytm != null && s.expectedLoss != null && !s.unavailable);
  const n = (s: string) => results.filter((r) => r.status === s).length;
  md.push(`## ${t.key} (${t.duration}y), ${candidates} eligible bonds`, `Feasible ${n("feasible")}, dominated ${n("dominated")}, unavailable ${n("unavailable")} of 30. Solver ${cert.certified ? "certified optimal" : "UNCERTIFIED"}: ${cert.solves} solves, ${cert.seconds.toFixed(0)} s.`, "", "| # | Band | Avg risk | Max return % | Expected loss % | Avg duration | Status | Reason | ISINs |", "|---|---|---|---|---|---|---|---|---|");
  for (const r of results) md.push(`| ${r.k} | ${r.lo.toFixed(1)}-${r.hi.toFixed(1)} | ${r.avgRisk?.toFixed(2) ?? "–"} | ${r.ytm == null ? "–" : f2(r.ytm)} | ${r.el == null ? "–" : f3(r.el)} | ${r.avgDuration?.toFixed(2) ?? "–"} | ${r.status} | ${r.reason ?? ""}${r.ifLifted ? ` (without it: ${f2(r.ifLifted.ytm)}%)` : ""} | ${r.isins.join(" ")} |`);
  md.push("", `Existing slider (same data): ${sl.length} positions, return ${sl.length ? f2(sl[0].ytm!) + "% to " + f2(sl[sl.length - 1].ytm!) + "%" : "–"}.`, "", "| Slider pos | Return % | Expected loss % | Avg risk | Band |", "|---|---|---|---|---|");
  const lists = fr.points.map((p) => ({ ytm: p.ytm, el: p.el, risk: avgRisk(p.rows) }));
  sl.forEach((s, i) => { const l = lists.find((x) => Math.abs(x.ytm - s.ytm!) < 1e-9 && Math.abs(x.el - s.expectedLoss!) < 1e-9); const b = l && results.find((r) => l.risk >= r.lo - 1e-9 && l.risk <= r.hi + 1e-9); md.push(`| ${i + 1} | ${f2(s.ytm!)} | ${f3(s.expectedLoss!)} | ${l ? l.risk.toFixed(2) : "–"} | ${b?.k ?? "–"} |`); });
  md.push("");
  json.horizons[t.key] = { duration: t.duration, candidates, cert, results, slider: sl.map((s) => ({ ytm: s.ytm, el: s.expectedLoss })) };
}
fs.writeFileSync(`${out}/bands30.md`, md.join("\n"));
fs.writeFileSync(`${out}/bands30.json`, JSON.stringify(json, null, 1));
console.log(md.join("\n"));
