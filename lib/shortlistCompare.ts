import type { PublicBond } from "./types";
import type { BundPt } from "./bundSpread";
import { spreadBp } from "./bundSpread";
import { riskPay } from "./riskPay";
import { issuerKey } from "./ranking";
import { pdOf } from "./tiers";
import { lgdOf } from "./seniority";
import { lifeYears } from "./lifeYears";
import { summarize, type ShortlistSummary } from "./shortlist";

// Admin only: one list of bonds measured the same way whoever picked it, so two lists compare like for like: equal
// weight, the finder's expected loss on your money (default chance to maturity x loss given default by debt rank),
// spread over the Bund and Risk Pay. Portfolio Risk Pay = average spread / average expected loss per year (in bp).

export type PortfolioFigures = ShortlistSummary & {
  issuers: number;
  avgSpreadBp: number | null;
  riskPay: number | null;
  netBp: number | null;
};

export function figuresOf(bonds: PublicBond[], bund: BundPt[]): PortfolioFigures {
  const base = summarize(bonds);
  const used = bonds.filter((b) => b.grossYtm != null && b.modifiedDuration != null);
  const parts = used.flatMap((b) => {
    const sp = spreadBp(bund, b.grossYtm, b.modifiedDuration);
    const rp = riskPay(sp, pdOf(b), lifeYears(b), lgdOf(b));
    return sp == null || !rp ? [] : [{ sp, loss: rp.lossBp }];
  });
  const mean = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);
  const avgSpreadBp = mean(parts.map((p) => p.sp));
  const avgLoss = mean(parts.map((p) => p.loss));
  return {
    ...base,
    issuers: new Set(used.map(issuerKey)).size,
    avgSpreadBp,
    riskPay: avgSpreadBp != null && avgLoss ? avgSpreadBp / avgLoss : null,
    netBp: avgSpreadBp != null && avgLoss != null ? avgSpreadBp - avgLoss : null,
  };
}

const diff = (a: number | null, b: number | null) => (a == null || b == null ? null : a - b);

/** Shortlist minus the other list, in percentage points (return, loss), years, risk points, bp. */
export function differences(a: PortfolioFigures, b: PortfolioFigures) {
  return { ytm: diff(a.avgYtm, b.avgYtm), duration: diff(a.avgDuration, b.avgDuration), lifeLoss: diff(a.lifeLoss, b.lifeLoss), risk: diff(a.avgRisk, b.avgRisk), spreadBp: diff(a.avgSpreadBp, b.avgSpreadBp), riskPay: diff(a.riskPay, b.riskPay) };
}

/** Plain words: which list pays more return and what it costs in expected loss. */
export function verdictText(nameA: string, a: PortfolioFigures, nameB: string, b: PortfolioFigures): string {
  const d = differences(a, b);
  if (d.ytm == null || d.lifeLoss == null) return "Not enough data to compare.";
  const higher = d.ytm >= 0 ? nameA : nameB;
  const lower = d.ytm >= 0 ? nameB : nameA;
  const gain = Math.abs(d.ytm).toFixed(2);
  const dl = d.ytm >= 0 ? d.lifeLoss : -d.lifeLoss;
  const loss = Math.abs(dl).toFixed(2);
  const lossWords = Math.abs(dl) < 0.005 ? "at about the same expected loss" : dl > 0 ? `at ${loss} pp more expected loss` : `and ${loss} pp less expected loss`;
  return `${higher} has the higher return: ${gain} pp more than ${lower} ${lossWords} (${nameA} ${a.lifeLoss!.toFixed(2)}%, ${nameB} ${b.lifeLoss!.toFixed(2)}%).`;
}
