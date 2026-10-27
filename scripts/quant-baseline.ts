// Frozen baseline of the portfolio engine (read-only, changes nothing): the bond data actually used, the active policy,
// solver settings and tables, and for EUR Short / Medium / Long the lowest, middle and highest slider position with every
// figure needed for a later before/after comparison on the SAME data.
// Live mode (default): reads the database, saves the bond universe to QUANT_OUT/snapshot.json.gz and the baseline to
// QUANT_OUT/baseline.json. Snapshot mode (QUANT_SNAPSHOT=<snapshot.json.gz>): same output from a saved universe, offline.
// Usage: QUANT_OUT=out npx vite-node -c vitest.config.ts scripts/quant-baseline.ts
import fs from "node:fs";
import zlib from "node:zlib";
import crypto from "node:crypto";
import path from "node:path";
import { execSync } from "node:child_process";
import { loadBondsFor, type BondSource } from "@/lib/bonds";
import { coherentFrontier } from "@/lib/coherentFrontier";
import { activePolicy, checkList, factsOf, policySignature } from "@/lib/coherence";
import { buildSlider } from "@/lib/sliderPortfolios";
import { liveRiskConfig } from "@/lib/riskPremium/store";
import { spreadMatrix, stepSignature } from "@/lib/stepGap";
import { DEFAULT_RATES, DEFAULT_YEARS } from "@/lib/seo/defaultRates";
import { LGD_BY_RANK } from "@/lib/seniority";
import { GROUP_TABLE_VERSION, groupInfo } from "@/lib/issuerGroups";
import { SECTOR_TAXONOMY_VERSION } from "@/lib/sectors";
import { SOLVER_OPTIONS, MIP_ABS_GAP } from "@/lib/highsSolver";
import { signatureOf } from "@/lib/bestTable";
import { TERMS, LIMITS } from "@/lib/limits";
import { bondNotch, bondRisk, spGradeOf } from "@/lib/ratings";
import { lgdOf } from "@/lib/seniority";
import { lossPdOf, pdOf } from "@/lib/tiers";
import { lifeYears } from "@/lib/lifeYears";

const out = process.env.QUANT_OUT ?? "quant-out";
fs.mkdirSync(out, { recursive: true });
const sha = (x: unknown) => crypto.createHash("sha256").update(JSON.stringify(x)).digest("hex").slice(0, 16);

let src: BondSource;
let mode: "live" | "snapshot";
if (process.env.QUANT_SNAPSHOT) {
  mode = "snapshot";
  src = JSON.parse(zlib.gunzipSync(fs.readFileSync(process.env.QUANT_SNAPSHOT)).toString());
} else {
  mode = "live";
  await liveRiskConfig();
  src = await loadBondsFor({ currency: "EUR", size: "100k" });
  fs.writeFileSync(path.join(out, "snapshot.json.gz"), zlib.gzipSync(JSON.stringify(src)));
}
const git = (c: string) => { try { return execSync(c, { encoding: "utf8" }).trim(); } catch { return null; } };

const manifest = {
  kind: mode === "live" ? "live data" : "fixture (saved snapshot, not live)",
  createdAt: new Date().toISOString(),
  commit: process.env.GITHUB_SHA ?? git("git rev-parse HEAD"),
  node: process.version,
  data: { signature: signatureOf(src), source: src.source, asOf: src.asOf, bonds: src.bonds.length, hash: sha(src.bonds.map((b) => [b.isin, b.grossYtm, b.modifiedDuration, b.maturity])) },
  policy: { signature: policySignature(), coherence: activePolicy(), spreadMatrix: spreadMatrix(), spreadSignature: stepSignature(), spreadMode: "hard_constraint (inside the optimiser, all customers)", riskCeiling: LIMITS.risk.max },
  solver: { name: "HiGHS", version: JSON.parse(fs.readFileSync("package.json", "utf8")).dependencies.highs, options: SOLVER_OPTIONS, absGapTolerance: MIP_ABS_GAP },
  tables: {
    defaultRatesHash: sha(DEFAULT_RATES), defaultYears: DEFAULT_YEARS, lgdByRank: LGD_BY_RANK,
    issuerGroupsVersion: GROUP_TABLE_VERSION, sectorTaxonomyVersion: SECTOR_TAXONOMY_VERSION,
    ratingMap: "worst of S&P/Moody's/Fitch by lib/ratings.ts, notch AAA=0, risk class 1..10",
  },
  objective: "minimise sum of lossPdOf = PD(cumulative to maturity) x LGD(rank) / 0.6 over the ten bonds; reported expected loss = mean(PD x LGD) (equal weights, undiscounted)",
};

