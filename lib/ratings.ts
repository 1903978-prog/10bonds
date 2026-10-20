// Rating scale, best first. A notch is the position on this scale (AAA = 0).
const SP_SCALE = [
  "AAA", "AA+", "AA", "AA-", "A+", "A", "A-", "BBB+", "BBB", "BBB-",
  "BB+", "BB", "BB-", "B+", "B", "B-", "CCC+", "CCC", "CCC-", "CC", "C", "D",
];
const MOODYS_SCALE = [
  "Aaa", "Aa1", "Aa2", "Aa3", "A1", "A2", "A3", "Baa1", "Baa2", "Baa3",
  "Ba1", "Ba2", "Ba3", "B1", "B2", "B3", "Caa1", "Caa2", "Caa3", "Ca", "C",
];

export function notchOf(grade: string | null | undefined): number | null {
  if (!grade) return null;
  const g = grade.trim();
  const sp = SP_SCALE.indexOf(g);
  if (sp >= 0) return sp;
  // Moody's grades sometimes arrive upper-cased ("BAA2"); S&P grades have no digits, so this cannot clash.
  const m = MOODYS_SCALE.findIndex((x) => x.toLowerCase() === g.toLowerCase());
  if (m >= 0) return m;
  return null;
}

/** The S&P-scale grade a notch stands for. */
export function spGradeOf(notch: number | null): string | null {
  return notch === null ? null : SP_SCALE[notch] ?? null;
}

type RatedBond = { ratingResolved: string | null; ratingSp: string | null; ratingMoodys: string | null; ratingFitch: string | null; lrScore?: number | null };

/** Risk score 1..10 from a Livio Rating (0..100, higher = safer): 90+ is 1, 80-89 is 2, ... below 10 is 10. */
export function riskOfLr(lr: number | null | undefined): number | null {
  if (lr === null || lr === undefined || !Number.isFinite(lr)) return null;
  return Math.min(RISK_MAX, Math.max(RISK_MIN, 10 - Math.floor(Math.min(99.99, Math.max(0, lr)) / 10)));
}

// The notch everything downstream works with (filters, expected loss) for an LR risk level: the middle of its band.
const NOTCH_OF_LR_RISK = [0, 2, 5, 7, 8, 9, 11, 14, 17, 19];

/**
 * Rating used for the risk score: the Livio Rating (LR) when the bond has one (Livio, 20/10/2026), else S&P first
 * (so a BB- bond is always risk 7), else Moody's, else Fitch, else the resolved one.
 */
export function bondNotch(b: RatedBond): number | null {
  const lr = riskOfLr(b.lrScore);
  if (lr !== null) return NOTCH_OF_LR_RISK[lr - 1];
  for (const g of [b.ratingSp, b.ratingMoodys, b.ratingFitch, b.ratingResolved]) {
    const n = notchOf(g);
    if (n !== null) return n;
  }
  return null;
}

export const INVESTMENT_GRADE_LAST_NOTCH = 9; // BBB-

// Risk score shown on the site (1 = lowest risk, 10 = highest). We may not show agency grades, so every
// rating is turned into this score on the server and only the score leaves it. Notch -> risk:
// AAA 1; AA+..AA- 2; A+..A- 3; BBB+ 4; BBB 5; BBB- 6; BB+..BB- 7; B+..B- 8; CCC+..CCC- 9; CC, C 10.
// D (default) and unrated bonds have no risk score and are never shown.
const RISK_BY_NOTCH = [1, 2, 2, 2, 3, 3, 3, 4, 5, 6, 7, 7, 7, 8, 8, 8, 9, 9, 9, 10, 10];
export const RISK_MIN = 1;
export const RISK_MAX = 10;

/** The S&P grades a risk score stands for, e.g. 7 -> "BB+, BB, BB-" (admin only). */
export function riskBand(risk: number): string {
  return SP_SCALE.filter((_, n) => RISK_BY_NOTCH[n] === risk).join(", ");
}

/** Where the risk score comes from, e.g. "LR 72.5", or the agency grade "S&P BB-", "Moody's B1" or "Fitch B+" (admin only). */
export function ratingSourceLabel(b: RatedBond): string | null {
  if (riskOfLr(b.lrScore) !== null) return `LR ${Math.round(b.lrScore! * 10) / 10}`;
  const n = bondNotch(b);
  if (n === null) return null;
  const agencies: [string, string | null][] = [["S&P", b.ratingSp], ["Moody's", b.ratingMoodys], ["Fitch", b.ratingFitch]];
  const hit = agencies.find(([, g]) => notchOf(g) === n);
  return hit ? `${hit[0]} ${hit[1]!.trim()}` : spGradeOf(n);
}

/** Risk score 1..10 for a notch, or null when unrated or in default. */
export function riskOfNotch(notch: number | null): number | null {
  return notch === null ? null : RISK_BY_NOTCH[notch] ?? null;
}

/** Risk score 1..10 for a bond, or null when unrated or in default. */
export function bondRisk(b: RatedBond): number | null {
  return riskOfNotch(bondNotch(b));
}

/** Weakest notch inside a risk score (used to filter by "highest risk accepted"). */
export function maxNotchOfRisk(risk: number): number {
  let last = 0;
  RISK_BY_NOTCH.forEach((r, n) => { if (r <= risk) last = n; });
  return last;
}

/** Average risk of a set, one decimal. */
export function averageRisk(risks: (number | null)[]): number | null {
  const xs = risks.filter((r): r is number => r !== null);
  return xs.length ? Math.round((xs.reduce((s, r) => s + r, 0) / xs.length) * 10) / 10 : null;
}
