import { FUNNEL, FUNNEL_EXTRA } from "./trackRules";

export type FunnelDay = { day: string; counts: Record<string, number> };
export type FunnelStep = { kind: string; visitors: number; fromPrevious: number | null; fromTop: number | null };

/** Turns visitor counts per step into conversion percentages (null where there is nothing to compare). Pure, for tests. */
export function dropOff(visitors: Record<string, number>, steps: readonly string[] = FUNNEL): FunnelStep[] {
  const top = visitors[steps[0]] ?? 0;
  return steps.map((kind, i) => {
    const v = visitors[kind] ?? 0;
    const prev = i === 0 ? null : (visitors[steps[i - 1]] ?? 0);
    return {
      kind,
      visitors: v,
      fromPrevious: prev === null || prev === 0 ? null : Math.round((v / prev) * 1000) / 10,
      fromTop: i === 0 || top === 0 ? null : Math.round((v / top) * 1000) / 10,
    };
  });
}

export const ALL_FUNNEL_KINDS: readonly string[] = [...FUNNEL, ...FUNNEL_EXTRA];
