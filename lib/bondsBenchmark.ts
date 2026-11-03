import { calculate, ENGINE_VERSION, type FactsLike } from "./bondsEngine";
import type { FactorMap } from "./livioIssuerModel";

// FROZEN five-bond benchmark (owner, 2/11/2026). The inputs below are fixed test data, NOT verified market data:
//  - LBBW, Groupama, SMFG: bank / insurer / bank holding. The owner approved their method on 3/11/2026 (lib/financialIssuerModel.ts). With NO inputs the benchmark expects the full range 0..100 (nothing invented); scored examples with inputs are in lib/creditBankInsurer.test.ts.
//  - Chile is a sovereign in the owner's approved table (real inputs from that table).
//  - LANXESS's company figures are SYNTHETIC (clearly invented round numbers) so that the arithmetic can be compared; they say nothing about LANXESS.
// `expected` was produced by running the SAME inputs through the owner's original code (lib/testSupport/lmopOriginal.ts) and is re-checked against it
// by lib/bondsBenchmark.test.ts. runSelfTest() recomputes with the live engine and compares: that is what the admin page's PASS/FAIL means.

const ok = { color: "AMBER", evidence: ["https://example.org/benchmark"] };
const risks = ["news_mgmt_legal", "politics_regulation", "market_competition_tech", "rates_refinancing_liquidity", "macro_fx_energy", "health_climate_cyber"].map((key) => ({ key, ...ok }));
const fig = (parameter: string, value: number) => ({ parameter, value, unit: "n", quote: `${parameter} ${value}`, url: "https://example.org/benchmark", period: "FY2025", reportingDate: "2025-12-31" });
const typed = (v: number) => ({ value: v, origin: "typed" as const });
export const LANXESS_FIGURES = [fig("netDebt", 1500), fig("ebitda", 600), fig("netInterestExpense", 80), fig("cfo", 400), fig("capex", 300), fig("totalDebt", 2000), fig("positiveFcfYears", 3), fig("cashPlusUndrawn", 1500), fig("debtDue24m", 700), fig("ebitdaCagrPct", 3), fig("ebitdaYoyPct", -2)];
export const LANXESS_JUDGMENT: FactorMap = {
  businessQuality: typed(70), industryRisk: typed(55), financialPolicy: typed(65),
  recessionSensitivity: typed(60), oilEnergyShock: typed(60), warGeopolitical: typed(60), inflationRateShock: typed(60), chinaCompetition: typed(60), pandemicDisruption: typed(60),
};

export type BenchCase = { name: string; facts: FactsLike; expected: { ir: [number | null, number | null]; br: [number | null, number | null]; approved: boolean } };
export const BENCHMARK: BenchCase[] = [
  { name: "LBBW DE000LB2CW16 (bank, senior preferred)", facts: { isin: "DE000LB2CW16", issuerType: "bank", risks, structural: { tier: "senior-unsecured-opco", flags: {} } }, expected: { ir: [0, 100], br: [0, 100], approved: true } },
  { name: "Groupama FR0013365640 (insurer, subordinated)", facts: { isin: "FR0013365640", issuerType: "insurer", risks, structural: { tier: "tier2-insurance-subordinated", flags: {} } }, expected: { ir: [0, 100], br: [0, 94], approved: true } },
  { name: "SMFG XS2012044454 (bank holding)", facts: { isin: "XS2012044454", issuerType: "financial_holding", risks, structural: { tier: "senior-unsecured-holdco", flags: {} } }, expected: { ir: [0, 100], br: [0, 98], approved: true } },
  { name: "Republic of Chile XS2975303483 (sovereign)", facts: { isin: "XS2975303483", issuerType: "sovereign", issuer: { canonicalId: "CHILE", legalName: "Republic of Chile", lei: null }, risks }, expected: { ir: [74, 74], br: [74, 74], approved: true } },
  { name: "LANXESS XS2415386726 (corporate, senior; synthetic figures)", facts: { isin: "XS2415386726", issuerType: "corporate", figures: LANXESS_FIGURES, factors: LANXESS_JUDGMENT, risks, structural: { tier: "senior-unsecured-opco", flags: {} } }, expected: { ir: [67.1825, 67.1825], br: [67.1825, 67.1825], approved: true } },
];

export type SelfTest = { engineVersion: string; pass: boolean; ranAt: string; cases: { name: string; pass: boolean; got: unknown; expected: unknown }[]; deterministic: boolean };
const rnd = (v: number | null) => (v === null ? null : Math.round(v * 1e9) / 1e9);

/** Runs the frozen benchmark through the live engine. PASS only if every case equals its frozen value and a second run gives the identical answer. */
export function runSelfTest(): SelfTest {
  const run = () => BENCHMARK.map((c) => { const r = calculate(c.facts); return { ir: [rnd(r.issuer.irMin), rnd(r.issuer.irMax)] as [number | null, number | null], br: [rnd(r.bond.brMin), rnd(r.bond.brMax)] as [number | null, number | null], approved: r.issuer.approved }; });
  const a = run(), b = run();
  const cases = BENCHMARK.map((c, i) => ({ name: c.name, pass: JSON.stringify(a[i]) === JSON.stringify(c.expected), got: a[i], expected: c.expected }));
  const deterministic = JSON.stringify(a) === JSON.stringify(b);
  return { engineVersion: ENGINE_VERSION, pass: deterministic && cases.every((c) => c.pass), ranAt: new Date().toISOString(), cases, deterministic };
}
