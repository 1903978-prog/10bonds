import { expectedLoss } from "./expectedLoss";
import { riskOfNotch } from "./ratings";
import type { FinderLang } from "./finderText";
import { LANDING_NUM, LANDING_TEXT } from "./landingText";

// The landing comparison card's wording and figures (the owner, 28/10/2026). Everything comes from stored data: the ETF
// benchmark (lib/landingSnapshot.ts) and the stored top-10 list (lib/landingBonds.json). The "same risk level, similar
// duration" wording is used only when both sides really match; otherwise both risk levels and durations are shown.
export const RISK_TOLERANCE = 0.5;
export const DURATION_TOLERANCE = 1;

export type Side = { ytm: number; risk: number; duration: number };
export type CompareBond = { risk: number | null; ytm: number | null };

/** Equal-weight average return and risk level of a stored list. Null when a bond lacks a figure. */
export function listFigures(bonds: CompareBond[]): { ytm: number; risk: number; riskScores: number[] } | null {
  if (!bonds.length || bonds.some((b) => b.risk == null || b.ytm == null)) return null;
  const riskScores = bonds.map((b) => b.risk as number);
  const avg = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
  return { ytm: avg(bonds.map((b) => b.ytm as number)), risk: Math.round(avg(riskScores) * 10) / 10, riskScores };
}

/** The middle internal notch of a risk score 1..10 (the table maps several notches to one score). */
function notchOfRisk(score: number): number {
  const ns: number[] = [];
  for (let n = 0; n <= 20; n++) if (riskOfNotch(n) === Math.min(10, Math.max(1, Math.round(score)))) ns.push(n);
  return ns[Math.floor(ns.length / 2)] ?? 20;
}

/** Yearly expected credit loss in percentage points for a risk score and a horizon (the site's default table, 60% loss given default). */
export const lossAtRisk = (score: number, years: number) => expectedLoss(notchOfRisk(score), years);

/** Gross and net (after expected credit losses) yield advantage of the list over the ETF benchmark, in pp. */
export function spreads(list: Side, etf: Side, listScores?: number[], listLossPa?: number): { gross: number; net: number } {
  const scores = listScores?.length ? listScores : [list.risk];
  // A stored list's own yearly expected loss (its stored loss to maturity over its duration) wins over the per-bond estimate.
  const listLoss = listLossPa ?? scores.reduce((s, r) => s + lossAtRisk(r, list.duration), 0) / scores.length;
  const etfLoss = lossAtRisk(etf.risk, etf.duration);
  return { gross: list.ytm - etf.ytm, net: list.ytm - listLoss - (etf.ytm - etfLoss) };
}

/** True only when the stored data support "same risk level, similar duration". */
export const isMatched = (list: Side, etf: Side) =>
  Math.abs(list.risk - etf.risk) <= RISK_TOLERANCE && Math.abs(list.duration - etf.duration) <= DURATION_TOLERANCE;

const signed = (n: number, fmt: (x: number, d?: number) => string) => `${n >= 0 ? "+" : "−"}${fmt(Math.abs(n))}`;

export type CompareCopy = { sub: string; gross: string; net: string; fine: string; matched: boolean };

export function compareCopy(lang: FinderLang, list: Side, etf: Side, listScores?: number[], listLossPa?: number): CompareCopy {
  const c = LANDING_TEXT[lang].compare;
  const fmt = (n: number, d = 2) => n.toLocaleString(LANDING_NUM[lang], { minimumFractionDigits: d, maximumFractionDigits: d });
  const { net } = spreads(list, etf, listScores, listLossPa);
  const matched = isMatched(list, etf);
  const r = (x: number) => fmt(x, 1);
  const d = (x: number) => fmt(x, 1);
  return {
    sub: matched ? c.sub : c.subNeutral,
    gross: matched ? c.same(r(list.risk), d(list.duration)) : c.diff(r(list.risk), r(etf.risk), d(list.duration), d(etf.duration)),
    net: c.net(signed(net, fmt)),
    fine: c.fine,
    matched,
  };
}
