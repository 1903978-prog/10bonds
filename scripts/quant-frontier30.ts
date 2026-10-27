// REVISED 30-band method (owner 27/10/2026): band-guided discovery of several trade-off lists per band, pooled, tested against the whole feasible set, up to 30 slider positions,
// every displayed list re-verified from raw bond rows; compared with the live slider and the first 30-band experiment. Read-only; not used by production.
// Usage: QUANT_SNAPSHOT=snapshot.json.gz QUANT_OUT=out QUANT_HORIZONS=mid npx vite-node -c vitest.config.ts scripts/quant-frontier30.ts
import fs from "node:fs";
import zlib from "node:zlib";
import { buildFrontier, dominates, pickPositions, verifyList, type Pt } from "@/lib/bandFrontier";
import { runBands } from "@/lib/bandEngine";
import { coherentFrontier } from "@/lib/coherentFrontier";
import { activePolicy } from "@/lib/coherence";
import { buildSlider } from "@/lib/sliderPortfolios";
import { LIMITS, TERMS } from "@/lib/limits";
import { BANDS } from "@/lib/bandEngine";
import type { BondSource } from "@/lib/bonds";

const src: BondSource = JSON.parse(zlib.gunzipSync(fs.readFileSync(process.env.QUANT_SNAPSHOT!)).toString());
const out = process.env.QUANT_OUT ?? "quant-out";
const want = (process.env.QUANT_HORIZONS ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
fs.mkdirSync(out, { recursive: true });
const f2 = (x: number) => x.toFixed(2), f3 = (x: number) => x.toFixed(3), f4 = (x: number) => x.toFixed(4), f6 = (x: number) => x.toFixed(6);
const bandOf = (risk: number) => BANDS.find((b) => risk >= b.lo - 1e-9 && risk <= b.hi + 1e-9)?.k ?? null;
const P = activePolicy();

const md: string[] = ["# Revised 30-band method: efficient frontier built from band-guided discovery", `data ${src.source} ${src.asOf}, ${src.bonds.length} bonds. Exact optimiser (HiGHS), live policy limits, no new data or models. Return and expected loss shown to 4 decimals (%).`, ""];
const json: any = { asOf: src.asOf, horizons: {} };
for (const t of TERMS) {
  if (want.length && !want.includes(t.key.toLowerCase())) continue;
  const f = await buildFrontier(src.bonds, t.duration);
  const regular = f.efficient.filter((p) => p.src !== "low end" && p.src !== "high end");
  const shown = pickPositions(f.efficient, 30);
  const rows = shown.map((p) => {
    const isEnd = p.src === "low end" || p.src === "high end";
    const v = verifyList(p.sel.map((c) => c.b.isin), src.bonds, t.duration, P, isEnd);
    return { p, v, isEnd, band: bandOf(v.avgRisk) };
  });
  const bad = rows.filter((r) => !r.v.ok);
  const filledAll = new Set(f.efficient.map((p) => bandOf(p.sel.reduce((s, c) => s + c.cls, 0) / 10)).filter((x) => x !== null));
  const filledShown = new Set(rows.map((r) => r.band).filter((x) => x !== null));
  // Comparison 1: live slider (same data, same risk model).
  const fr = await coherentFrontier(src.bonds, t.duration, P, LIMITS.risk.max);
  const live = buildSlider(fr).filter((s) => s.ytm != null && s.expectedLoss != null && !s.unavailable);
  const asPt = (ret: number, el: number) => ({ ret, loss: el });
  const effEl = f.efficient.map((p) => ({ ret: p.ret, loss: p.el, p }));
  const liveRows = live.map((s, i) => {
    const d = effEl.find((q) => dominates(q, asPt(s.ytm!, s.expectedLoss!)));
    return { pos: i + 1, ret: s.ytm!, el: s.expectedLoss!, dominatedBy: d ? { ret: d.ret, el: d.loss } : null };
  });
  // Comparison 2: first 30-band experiment.
  const first = await runBands(src.bonds, t.duration);
  const firstRows = first.results.filter((r) => r.status !== "unavailable").map((r) => {
    const d = effEl.find((q) => dominates(q, asPt(r.ytm!, r.el!)));
    const on = f.efficient.some((p) => [...p.sel.map((c) => c.b.isin)].sort().join(",") === r.isins.slice().sort().join(","));
    return { k: r.k, ret: r.ytm!, el: r.el!, avgRisk: r.avgRisk!, on, dominatedBy: d ? { ret: d.ret, el: d.loss } : null };
  });
  const els = f.efficient.map((p) => p.el), rets = f.efficient.map((p) => p.ret);
  md.push(`## ${t.key} (${t.duration}y)`, "",
    "| Item | Value |", "|---|---|",
    `| Eligible bonds | ${f.candidates} |`,
    `| Lists produced by the 30 band searches | ${f.pooled} (after removing dominated ones: ${f.afterBandFilter}) |`,
    `| Efficient lists missed by the band searches and found by whole-set probes | ${f.addedByGlobalTest} |`,
    `| Whole-set certification complete | ${f.complete ? "yes: every gap between neighbouring efficient lists probed and empty" : "NO: solve budget reached"} (resolution ${f.resolution}% return) |`,
    `| Genuinely efficient lists, regular rules | ${regular.length} |`,
    `| Efficient lists in the final curve (incl. approved ends) | ${f.efficient.length} |`,
    `| Regular-rule lists removed because an approved end list dominates them | ${f.removedByEnds} |`,
    `| Slider positions displayed (max 30) | ${shown.length} |`,
    `| Return range | ${f4(Math.min(...rets))}% to ${f4(Math.max(...rets))}% |`,
    `| Expected-loss range | ${f4(Math.min(...els))}% to ${f4(Math.max(...els))}% |`,
    `| Risk bands containing an efficient list / a displayed list | ${filledAll.size} of 30 / ${filledShown.size} of 30 |`,
    `| Solves, runtime | ${f.cert.solves} solves (${f.cert.optimal} optimal, ${f.cert.infeasible} infeasible, ${f.cert.uncertified} uncertified), ${f.seconds.toFixed(0)} s |`,
    `| Displayed lists independently re-verified (10 ISINs, rules, +-5% average and +-20% bond duration, return, expected loss recomputed from raw bond rows) | ${rows.length - bad.length} of ${rows.length} pass${bad.length ? ": FAILURES " + bad.map((b) => b.p.key.slice(0, 20) + " " + b.v.problems.join("; ")).join(" | ") : ""} |`,
    `| Live slider (same data) | ${live.length} positions, ${live.length ? f4(live[0].ytm!) + "% to " + f4(live[live.length - 1].ytm!) + "%" : "–"} |`,
    `| First experiment (best list per band) | ${first.results.filter((r) => r.status === "feasible").length} survive its own filter, ${first.results.filter((r) => r.status !== "unavailable").length} bands feasible |`,
    "");
  md.push("**Approved ends (their own feasible set: no sector, weak-bond or loss-share caps):**",
    f.ends.low ? `- Low-risk end: ${f.ends.low.sel.filter((c) => c.cls === 1).length} of 10 bonds are class 1 (AAA); the rest come from the next classes only as far as needed. Return ${f4(f.ends.low.ret)}%, expected loss ${f4(f.ends.low.el)}%, average risk class ${f2(f.ends.low.sel.reduce((s, c) => s + c.cls, 0) / 10)}. ${f.endsDominatedByRegular.low ? "A regular-rule list dominates it (shown for disclosure; the approved end is kept)." : "No regular-rule list dominates it."}` : "- Low-risk end: not available.",
    f.ends.high ? `- High-return end: return ${f4(f.ends.high.ret)}%, expected loss ${f4(f.ends.high.el)}%, average risk class ${f2(f.ends.high.sel.reduce((s, c) => s + c.cls, 0) / 10)}. ${f.endsDominatedByRegular.high ? "A regular-rule list dominates it (shown for disclosure; the approved end is kept)." : "No regular-rule list dominates it."}` : "- High-return end: not available.",
    "- Certification applies to the regular-rule lists only. The combined curve mixes feasible sets and is NOT presented as globally Pareto-certified.", "");
  md.push("### Displayed slider positions", "", "| # | Avg risk | Band | Return % | Expected loss % | Avg duration | Class-1 bonds | Type | Verified | ISINs |", "|---|---|---|---|---|---|---|---|---|---|");
  rows.forEach((r, i) => md.push(`| ${i + 1} | ${f2(r.v.avgRisk)} | ${r.band ?? "–"} | ${f4(r.p.ret)} | ${f4(r.p.el)} | ${f3(r.v.dur)} | ${r.v.class1} | ${r.p.src === "low end" ? "low-risk end" : r.p.src === "high end" ? "high-return end" : "regular"} | ${r.v.ok ? "yes" : "NO"} | ${r.p.sel.map((c) => c.b.isin).sort().join(" ")} |`));
  md.push("", "### Live slider against the new curve (unrounded comparison)", "", "| Live pos | Return % | Expected loss % | Dominated by a new efficient list? |", "|---|---|---|---|");
  for (const l of liveRows) md.push(`| ${l.pos} | ${f4(l.ret)} | ${f4(l.el)} | ${l.dominatedBy ? `yes: ${f4(l.dominatedBy.ret)}% / ${f4(l.dominatedBy.el)}%` : "no"} |`);
  md.push("", "### First 30-band experiment against the new curve (unrounded)", "", "| Band | Avg risk | Return % | Expected loss % | On the new curve? | Dominated by |", "|---|---|---|---|---|---|");
  for (const r of firstRows) md.push(`| ${r.k} | ${f2(r.avgRisk)} | ${f6(r.ret)} | ${f6(r.el)} | ${r.on ? "yes" : "no"} | ${r.dominatedBy ? `${f6(r.dominatedBy.ret)}% / ${f6(r.dominatedBy.el)}%` : "–"} |`);
  md.push("");
  json.horizons[t.key] = { duration: t.duration, candidates: f.candidates, perBand: f.perBand, pooled: f.pooled, afterBandFilter: f.afterBandFilter, added: f.addedByGlobalTest, complete: f.complete, cert: f.cert, efficient: f.efficient.map((p) => ({ ret: p.ret, el: p.el, loss: p.loss, src: p.src, isins: p.sel.map((c) => c.b.isin).sort() })), shown: rows.map((r) => ({ ret: r.p.ret, el: r.p.el, verified: r.v })), liveRows, firstRows };
}
fs.writeFileSync(`${out}/frontier30.md`, md.join("\n"));
fs.writeFileSync(`${out}/frontier30.json`, JSON.stringify(json, null, 1));
console.log(md.join("\n"));
