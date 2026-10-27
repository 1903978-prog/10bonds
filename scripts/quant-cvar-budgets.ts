// CVaR budget decision study (owner brief 27/10, workstream E). EXPERIMENTAL and read-only: the CVaR constraint is OFF in production and the
// factor model is NOT calibrated (presets are illustrative stress settings). For each horizon the free coherent frontier (today's rules) is compared
// with the frontier solved under a range of tail-loss budgets C (CVaR95, % of the money, to maturity, undiscounted).
// Budgets are fractions of the largest CVaR any list on today's free frontier has under the same scenarios.
// Usage: QUANT_SNAPSHOT=snapshot.json.gz QUANT_OUT=out [QUANT_PRESET=severe] [QUANT_SCEN=300] npx vite-node -c vitest.config.ts scripts/quant-cvar-budgets.ts
import fs from "node:fs";
import zlib from "node:zlib";
import path from "node:path";
import { candidatesOf, coherentFrontier, cvarContext, listCvar, type CvarSetting } from "@/lib/coherentFrontier";
import { TERMS } from "@/lib/limits";
import type { BondSource } from "@/lib/bonds";
import type { FactorPreset } from "@/lib/correlatedLoss";

const src: BondSource = JSON.parse(zlib.gunzipSync(fs.readFileSync(process.env.QUANT_SNAPSHOT!)).toString());
const out = process.env.QUANT_OUT ?? "quant-out";
fs.mkdirSync(out, { recursive: true });
const preset = (process.env.QUANT_PRESET ?? "severe") as FactorPreset["id"];
const scenarios = Number(process.env.QUANT_SCEN ?? 300);
const FRACTIONS = [1.0, 0.9, 0.8, 0.7, 0.6, 0.5];
const f2 = (x: number) => x.toFixed(2);
const md = [
  `# CVaR budget study (EXPERIMENTAL, uncalibrated "${preset}" factor preset, ${scenarios} optimiser scenarios)`,
  `Frozen data ${src.asOf}, ${src.bonds.length} bonds. Budgets are labelled experimental. CVaR95 in % of the money to maturity (undiscounted). "Free" = today's live rules, no tail limit. Ends of the slider excluded from the ranges below (they follow their own rules).`, "",
];
const json: any = {};
for (const t of TERMS) {
  const free = await coherentFrontier(src.bonds, t.duration);
  const setting = (C: number): CvarSetting => ({ C, scenarios, seed: 11, preset, validationScenarios: 100_000 });
  const cands = candidatesOf(src.bonds, t.duration, false);
  const ctx = cvarContext(cands, setting(1e6));
  const ci = new Map(cands.map((c) => [c.b.isin, c.ci]));
  const tail = (isins: string[]) => listCvar(ctx, new Set(isins.map((i) => ci.get(i)!)));
  const mid = free.points.filter((p) => !p.end);
  const freeTails = mid.map((p) => tail(p.isins));
  const maxFree = Math.max(...freeTails), minFree = Math.min(...freeTails);
  const best = mid.reduce((a, p) => (p.ytm > a.ytm ? p : a), mid[0]);
  const lowEl = Math.min(...mid.map((p) => p.el));
  md.push(`## ${t.key} (${t.duration}y)`, "", `Free frontier: ${mid.length} lists, return ${f2(Math.min(...mid.map((p) => p.ytm)))}-${f2(best.ytm)}%, lowest expected loss ${f2(lowEl)}%, CVaR95 ${f2(minFree)}-${f2(maxFree)}%.`, "",
    "| Budget C (% of money) | Fraction of free max | Lists | Highest return % | Lowest expected loss % | Max CVaR (optimiser sample) | Max CVaR (independent sample) | Best-return list: bonds shared with free | Certified | Seconds |", "|---|---|---|---|---|---|---|---|---|---|");
  json[t.key] = { free: { lists: mid.length, maxYtm: best.ytm, minEl: lowEl, minTail: minFree, maxTail: maxFree }, budgets: [] };
  for (const fr of FRACTIONS) {
    const C = Math.round(maxFree * fr * 1000) / 1000 + 1e-3;
    const t0 = Date.now();
    try {
      const r = await coherentFrontier(src.bonds, t.duration, undefined, undefined, { cvar: setting(C) });
      const m = r.points.filter((p) => !p.end);
      if (!m.length) { md.push(`| ${f2(C)} | ${fr} | 0 (no feasible list) | – | – | – | – | – | ${r.cert.certified} | ${((Date.now() - t0) / 1000).toFixed(0)} |`); json[t.key].budgets.push({ C, fraction: fr, lists: 0 }); continue; }
      const b = m.reduce((a, p) => (p.ytm > a.ytm ? p : a), m[0]);
      const shared = b.isins.filter((i) => best.isins.includes(i)).length;
      const row = { C, fraction: fr, lists: m.length, maxYtm: b.ytm, minEl: Math.min(...m.map((p) => p.el)), maxTrain: Math.max(...m.map((p) => p.cvar!.training)), maxValid: Math.max(...m.map((p) => p.cvar!.validation)), shared, certified: r.cert.certified, seconds: (Date.now() - t0) / 1000 };
      json[t.key].budgets.push(row);
      md.push(`| ${f2(C)} | ${fr} | ${row.lists} | ${f2(row.maxYtm)} | ${f2(row.minEl)} | ${f2(row.maxTrain)} | ${f2(row.maxValid)} | ${shared}/10 | ${row.certified} | ${row.seconds.toFixed(0)} |`);
    } catch (e) {
      md.push(`| ${f2(C)} | ${fr} | error: ${(e as Error).message.slice(0, 80)} | | | | | | | |`);
      json[t.key].budgets.push({ C, fraction: fr, error: String(e) });
    }
  }
  md.push("");
}
md.push("Reading: a tighter budget can only shrink the set of lists, lower the highest reachable return, and change the chosen bonds. The independent-sample column checks that the limit also holds on scenarios the optimiser never saw (a gap there means the optimiser fitted its own sample). No budget is recommended here: the presets are illustrative, so any figure is a relative comparison, not a risk statement.");
fs.writeFileSync(path.join(out, "cvar-budgets.json"), JSON.stringify(json, null, 1));
fs.writeFileSync(path.join(out, "cvar-budgets.md"), md.join("\n"));
console.log(md.join("\n"));
process.exit(0);
