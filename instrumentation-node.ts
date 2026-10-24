import { capsFor } from "./lib/bestTable";
import { sliderFor } from "./lib/sliderCache";
import { TERMS } from "./lib/limits";

// On the live site the slider maximums and the 30 slider positions of the default search (EUR, all sizes) are
// worked out when the server starts, so the first visitor never waits for them, and again every 30 minutes, so a
// new data copy is ready before anyone asks.
async function warm() {
  const f = { currency: "EUR", size: "100k" } as const;
  try {
    await capsFor(f);
    for (const t of TERMS) await sliderFor(f, t.duration);
  } catch (e) {
    console.error("[warm] failed:", (e as Error).message);
  }
}

if (process.env.NODE_ENV === "production") {
  setTimeout(warm, 2_000);
  setInterval(warm, 30 * 60_000).unref();
}
