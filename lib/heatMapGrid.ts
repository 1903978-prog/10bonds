import type { ExactFrontier } from "./exactFrontier";
import { DURATION_STEPS } from "./limits";

// Admin only (the owner, 24/10/2026): a heat map of the expected loss on your money of the best list for every target
// return (3.0% to 6.4% in 0.2 pt steps) and every horizon of the slider (1-15, 20, 25, 30+ years), so the owner sees
// which horizon and return carry the least risk. Each cell is the lowest-loss list that reaches that return on the same
// exact frontier the slider and the search use (lib/frontierCache.ts), so the figures always agree with them.

export const HEAT_YTMS: number[] = Array.from({ length: 18 }, (_, i) => Math.round((3 + i * 0.2) * 10) / 10);
export const HEAT_HORIZONS: number[] = [...DURATION_STEPS];

export type HeatMap = {
  horizons: number[];
  ytms: number[];
  /** cells[row][col]: row = HEAT_YTMS index, col = HEAT_HORIZONS index; expected loss in %, null = that return cannot be reached. */
  cells: (number | null)[][];
};

/** One horizon's column: the lowest expected loss reaching each target return. */
export function heatColumn(frontier: Pick<ExactFrontier, "at">, ytms = HEAT_YTMS): (number | null)[] {
  return ytms.map((y) => {
    const p = frontier.at(y);
    return p ? Math.round(p.el * 1000) / 1000 : null;
  });
}

export function heatMapOf(columns: (number | null)[][], horizons = HEAT_HORIZONS, ytms = HEAT_YTMS): HeatMap {
  return { horizons, ytms, cells: ytms.map((_, r) => columns.map((c) => c[r] ?? null)) };
}

/**
 * The two methodologies the admin can compare (the owner, 24/10/2026): "Methodology 1" (the live frontier) and
 * "Methodology with spread rules" (admin only, being added). Each gives the efficient frontier for one horizon; a method
 * with no frontier yet (null) shows as not available. Add the spread-rules frontier here when it exists.
 */
export type HeatMethod = "m1" | "spread";
export const HEAT_METHODS: { key: HeatMethod; label: string }[] = [
  { key: "m1", label: "Methodology 1" },
  { key: "spread", label: "With spread rules" },
];
export const parseMethod = (raw: string | null): HeatMethod => (raw === "spread" ? "spread" : "m1");
