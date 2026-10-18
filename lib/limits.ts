export const LIMITS = {
  duration: { min: 1, max: 15, step: 0.5, initial: 5 },
  ytm: { min: 1, max: 12, step: 0.01, initial: 4 },
  risk: { min: 1, max: 10, step: 1, initial: 10 },
} as const;

// Worst rating accepted, slider level 1..10. maxNotch is the weakest notch allowed (AAA = 0, BBB- = 9, BB = 11).
// Level 10 is "BB and above": up to BB. Unrated bonds never appear.
export const RISK_LEVELS = [
  { label: "AAA", maxNotch: 0 },
  { label: "AA+", maxNotch: 1 },
  { label: "AA", maxNotch: 2 },
  { label: "AA-", maxNotch: 3 },
  { label: "A+", maxNotch: 4 },
  { label: "A", maxNotch: 5 },
  { label: "A-", maxNotch: 6 },
  { label: "BBB+", maxNotch: 7 },
  { label: "BBB / BBB-", maxNotch: 9 },
  { label: "BB and above", maxNotch: 11 },
] as const;

export function riskLevel(level: number) {
  const i = Math.min(RISK_LEVELS.length, Math.max(1, Math.round(level))) - 1;
  return { ...RISK_LEVELS[i], allowUnrated: false };
}
