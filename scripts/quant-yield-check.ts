// Independent check of the feed's yields (owner brief 27/10, workstream F). For every bond with price, coupon, maturity and yield date, redo the yield
// (lib/yieldCalc.ts) under annual and semi-annual coupons and compare with the feed's gross yield. Also counts what the data says about calls and coupon type.
// Read-only. Usage: QUANT_SNAPSHOT=snapshot.json.gz QUANT_OUT=out npx vite-node -c vitest.config.ts scripts/quant-yield-check.ts
import fs from "node:fs";
import zlib from "node:zlib";
import path from "node:path";
import { yieldFromClean } from "@/lib/yieldCalc";
import type { BondSource } from "@/lib/bonds";

const src: BondSource = JSON.parse(zlib.gunzipSync(fs.readFileSync(process.env.QUANT_SNAPSHOT!)).toString());
const out = process.env.QUANT_OUT ?? "quant-out";
fs.mkdirSync(out, { recursive: true });
const q = (a: number[], p: number) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : NaN; };
const f2 = (x: number) => (Number.isFinite(x) ? x.toFixed(2) : "–");
const tally = <T extends string>(xs: T[]) => xs.reduce((m, x) => ((m[x] = (m[x] ?? 0) + 1), m), {} as Record<string, number>);

const B = src.bonds;
const callable = tally(B.map((b) => String(b.callable ?? "unknown")));
const ctype = tally(B.map((b) => String(b.couponType ?? "unknown")));
const usable = B.filter((b) => b.cleanPrice != null && b.coupon != null && b.maturity && b.ytmAsOf && b.grossYtm != null && b.couponType !== "floating");
const rows = usable.map((b) => {
  const settle = b.ytmAsOf!.slice(0, 10);
  const mk = (freq: 1 | 2) => yieldFromClean({ coupon: b.coupon!, freq, maturity: b.maturity! }, settle, b.cleanPrice!);
  const a = mk(1), s = mk(2);
  // effective annual yield of the semi-annual quote, so both are comparable with an annual-compounded feed yield
  const sEff = s === null ? null : Math.pow(1 + s / 2, 2) - 1;
  return { isin: b.isin, feed: b.grossYtm!, annual: a === null ? null : a * 100, semi: sEff === null ? null : sEff * 100, callable: b.callable ?? null, ctype: b.couponType ?? "unknown" };
});
const best = rows.filter((r) => r.annual !== null && r.semi !== null).map((r) => ({ ...r, dA: r.annual! - r.feed, dS: r.semi! - r.feed }));
const closer = (r: (typeof best)[number]) => (Math.abs(r.dA) <= Math.abs(r.dS) ? "annual" : "semi");
const md = [
  `# Yield check vs the feed (frozen data ${src.asOf}, ${B.length} bonds)`, "",
  `Bonds with price, coupon, maturity, yield date and a non-floating coupon: ${usable.length}. Recomputed with annual and with semi-annual coupons (effective annual yield), compared with the feed's gross yield, in percentage points.`, "",
  "| Measure | Annual coupons | Semi-annual coupons |", "|---|---:|---:|",
  `| Median difference (recomputed - feed) | ${f2(q(best.map((r) => r.dA), 0.5))} | ${f2(q(best.map((r) => r.dS), 0.5))} |`,
  `| Median absolute difference | ${f2(q(best.map((r) => Math.abs(r.dA)), 0.5))} | ${f2(q(best.map((r) => Math.abs(r.dS)), 0.5))} |`,
  `| 90th percentile absolute difference | ${f2(q(best.map((r) => Math.abs(r.dA)), 0.9))} | ${f2(q(best.map((r) => Math.abs(r.dS)), 0.9))} |`,
  `| Bonds within 0.05 pt | ${best.filter((r) => Math.abs(r.dA) <= 0.05).length} | ${best.filter((r) => Math.abs(r.dS) <= 0.05).length} |`,
  `| Bonds within 0.25 pt | ${best.filter((r) => Math.abs(r.dA) <= 0.25).length} | ${best.filter((r) => Math.abs(r.dS) <= 0.25).length} |`,
  `| Bonds where it is the closer of the two | ${best.filter((r) => closer(r) === "annual").length} | ${best.filter((r) => closer(r) === "semi").length} |`, "",
  `Bonds with no solution (price/coupon/dates inconsistent): ${rows.length - best.length}.`, "",
  "## Callable flag in the data", "", ...Object.entries(callable).map(([k, n]) => `- callable = ${k}: ${n}`), "", "No call dates or call prices are in the data, so yield-to-worst cannot be computed for any bond; a callable (or unknown) bond is therefore flagged 'not assessed' rather than given a yield to maturity as if it were its worst case.", "",
  "## Coupon type", "", ...Object.entries(ctype).map(([k, n]) => `- ${k}: ${n}`), "",
  "## Largest disagreements (annual coupons)", "", "| ISIN | Feed % | Recomputed % | Difference | Callable | Coupon type |", "|---|---:|---:|---:|---|---|",
  ...[...best].sort((a, b) => Math.abs(b.dA) - Math.abs(a.dA)).slice(0, 15).map((r) => `| ${r.isin} | ${f2(r.feed)} | ${f2(r.annual!)} | ${f2(r.dA)} | ${r.callable} | ${r.ctype} |`),
];
fs.writeFileSync(path.join(out, "yield-check.md"), md.join("\n"));
fs.writeFileSync(path.join(out, "yield-check.json"), JSON.stringify({ callable, ctype, n: best.length }, null, 1));
console.log(md.join("\n"));
process.exit(0);
