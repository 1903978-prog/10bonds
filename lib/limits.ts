export const LIMITS = {
  duration: { min: 1, max: 30, step: 1, initial: 5 },
  ytm: { min: 1, max: 12, step: 0.01, initial: 4 },
  risk: { min: 1, max: 10, step: 1, initial: 5 },
} as const;

// Horizon slider stops (the owner, 20/10/2026): every year up to 15, then 20, 25 and "30+" (30 years and longer).
export const DURATION_STEPS: readonly number[] = [...Array.from({ length: 15 }, (_, i) => i + 1), 20, 25, 30];

// Simple horizon choice for everyone (the owner, 24/10/2026): short 1-2, mid 3-5, long 6-15 years. Each searches one
// slider stop (±20% around it, like the slider); the admin also keeps the full slider.
export const TERMS = [
  { key: "short", from: 1, to: 2, duration: 2 },
  { key: "mid", from: 3, to: 5, duration: 4 },
  { key: "long", from: 6, to: 15, duration: 10 },
] as const;
export type TermKey = (typeof TERMS)[number]["key"];
/** The term whose range holds `d`, or null (only the admin's slider can reach 20 years and over). */
export const termOf = (d: number): TermKey | null => TERMS.find((x) => d >= x.from && d <= x.to)?.key ?? null;

/** The slider stop nearest to `d`. */
export function snapDuration(d: number): number {
  return DURATION_STEPS.reduce((best, s) => (Math.abs(s - d) < Math.abs(best - d) ? s : best), DURATION_STEPS[0]);
}

/** True at the last stop, "30+": every longer bond fits it too. */
export const isOpenEnded = (target: number) => target >= LIMITS.duration.max - 1e-9;

/** A bond's duration fits a horizon within `band` years; at "30+" anything longer fits as well. */
export function nearHorizon(duration: number, target: number, band: number): boolean {
  return isOpenEnded(target) ? duration >= target - band : Math.abs(duration - target) <= band;
}

// Highest risk accepted, slider level 1..10 = the risk score itself (1 lowest risk, 10 highest).
// maxNotch is the weakest internal notch inside that score. Unrated bonds and bonds in default never appear.
// Kept as plain numbers (no grade names) because this file is also sent to the browser; lib/ratings.ts holds the mapping.
const MAX_NOTCH_BY_RISK = [0, 3, 6, 7, 8, 9, 12, 15, 18, 20];
export const RISK_LEVELS = MAX_NOTCH_BY_RISK.map((maxNotch, i) => ({ label: String(i + 1), maxNotch }));

export function riskLevel(level: number) {
  const i = Math.min(RISK_LEVELS.length, Math.max(1, Math.round(level))) - 1;
  return { ...RISK_LEVELS[i], allowUnrated: false };
}

// Daily search allowances per plan (one counter for one-bond and portfolio searches together, reset at midnight Rome time). null = unlimited. Free's numbers are only the defaults: the admin edits them in /admin/features (lib/searchLimits.ts).
// A "search" is a session: moving the sliders for SEARCH_SESSION_MINUTES after a counted search does not count again.
export const SEARCH_LIMITS = {
  free: { daily: 10 },
  plus: { daily: null },
  premium: { daily: null },
} as const satisfies Record<"free" | "plus" | "premium", { daily: number | null }>;
export const SEARCH_SESSION_MINUTES = 15;
export type SearchKind = "single" | "portfolio";
