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
