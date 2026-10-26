import { capsFor } from "./lib/bestTable";
import { sliderFor } from "./lib/sliderCache";
import { TERMS } from "./lib/limits";
import { runLow } from "./lib/highsSolver";

// On the live site the slider maximums and the 30 slider positions of the default search (EUR, all sizes) are
// worked out shortly after the server starts (45 s), so the first visitor rarely waits for them, and again every 30 minutes, so a
// new data copy is ready before anyone asks.
// Runs as low priority: a customer's own search jumps ahead of the warm-up in the solver's queue.
const warm = () => runLow(warmAll);
async function warmAll() {
  const f = { currency: "EUR", size: "100k" } as const;
  try {
    await capsFor(f);
    for (const t of TERMS) await sliderFor(f, t.duration);
  } catch (e) {
    console.error("[warm] failed:", (e as Error).message);
  }
}

// SKIP_WARMUP=1 (set only in the CI browser check) leaves the warm-up out, so the heavy solver run does not compete with the page checks on a small runner.
if (process.env.NODE_ENV === "production" && !process.env.SKIP_WARMUP) {
  setTimeout(warm, 45_000); // after the first requests and the deploy's own checks, so they do not use memory at the same moment
  setInterval(warm, 30 * 60_000).unref();
}