const result: any = { manifest, horizons: {} };
const md: string[] = [`# Baseline (${manifest.kind})`, `commit ${manifest.commit}, data ${manifest.data.signature}, rules ${manifest.policy.signature}`, ""];
for (const t of TERMS) {
  const t0 = Date.now();
  const fr = await coherentFrontier(src.bonds, t.duration);
  const secs = Math.round((Date.now() - t0) / 100) / 10;
  const slider = buildSlider(fr);
  const byIsin = new Map(fr.points.flatMap((p) => p.rows.map((r) => [r.isin, r] as const)));
  const pick = slider.length ? [0, Math.floor((slider.length - 1) / 2), slider.length - 1] : [];
  const lists = pick.map((k, j) => {
    const s = slider[k];
    const bonds = s.isins.map((i) => byIsin.get(i)!);
    const facts = bonds.map(factsOf);
    const checks = checkList(facts, activePolicy(), LIMITS.risk.max);
    return {
      label: ["lowest", "middle", "highest"][j], position: s.position, of: slider.length,
      returnPct: s.ytm, expectedLossPct: s.expectedLoss,
      avgDuration: Math.round((bonds.reduce((a, b) => a + b.modifiedDuration!, 0) / 10) * 1000) / 1000,
      worstClass: Math.max(...facts.map((f) => f.cls)), weakCount: facts.filter((f) => f.weak).length, issuerGroups: new Set(facts.map((f) => f.group)).size,
      objectiveSumLossPd: Math.round(facts.reduce((a, f) => a + f.pd, 0) * 1e6) / 1e6,
      activeConstraints: checks.map((c) => ({ rule: c.rule, ok: c.ok, detail: c.detail })),
      bonds: bonds.map((b) => ({ isin: b.isin, issuer: b.issuer, group: groupInfo(b).group, rating: spGradeOf(bondNotch(b)), riskClass: bondRisk(b), yieldPct: b.grossYtm, duration: b.modifiedDuration, yearsToMaturity: Math.round(lifeYears(b) * 100) / 100, pdPct: pdOf(b), lgd: lgdOf(b), lossPd: lossPdOf(b) })),
    };
  });
  result.horizons[t.key] = { years: t.duration, poolBonds: fr.size, efficientLists: fr.points.length, sliderPositions: slider.length, solver: { ...fr.cert, wallSeconds: secs, status: fr.cert.certified ? "all solves Optimal or Infeasible (certified)" : "has uncertified solves" }, endpoints: { lowest: lists[0], highest: lists[2] }, lists, slider: slider.map((s) => ({ position: s.position, ytm: s.ytm, el: s.expectedLoss, worstRisk: s.worstRisk, isins: s.isins })) };
  md.push(`## ${t.key} (${t.duration}y): pool ${fr.size} bonds, ${fr.points.length} efficient lists, ${slider.length} slider positions, ${secs}s, ${fr.cert.certified ? "certified" : "UNCERTIFIED"}`);
  for (const l of lists) md.push(`- ${l.label} (pos ${l.position}/${l.of}): return ${l.returnPct}%, expected loss ${l.expectedLossPct}%, worst class ${l.worstClass}, weak ${l.weakCount}, groups ${l.issuerGroups}`);
}
fs.writeFileSync(path.join(out, "baseline.json"), JSON.stringify(result, null, 1));
fs.writeFileSync(path.join(out, "baseline.md"), md.join("\n"));
console.log(md.join("\n"));
process.exit(0);
