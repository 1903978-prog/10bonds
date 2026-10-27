// Policy comparison on the SAME frozen bond data (snapshot saved by scripts/quant-baseline.ts): for EUR Short / Medium / Long
// the exact frontier under every combination of
//   spread:      hard_constraint (today) | diagnostic_only (paper 5.1 / 7.4)
//   composition: house_window (today)    | ceiling_only (no rating window / core / worst-class rule)
// reporting how many bonds the spread rule really leaves usable, feasible-list reach, max yield, min loss, endpoints,
// efficient lists, how much loss the hard rule costs at each return, and solver time. Read-only, nothing is saved.
// Usage: QUANT_SNAPSHOT=snapshot.json.gz QUANT_OUT=out npx vite-node -c vitest.config.ts scripts/quant-compare-policies.ts
import fs from "node:fs";
import zlib from "node:zlib";
import path from "node:path";
import { candidatesOf, coherentFrontier } from "@/lib/coherentFrontier";
import { activePolicy, policySignature } from "@/lib/coherence";
import { buildSlider } from "@/lib/sliderPortfolios";
import { spreadVerdicts } from "@/lib/spreadDiagnostic";
import { setEngine, LEGACY_ENGINE, type EnginePolicy } from "@/lib/enginePolicy";
import { TERMS } from "@/lib/limits";
import type { BondSource } from "@/lib/bonds";

