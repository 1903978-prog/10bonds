import { capsFor } from "./lib/bestTable";
import { sliderFor } from "./lib/sliderCache";
import { TERMS } from "./lib/limits";
import { runLow } from "./lib/highsSolver";
import { loadBondsFor } from "./lib/bonds";
import { coherentBuild } from "./lib/frontierCache";
import { servedBands } from "./lib/riskBandsServe";
import { buildSnapshot } from "./lib/sliderSnapshot";
import { loadBandConfig } from "./lib/riskBandsStore";

// On the live site the slider maximums and the 30 slider positions of the default search (EUR, all sizes) are
// read shortly after the server starts (3 s), so the first visitor rarely waits for them, and again every 30 minutes, so a
// new data copy is ready before anyone asks.
// Runs as low priority: a customer's own search jumps ahead of the warm-up in the solver's queue.
// Skipped while the process already uses a lot of memory (a crawler burst, a customer's own solve): it tries again on the next round.
const warm = () => {
  if (process.memoryUsage().rss > 650 * 1024 * 1024) return Promise.resolve();
  return runLow(warmAll);
};
async function warmAll() {
  const f = { currency: "EUR", size: "100k" } as const;
  try {
    // First the bond table and the saved lists (database reads only), so the first visitor's list is at hand.
    const src = await loadBondsFor(f);
    for (const t of TERMS) await coherentBuild(src, f, t.duration).catch(() => {});
    // The stored risk-band lists of the three terms (what the first click reads).
    await loadBandConfig().catch(() => {});
    for (const t of TERMS) await servedBands(f, t.duration).catch(() => {});
    await capsFor(f);
    for (const t of TERMS) await sliderFor(f, t.duration, "spread", true);
    // A new price batch with its stored lists ready: assemble, check and publish the 90-position snapshot (database reads and light arithmetic only; no solver).
    await buildSnapshot("auto").catch((e) => console.error("[warm] slider snapshot:", (e as Error).message));
  } catch (e) {
    console.error("[warm] failed:", (e as Error).message);
  }
}

// SKIP_WARMUP=1 (set only in the CI browser check) leaves the warm-up out, so the heavy solver run does not compete with the page checks on a small runner.
if (process.env.NODE_ENV === "production" && !process.env.SKIP_WARMUP) {
  setInterval(warm, 30 * 60_000).unref();
}

/** Runs at boot before the server takes traffic (instrumentation.ts), for at most 15 s, so a visitor's first click finds everything read already. */
export async function warmAtBoot() {
  if (process.env.NODE_ENV !== "production" || process.env.SKIP_WARMUP) return;
  await Promise.race([warm(), new Promise((r) => setTimeout(r, 15_000))]);
}
