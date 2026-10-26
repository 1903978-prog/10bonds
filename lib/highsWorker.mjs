// Runs the exact solver (HiGHS) on its own thread so a long solve never freezes the website (lib/highsSolver.ts).
import { parentPort } from "node:worker_threads";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const factory = require("highs");
const dir = path.join(process.cwd(), "node_modules", "highs", "build");
const ready = factory({ locateFile: (f) => path.join(dir, f) });

parentPort.on("message", async ({ id, lp, options }) => {
  try {
    const highs = await ready;
    parentPort.postMessage({ id, result: highs.solve(lp, options) });
  } catch (e) {
    parentPort.postMessage({ id, error: e instanceof Error ? e.message : String(e) });
  }
});
