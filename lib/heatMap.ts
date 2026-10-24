import type { BondSource } from "./bonds";
import type { BondFilter } from "./bondFilter";
import type { ExactFrontier } from "./exactFrontier";
import { frontierFor, frontierKey } from "./frontierCache";
import { HEAT_HORIZONS, heatColumn, heatMapOf, type HeatMap, type HeatMethod } from "./heatMapGrid";

export * from "./heatMapGrid";

// The finished maps per data copy and filter (small), and the ones being built.
const done = new Map<string, HeatMap>();
const building = new Map<string, Promise<HeatMap>>();

// Each methodology's efficient frontier for one horizon (cached in lib/frontierCache.ts); null = not built (the map says so).
// spread = the Methodology with spread rules (lib/stepGap.ts), admin only.
export const FRONTIER_BY_METHOD: Record<HeatMethod, ((src: BondSource, f: BondFilter, duration: number) => Pick<ExactFrontier, "at">) | null> = {
  m1: frontierFor,
  spread: (src, f, duration) => frontierFor(src, f, duration, "spread"),
};

const keyOf = (src: BondSource, f: BondFilter, m: HeatMethod) => `${m}|${frontierKey(src, f, 0)}`;

/**
 * The heat map for this copy and filter if it is ready; otherwise null, and it starts being built in the background,
 * one horizon per turn (never on the request itself), so the next ask a few seconds later reads it at once.
 */
export function heatMapFor(src: BondSource, f: BondFilter, method: HeatMethod = "m1"): HeatMap | null {
  const frontier = FRONTIER_BY_METHOD[method];
  if (!frontier) return null;
  const k = keyOf(src, f, method);
  const hit = done.get(k);
  if (hit) return hit;
  if (!building.has(k)) {
    const p = (async () => {
      const cols: (number | null)[][] = [];
      for (const d of HEAT_HORIZONS) {
        await new Promise((r) => setImmediate(r));
        cols.push(heatColumn(frontier(src, f, d)));
      }
      const map = heatMapOf(cols);
      if (done.size > 8) done.clear();
      done.set(k, map);
      return map;
    })();
    building.set(k, p);
    p.catch((e) => console.error("[heat-map] build failed:", (e as Error).message)).finally(() => building.delete(k));
  }
  return null;
}
