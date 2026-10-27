import crypto from "node:crypto";
import type { BondSource } from "./bonds";
import type { Certificate } from "./coherentFrontier";
import { activePolicy, policySignature } from "./coherence";
import { activeEngine, activeFallback, engineSignature } from "./enginePolicy";
import { spreadMatrix, stepSignature } from "./stepGap";
import { DEFAULT_RATES, DEFAULT_YEARS } from "./seo/defaultRates";
import { LGD_BY_RANK } from "./seniority";
import { GROUP_TABLE_VERSION } from "./issuerGroups";
import { SECTOR_TAXONOMY_VERSION } from "./sectors";
import { SOLVER_OPTIONS, MIP_ABS_GAP } from "./highsSolver";
import { LIMITS } from "./limits";

const sha = (x: unknown) => crypto.createHash("sha256").update(JSON.stringify(x)).digest("hex").slice(0, 16);
// The data hash covers every bond once; it is remembered per loaded bond list (same list object = same data), so a request does not rehash 10,000+ bonds.
const dataHashes = new WeakMap<object, string>();
export function dataHash(src: BondSource): string {
  let h = dataHashes.get(src.bonds);
  if (!h) {
    h = sha(src.bonds.map((b) => [b.isin, b.grossYtm, b.modifiedDuration, b.maturity, b.ratingSp]));
    dataHashes.set(src.bonds, h);
  }
  return h;
}

export type RunInputs = { duration: number; ytm: number; risk: number; filter: unknown };
/** Complete record of one served portfolio (owner brief 27/10, workstream I): what was computed, from which data, under which rules and models. */
export function buildManifest(args: {
  src: BondSource;
  inputs: RunInputs;
  status: string | undefined;
  isins: string[];
  outputs: { ytm: number | null; duration: number | null; expectedLossPct: number | null };
  cert?: Certificate;
  spreadDiagnostics?: Record<string, unknown>;
}) {
  const e = activeEngine();
  return {
    computedAt: new Date().toISOString(),
    commit: process.env.GITHUB_SHA ?? process.env.FLY_IMAGE_REF ?? null,
    data: { source: args.src.source, asOf: args.src.asOf, bonds: args.src.bonds.length, hash: dataHash(args.src) },
    inputs: args.inputs,
    engine: { ...e, signature: engineSignature(), fallback: activeFallback() },
    policy: { signature: policySignature(), coherence: activePolicy(), riskCeiling: LIMITS.risk.max, spreadSignature: stepSignature(), spreadMatrix: spreadMatrix(), spreadMode: e.spread },
    tables: { defaultRatesHash: sha(DEFAULT_RATES), defaultYears: DEFAULT_YEARS, lgdByRank: LGD_BY_RANK, issuerGroupsVersion: GROUP_TABLE_VERSION, sectorTaxonomyVersion: SECTOR_TAXONOMY_VERSION },
    models: { defaultModel: "historical table, linear cumulative (v1)", recovery: "debt-rank LGD (not bond-specific)", dependence: "independent issuers (none)", tailRisk: "CVaR off", lossModel: e.loss },
    solver: { name: "HiGHS", options: SOLVER_OPTIONS, absGapTolerance: MIP_ABS_GAP, status: args.status ?? null, certificate: args.cert ?? null },
    spreadDiagnostics: args.spreadDiagnostics ?? null,
    portfolio: { isins: args.isins, outputs: args.outputs },
  };
}
