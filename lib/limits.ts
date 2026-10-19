export const LIMITS = {
  duration: { min: 1, max: 15, step: 0.5, initial: 5 },
  ytm: { min: 1, max: 12, step: 0.01, initial: 4 },
  risk: { min: 1, max: 10, step: 1, initial: 7 },
} as const;

// Highest risk accepted, slider level 1..10 = the risk score itself (1 lowest risk, 10 highest).
// maxNotch is the weakest internal notch inside that score. Unrated bonds and bonds in default never appear.
// Kept as plain numbers (no grade names) because this file is also sent to the browser; lib/ratings.ts holds the mapping.
const MAX_NOTCH_BY_RISK = [0, 3, 6, 7, 8, 9, 12, 15, 18, 20];
export const RISK_LEVELS = MAX_NOTCH_BY_RISK.map((maxNotch, i) => ({ label: String(i + 1), maxNotch }));

export function riskLevel(level: number) {
  const i = Math.min(RISK_LEVELS.length, Math.max(1, Math.round(level))) - 1;
  return { ...RISK_LEVELS[i], allowUnrated: false };
}

// Weekly search allowances per plan (rolling 7 days). null = unlimited. Change a number here to change the plan.
// A "search" is a session: moving the sliders for SEARCH_SESSION_MINUTES after a counted search does not count again.
export const SEARCH_LIMITS = {
  free: { single: 10, portfolio: 3 },
  plus: { single: null, portfolio: null },
  premium: { single: null, portfolio: null },
} as const satisfies Record<"free" | "plus" | "premium", { single: number | null; portfolio: number | null }>;
export const SEARCH_SESSION_MINUTES = 15;
export type SearchKind = "single" | "portfolio";
