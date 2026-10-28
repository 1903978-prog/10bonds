// Portfolio BES (0-100): percentile of a portfolio's net spread inside a frozen, versioned reference distribution of comparable feasible portfolios
// from EARLIER price batches. It is never computed from the portfolios the optimiser just compared (that would make a near-100 score certain).
// Without enough independent history the answer is "unavailable": nothing is invented.
export const REFERENCE_POLICY = {
  version: "pref-1.0",
  /** Percentile convention: mid-rank (share below + half the ties), so ties never push a score to 0 or 100; below the lowest / above the highest sample gives 0 / 100. */
  convention: "mid-rank percentile",
  /** At least this many separate price-batch days and this many sampled portfolios in the reference of one position. */
  minDays: 20,
  minSamples: 2000,
} as const;

export type PortfolioBes = { score: number | null; status: "calibrated" | "unavailable"; reason: string | null; referenceVersion: string; days: number; samples: number };

export function midRankPercentile(value: number, sample: number[]): number | null {
  if (!sample.length) return null;
  let below = 0, ties = 0;
  for (const x of sample) { if (x < value - 1e-9) below++; else if (Math.abs(x - value) <= 1e-9) ties++; }
  return (100 * (below + ties / 2)) / sample.length;
}

export function portfolioBes(netSpreadBp: number, reference: { days: number; samples: number[] } | null): PortfolioBes {
  const base = { referenceVersion: REFERENCE_POLICY.version, days: reference?.days ?? 0, samples: reference?.samples.length ?? 0 };
  if (!reference || reference.days < REFERENCE_POLICY.minDays || reference.samples.length < REFERENCE_POLICY.minSamples) {
    return { ...base, score: null, status: "unavailable", reason: `Unavailable - insufficient calibration data (${base.days} of ${REFERENCE_POLICY.minDays} price-batch days, ${base.samples} of ${REFERENCE_POLICY.minSamples} reference portfolios).` };
  }
  const p = midRankPercentile(netSpreadBp, reference.samples)!;
  return { ...base, score: Math.round(Math.min(100, Math.max(0, p)) * 10) / 10, status: "calibrated", reason: null };
}
