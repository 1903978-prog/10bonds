import { LIMITS } from "./limits";

// The one "Return and risk" slider (the owner, 24/10/2026): 30 steps = 10 risk levels × 3 return levels.
// Step 0..29: risk level k = floor(step / 3) + 1 is the highest risk accepted; the sub-step picks the desired return
// at that risk: low, medium or high. High is the slider maximum at k (the top-return list); low and medium sit at one
// and two thirds of the way from the maximum at k - 1 (1% under risk 1) to it, so the return never goes down
// from one step to the next.
export const MIX_STEPS = (LIMITS.risk.max - LIMITS.risk.min + 1) * 3;
export const MIX_START = (LIMITS.risk.initial - 1) * 3 + 2; // risk 5, high

/** Risk and desired return for a slider step; `capAt(r)` is the slider maximum at risk r, `riskTop` the highest risk with bonds. */
export function mixTarget(step: number, capAt: (r: number) => number, riskTop: number): { risk: number; ytm: number } {
  const s = Math.min(MIX_STEPS - 1, Math.max(0, Math.round(step)));
  const k = Math.floor(s / 3) + LIMITS.risk.min;
  const risk = Math.min(k, riskTop);
  const hi = capAt(risk);
  const lo = Math.min(hi, k > LIMITS.risk.min ? capAt(Math.min(k - 1, riskTop)) : LIMITS.ytm.min);
  // High is the maximum itself (the top-return list); low and medium are rounded down to the slider's 0.01 step.
  const ytm = s % 3 === 2 ? hi : Math.floor((lo + ((s % 3) + 1) / 3 * (hi - lo)) * 100 + 1e-9) / 100;
  return { risk, ytm: Math.max(LIMITS.ytm.min, ytm) };
}