const src: BondSource = JSON.parse(zlib.gunzipSync(fs.readFileSync(process.env.QUANT_SNAPSHOT!)).toString());
const out = process.env.QUANT_OUT ?? "quant-out";
fs.mkdirSync(out, { recursive: true });
const f2 = (x: number) => x.toFixed(2), f3 = (x: number) => x.toFixed(3);
const CONFIGS: { name: string; e: EnginePolicy }[] = [
  { name: "A legacy (until 27/10): hard spread + house window", e: { spread: "hard_constraint", composition: "house_window", loss: "v1_linear" } },
  { name: "B paper: diagnostic spread + house window", e: { spread: "diagnostic_only", composition: "house_window", loss: "v1_linear" } },
  { name: "C hard spread + ceiling only", e: { spread: "hard_constraint", composition: "ceiling_only", loss: "v1_linear" } },
  { name: "D = new default since 27/10 (Livio 1B 2B): paper spread + ceiling only", e: { spread: "diagnostic_only", composition: "ceiling_only", loss: "v1_linear" } },
  { name: "E = A with loss model v2 (hazard interpolation)", e: { spread: "hard_constraint", composition: "house_window", loss: "v2_hazard" } },
  { name: "F = B with loss model v2 (hazard interpolation)", e: { spread: "diagnostic_only", composition: "house_window", loss: "v2_hazard" } },
];
const md: string[] = [`# Policy comparison on one frozen snapshot`, `data ${src.source} ${src.asOf}, ${src.bonds.length} bonds, rules ${policySignature()}\n`];
const result: any = { asOf: src.asOf, bonds: src.bonds.length, horizons: {} };
for (const t of TERMS) {
  setEngine(LEGACY_ENGINE);
  const cands = candidatesOf(src.bonds, t.duration, true);
  const sizes = cands.map((c) => c.beatenBy.size);
  const verdicts = spreadVerdicts(cands.map((c) => c.b), cands.map((c) => c.b));
  const count = (s: string) => [...verdicts.values()].filter((v) => v.status === s).length;
  const pool = { candidates: cands.length, notBeaten: sizes.filter((n) => n === 0).length, beatenBy1to9: sizes.filter((n) => n >= 1 && n <= 9).length, beatenBy10plus_unusable: sizes.filter((n) => n >= 10).length, adequate: count("adequate"), belowHurdle: count("below_hurdle"), insufficient: count("insufficient_data") };
  md.push(`## ${t.key} (${t.duration}y)`, `Pool ${pool.candidates} bonds in the duration window. Spread diagnostic: ${pool.adequate} adequately compensated, ${pool.belowHurdle} below hurdle, ${pool.insufficient} insufficient data. Under the hard rule ${pool.notBeaten} are never beaten, ${pool.beatenBy1to9} can be chosen only together with 1-9 other issuer groups, ${pool.beatenBy10plus_unusable} can never be chosen (beaten by 10+ groups).`, "", "| Config | efficient lists | slider positions | return range % | loss range % | worst class at top | seconds | status |", "|---|---|---|---|---|---|---|---|");
  const frs: any[] = [];
  for (const c of CONFIGS) {
    setEngine(c.e);
    const fr = await coherentFrontier(src.bonds, t.duration, activePolicy(), 10, { engine: c.e });
    const sl = buildSlider(fr);
    const lo = fr.points[0], hi = fr.points.at(-1);
    frs.push({ c, fr, sl });
    md.push(`| ${c.name} | ${fr.points.length} | ${sl.length} | ${lo ? f2(lo.ytm) : "-"} to ${hi ? f2(hi.ytm) : "-"} | ${lo ? f3(lo.el) : "-"} to ${hi ? f3(hi.el) : "-"} | ${sl.at(-1)?.worstRisk ?? "-"} | ${fr.cert.seconds} | ${fr.cert.certified ? "certified" : "UNCERTIFIED"} |`);
  }
  // What the hard spread rule costs: at each return of A, the least loss reachable in B (and D vs C), and the highest return at A's loss.
  const gap = (a: any, b: any) => {
    const rows = a.fr.points.map((p: any) => { const q = b.fr.points.find((x: any) => x.ytm >= p.ytm - 1e-9); return q ? { ytm: p.ytm, elA: p.el, elB: q.el, saved: p.el - q.el } : null; }).filter(Boolean) as { ytm: number; elA: number; elB: number; saved: number }[];
    const better = rows.filter((r) => r.saved > 1e-6);
    const best = better.sort((x, y) => y.saved - x.saved)[0];
    const yieldAtSameLoss = a.fr.points.map((p: any) => { const q = [...b.fr.points].reverse().find((x: any) => x.el <= p.el + 1e-9); return q ? q.ytm - p.ytm : 0; });
    return { pointsOfA: a.fr.points.length, pointsWhereOtherIsBetter: better.length, largestLossSavedPct: best ? Math.round(best.saved * 1000) / 1000 : 0, atReturn: best?.ytm ?? null, largestExtraYieldAtSameLossPct: Math.round(Math.max(0, ...yieldAtSameLoss) * 100) / 100 };
  };
  const costHard = gap(frs[0], frs[1]), costHard2 = gap(frs[2], frs[3]), costHouse = gap(frs[0], frs[2]);
  md.push("", `Cost of the hard spread rule (A vs B): at ${costHard.pointsWhereOtherIsBetter} of ${costHard.pointsOfA} points the paper rule reaches a lower loss for the same return (largest saving ${costHard.largestLossSavedPct} pt of loss at return ${costHard.atReturn?.toFixed?.(2) ?? "-"}%); at the same loss it reaches up to +${costHard.largestExtraYieldAtSameLossPct} pt return. Without the house rating rules (C vs D): ${costHard2.pointsWhereOtherIsBetter}/${costHard2.pointsOfA}, up to +${costHard2.largestExtraYieldAtSameLossPct} pt return.`, `Cost of the house rating window (A vs C): ${costHouse.pointsWhereOtherIsBetter}/${costHouse.pointsOfA} points better without it, up to +${costHouse.largestExtraYieldAtSameLossPct} pt return at the same loss.`, "");
  md.push(`Effect of the loss model v2 alone (A vs E): compare rows A and E (same rules, other default model). v2 only changes how default chance is read between and beyond the table's years (bonds under 1 year and over 15 years move most).`, "");
  const nameOf = (s: any) => s.sl.length ? [0, Math.floor((s.sl.length - 1) / 2), s.sl.length - 1].map((k) => { const p = s.sl[k]; return `pos ${p.position}: ${f2(p.ytm!)}% / loss ${f3(p.expectedLoss!)}%`; }).join("; ") : "none";
  for (const s of frs) md.push(`- ${s.c.name}: ${nameOf(s)}`);
  md.push("");
  result.horizons[t.key] = { pool, configs: frs.map((s) => ({ name: s.c.name, engine: s.c.e, cert: s.fr.cert, efficient: s.fr.points.length, slider: s.sl.map((p: any) => ({ position: p.position, ytm: p.ytm, el: p.expectedLoss, worstRisk: p.worstRisk, isins: p.isins })) })), cost: { hardSpread: costHard, hardSpreadNoWindow: costHard2, houseWindow: costHouse } };
}
fs.writeFileSync(path.join(out, "compare.json"), JSON.stringify(result, null, 1));
fs.writeFileSync(path.join(out, "compare.md"), md.join("\n"));
console.log(md.join("\n"));
process.exit(0);
