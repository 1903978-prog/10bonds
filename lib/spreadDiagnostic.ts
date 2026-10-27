import type { PublicBond } from "./types";
import { bondNotch } from "./ratings";
import { lossPdOf } from "./tiers";
import { issuerGroupOf } from "./issuerGroups";
import { lifeYears } from "./lifeYears";
import { stepGap } from "./stepGap";
import { B_PLUS_NOTCH } from "./coherence";

// Relative spread adequacy as a DIAGNOSTIC (paper 5.1 and 7.4; lib/enginePolicy.ts "diagnostic_only"): does the bond pay at
// least the published rating-by-maturity hurdle (lib/stepGap.ts) over every comparable better-rated bond of another issuer?
// It labels a bond; it never removes one and says nothing about Pareto dominance inside a constrained portfolio.
//   adequate          every safer, lower-default bond of another issuer group pays less than this bond's yield minus the hurdle
//   below_hurdle      at least one such bond pays at least that much: the premium over it is under the hurdle
//   insufficient_data no hurdle is defined (AAA has nothing safer; B+ and below have no published step; maturity unknown),
//                     or there is no safer comparator in the universe
// "Comparable" = the same universe the optimiser sees (same currency and filters, bonds already inside the duration window).

export type SpreadStatus = "adequate" | "below_hurdle" | "insufficient_data";
export type SpreadVerdict = { status: SpreadStatus; /** Safer bonds (other issuer groups) whose premium is under the hurdle. */ beatenBy: number; /** Safer comparators examined. */ comparators: number };

const prep = (b: PublicBond) => ({ b, notch: bondNotch(b), ret: b.grossYtm, years: lifeYears(b), pd: lossPdOf(b), group: issuerGroupOf(b) });

export function spreadVerdicts(subjects: PublicBond[], universe: PublicBond[]): Map<string, SpreadVerdict> {
  const u = universe.map(prep).filter((x) => x.notch !== null && x.ret !== null && Number.isFinite(x.pd) && Number.isFinite(x.years));
  const out = new Map<string, SpreadVerdict>();
  for (const s of subjects.map(prep)) {
    if (s.notch === null || s.ret === null || !Number.isFinite(s.pd) || !Number.isFinite(s.years) || s.years <= 0 || s.notch >= B_PLUS_NOTCH || s.notch <= 0) {
      out.set(s.b.isin, { status: "insufficient_data", beatenBy: 0, comparators: 0 });
      continue;
    }
    let comparators = 0, beaten = 0;
    for (const d of u) {
      if (d.group === s.group || d.notch! >= s.notch || !(d.pd < s.pd - 1e-12)) continue;
      comparators++;
      if (d.ret! >= s.ret - stepGap(d.notch!, s.notch, s.years) - 1e-9) beaten++;
    }
    out.set(s.b.isin, { status: comparators === 0 ? "insufficient_data" : beaten ? "below_hurdle" : "adequate", beatenBy: beaten, comparators });
  }
  return out;
}

export const SPREAD_STATUS_LABEL: Record<SpreadStatus, string> = {
  adequate: "Adequately compensated",
  below_hurdle: "Below reference hurdle",
  insufficient_data: "Insufficient comparison data",
};
