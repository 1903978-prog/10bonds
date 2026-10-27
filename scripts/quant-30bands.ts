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
  const { results, cert, certEndpoints, candidates } = await runBands(src.bonds, t.duration);
  const fr = await coherentFrontier(src.bonds, t.duration, activePolicy(), LIMITS.risk.max);
  const sl = buildSlider(fr).filter((s) => s.ytm != null && s.expectedLoss != null && !s.unavailable);
  const n = (s: string) => results.filter((r) => r.status === s).length;
  md.push(`## ${t.key} (${t.duration}y), ${candidates} eligible bonds`, `Feasible ${n("feasible")}, dominated ${n("dominated")}, unavailable ${n("unavailable")} of 30. Solver, regular rules (bands 2-29): ${cert.certified ? "certified optimal" : "UNCERTIFIED"}, ${cert.solves} solves, ${cert.seconds.toFixed(0)} s. Endpoint rules (bands 1 and 30, no loss-share, sector or weak-bond caps): ${certEndpoints.certified ? "certified optimal" : "UNCERTIFIED"}, ${certEndpoints.solves} solves. Each is certified only against its own feasible set; the two are not combined into one certified frontier.`, "", "| # | Band | Avg risk | Max return % | Expected loss % | Avg duration | Optimisation | Pareto | Rules | Reason | ISINs |", "|---|---|---|---|---|---|---|---|---|---|---|");
  for (const r of results) md.push(`| ${r.k} | ${r.lo.toFixed(1)}-${r.hi.toFixed(1)} | ${r.avgRisk?.toFixed(2) ?? "–"} | ${r.ytm == null ? "–" : f2(r.ytm)} | ${r.el == null ? "–" : f3(r.el)} | ${r.avgDuration?.toFixed(2) ?? "–"} | ${r.status === "unavailable" ? "infeasible" : cert.certified ? "optimal" : "uncertified"} | ${r.status === "feasible" ? "non-dominated" : r.status} | ${r.policy}${r.regular !== undefined ? (r.regular ? ` (regular rules: ${f2(r.regular.ytm)}%)` : " (infeasible under regular rules)") : ""} | ${r.reason ?? ""}${r.ifLifted ? ` (without it: ${f2(r.ifLifted.ytm)}%)` : ""} | ${r.isins.join(" ")} |`);
  const kept = results.filter((r) => r.status === "feasible");
  const rising = kept.every((r, i) => i === 0 || (r.ytm! > kept[i - 1].ytm! && r.el! > kept[i - 1].el!));
  const maxDurErr = Math.max(0, ...kept.map((r) => Math.abs(r.avgDuration! - t.duration) / t.duration));
  md.push("", `Summary ${t.key}: feasible bands ${n("feasible") + n("dominated")}; surviving Pareto ${kept.length}; yield and expected loss both strictly rise across the final list: ${rising ? "yes" : "NO"}; max average-duration deviation ${(maxDurErr * 100).toFixed(2)}% (limit 5%); endpoints: ${results.filter((r) => r.policy === "endpoint" && r.regular !== undefined).map((r) => `band ${r.k} ${r.status}${r.regular ? `, regular rules give ${f2(r.regular.ytm)}% vs ${r.ytm == null ? "–" : f2(r.ytm)}%` : ", infeasible under regular rules"}`).join("; ")}.`);
  md.push("", `Existing slider (same data): ${sl.length} positions, return ${sl.length ? f2(sl[0].ytm!) + "% to " + f2(sl[sl.length - 1].ytm!) + "%" : "–"}.`, "", "| Slider pos | Return % | Expected loss % | Avg risk | Band |", "|---|---|---|---|---|");
  const lists = fr.points.map((p) => ({ ytm: p.ytm, el: p.el, risk: avgRisk(p.rows) }));
  sl.forEach((s, i) => {
    const l = lists.reduce((a, x) => (Math.abs(x.ytm - s.ytm!) + Math.abs(x.el - s.expectedLoss!) < Math.abs(a.ytm - s.ytm!) + Math.abs(a.el - s.expectedLoss!) ? x : a), lists[0]);
    const b = l && results.find((r) => l.risk >= r.lo - 1e-9 && l.risk <= r.hi + 1e-9);
    md.push(`| ${i + 1} | ${f2(s.ytm!)} | ${f3(s.expectedLoss!)} | ${l ? l.risk.toFixed(2) : "–"} | ${b ? `${b.k} (${b.status})` : "–"} |`);
  });
  md.push("");
  json.horizons[t.key] = { duration: t.duration, candidates, cert, certEndpoints, results, slider: sl.map((s) => ({ ytm: s.ytm, el: s.expectedLoss })) };
}
fs.writeFileSync(`${out}/bands30.md`, md.join("\n"));
fs.writeFileSync(`${out}/bands30.json`, JSON.stringify(json, null, 1));
console.log(md.join("\n"));
