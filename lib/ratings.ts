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
  const m = MOODYS_SCALE.indexOf(g);
  if (m >= 0) return m;
  return null;
}

/** The S&P-scale grade a notch stands for. */
export function spGradeOf(notch: number | null): string | null {
  return notch === null ? null : SP_SCALE[notch] ?? null;
}

/** Best available rating: the resolved one, else S&P, else Moody's, else Fitch. */
export function bondNotch(b: { ratingResolved: string | null; ratingSp: string | null; ratingMoodys: string | null; ratingFitch: string | null }): number | null {
  for (const g of [b.ratingResolved, b.ratingSp, b.ratingMoodys, b.ratingFitch]) {
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

/** Risk score 1..10 for a notch, or null when unrated or in default. */
export function riskOfNotch(notch: number | null): number | null {
  return notch === null ? null : RISK_BY_NOTCH[notch] ?? null;
}

/** Risk score 1..10 for a bond, or null when unrated or in default. */
export function bondRisk(b: Parameters<typeof bondNotch>[0]): number | null {
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
