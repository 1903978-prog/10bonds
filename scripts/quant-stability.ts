// Portfolio stability under plausible alternative calibrations (paper 10.4, eq. 37): R(x) = 1 - mean over scenarios of |supp(x) symdiff supp(x*_theta)| / 20.
// For EUR Short / Medium / Long: lowest, middle and highest position of today's frontier, re-solved (exact) with all default chances scaled and loss given
// default shifted. x*_theta = the list on the re-solved frontier whose return is nearest to the base list's return. Diagnostic only, read-only.
// Usage: QUANT_SNAPSHOT=snapshot.json.gz QUANT_OUT=out npx vite-node -c vitest.config.ts scripts/quant-stability.ts
import fs from "node:fs";
import zlib from "node:zlib";
import path from "node:path";
import { coherentFrontier } from "@/lib/coherentFrontier";
import { buildSlider } from "@/lib/sliderPortfolios";
import { setPdScale } from "@/lib/expectedLoss";
import { setLgdShift } from "@/lib/seniority";
import { TERMS } from "@/lib/limits";
import type { BondSource } from "@/lib/bonds";

const src: BondSource = JSON.parse(zlib.gunzipSync(fs.readFileSync(process.env.QUANT_SNAPSHOT!)).toString());
const out = process.env.QUANT_OUT ?? "quant-out";
fs.mkdirSync(out, { recursive: true });
const THETA = [
  { name: "default chances x0.5", pd: 0.5, lgd: 0 }, { name: "default chances x0.75", pd: 0.75, lgd: 0 }, { name: "default chances x1.5", pd: 1.5, lgd: 0 }, { name: "default chances x2", pd: 2, lgd: 0 },
  { name: "loss given default +15 pt", pd: 1, lgd: 0.15 }, { name: "loss given default -10 pt", pd: 1, lgd: -0.1 }, { name: "both: chances x2 and +15 pt", pd: 2, lgd: 0.15 },
];
const f2 = (x: number) => x.toFixed(2);
const md = [`# Portfolio stability under alternative calibrations (diagnostic, frozen data ${src.asOf})`, "R = 1 - average share of the 20 slots (10+10) that change between the base list and the list re-optimised under each alternative; 1 = identical. Not a prediction statistic.", ""];
const json: any = {};
const at = async (pd: number, lgd: number, dur: number) => { setPdScale(pd); setLgdShift(lgd); try { return buildSlider(await coherentFrontier(src.bonds, dur)); } finally { setPdScale(1); setLgdShift(0); } };
for (const t of TERMS) {
  const base = await at(1, 0, t.duration);
  const alts = [];
  for (const th of THETA) alts.push({ th, sl: await at(th.pd, th.lgd, t.duration) });
  md.push(`## ${t.key} (${t.duration}y)`, "", `Base slider: ${base.length} positions.`, "", "| Position | Return % | " + THETA.map((x) => x.name).join(" | ") + " | Stability R |", "|---|---|" + THETA.map(() => "---|").join("") + "---|");
  json[t.key] = [];
  for (const k of base.length ? [0, Math.floor((base.length - 1) / 2), base.length - 1] : []) {
    const p = base[k];
    const dists = alts.map(({ sl }) => {
      if (!sl.length) return null;
      const q = sl.reduce((a, c) => (Math.abs(c.ytm! - p.ytm!) < Math.abs(a.ytm! - p.ytm!) ? c : a), sl[0]);
      const shared = p.isins.filter((i) => q.isins.includes(i)).length;
      return (20 - 2 * shared) / 20;
    });
    const valid = dists.filter((d): d is number => d !== null);
    const R = valid.length ? 1 - valid.reduce((s, d) => s + d, 0) / valid.length : null;
    md.push(`| ${k === 0 ? "lowest" : k === base.length - 1 ? "highest" : "middle"} ${p.position}/${base.length} | ${f2(p.ytm!)} | ${dists.map((d) => (d === null ? "no list" : `${(d * 100).toFixed(0)}% changed`)).join(" | ")} | ${R === null ? "–" : R.toFixed(2)} |`);
    json[t.key].push({ position: p.position, ytm: p.ytm, dists, R });
  }
  md.push("");
}
fs.writeFileSync(path.join(out, "stability.json"), JSON.stringify(json, null, 1));
fs.writeFileSync(path.join(out, "stability.md"), md.join("\n"));
console.log(md.join("\n"));
process.exit(0);
