import { loadBondsFor } from "./bonds";
import type { BondFilter } from "./bondFilter";
import { signatureOf } from "./bestTable";
import { pickRanking } from "./pickRanking";
import { liveRiskConfig } from "./riskPremium/store";
import { buildSlider, type SliderPosition } from "./sliderPortfolios";

// The 30 slider positions per horizon and bond filter, worked out in the background once per data copy and ranking
// setup (risk premium version and weight, outlier rule), then served from memory. A customer never waits for them:
// until they are ready the finder uses its quick estimate (lib/mixSteps.ts).

export const SLIDER_METHOD = "slider-v1";

const ready = new Map<string, SliderPosition[]>();
const building = new Map<string, Promise<SliderPosition[]>>();

/** The positions if ready, else null (and the build starts in the background). */
export async function sliderFor(f: BondFilter, duration: number): Promise<{ positions: SliderPosition[] | null; key: string }> {
  const [src, live] = await Promise.all([loadBondsFor(f), liveRiskConfig().catch(() => null)]);
  const key = [SLIDER_METHOD, signatureOf(src), f.currency, f.size, duration, live?.curve?.version ?? "none", live?.weight ?? 0, live?.outlierSd ?? "-"].join("|");
  const hit = ready.get(key);
  if (hit) return { positions: hit, key };
  if (!building.has(key)) {
    const p = (async () => {
      // A pause between rankings, so searches by other visitors are not held up.
      const rank = async (ytm: number, risk: number) => {
        await new Promise((done) => setImmediate(done));
        return (await pickRanking(src.bonds, src.asOf, duration, ytm, risk)).results;
      };
      const positions = await buildSlider(rank);
      if (ready.size > 24) ready.clear();
      ready.set(key, positions);
      return positions;
    })().finally(() => building.delete(key));
    p.catch((e) => console.error("[slider] build failed:", (e as Error).message));
    building.set(key, p);
  }
  return { positions: null, key };
}
