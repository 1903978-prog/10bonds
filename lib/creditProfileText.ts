// The credit profile line shown to the admin next to the KPIs (Methodology with spread rules): worked out from the ten
// bonds actually chosen. Class names are the admin's scale, never shown to customers.
export const CLASS_NAMES = ["", "AAA", "AA", "A", "BBB+", "BBB", "BBB−", "BB", "B", "CCC", "CC/C"] as const;

export type CoherenceView = {
  ceiling: number; low: number; high: number; core: number; coreOf: number; unclassified: number;
  checks: { rule: string; ok: boolean; detail: string }[];
  policy: string;
  cert: { certified: boolean; optimal: number; uncertified: number; absGap: number; seconds: number; policy: string };
};

export const profileParts = (c: Pick<CoherenceView, "ceiling" | "low" | "high" | "core" | "coreOf">) => ({
  permitted: CLASS_NAMES[c.ceiling] ?? "–",
  range: c.low === c.high ? CLASS_NAMES[c.high] : `${CLASS_NAMES[c.low]} to ${CLASS_NAMES[c.high]}`,
  core: `${c.core}/${c.coreOf}`,
  worst: CLASS_NAMES[c.high] ?? "–",
});
