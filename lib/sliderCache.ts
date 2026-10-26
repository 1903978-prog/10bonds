import { loadBondsFor } from "./bonds";
import type { BondFilter } from "./bondFilter";
import { coherentBuild, frontierFor, frontierKey, type FrontierMethod } from "./frontierCache";
import type { Certificate } from "./coherentFrontier";
import { buildSlider, type SliderPosition } from "./sliderPortfolios";
import { belowHurdle } from "./exactFrontier";
import { stepGap } from "./stepGap";

// The slider positions (up to 30 points on the exact frontier) per horizon and bond filter, worked out in the background
// once per data copy (outlier rule included), then served from memory. A customer never waits for them: until they are
// ready the finder uses its quick estimate (lib/mixSteps.ts).

export const SLIDER_METHOD = "exact-frontier-v1";

const ready = new Map<string, SliderPosition[]>();
const certs = new Map<string, Certificate>();
const building = new Map<string, Promise<SliderPosition[]>>();

/** The positions if ready, else null (and the build starts in the background). */
export async function sliderFor(f: BondFilter, duration: number, m: FrontierMethod = "spread"): Promise<{ positions: SliderPosition[] | null; key: string; cert?: Certificate }> {
  const src = await loadBondsFor(f);
  const key = [SLIDER_METHOD, frontierKey(src, f, duration, m)].join("|");
  const hit = ready.get(key);
  if (hit) return { positions: hit, key, cert: certs.get(key) };
  if (!building.has(key)) {
    const p = (async () => {
      // Started on the next turn, so the request that asked is answered first.
      await new Promise((done) => setImmediate(done));
      const frontier = m === "spread" ? await coherentBuild(src, f, duration) : frontierFor(src, f, duration, m);
      const built = buildSlider(frontier);
      const miss = belowHurdle(src.bonds, duration, built.map((p) => p.isins), stepGap);
      const positions = built.map((p, i) => ({ ...p, belowHurdle: miss[i] }));
      if (ready.size > 24) ready.clear();
      ready.set(key, positions);
      if ("cert" in frontier) certs.set(key, frontier.cert as Certificate);
      return positions;
    })().finally(() => building.delete(key));
    p.catch((e) => console.error("[slider] build failed:", (e as Error).message));
    building.set(key, p);
  }
  return { positions: null, key };
}
