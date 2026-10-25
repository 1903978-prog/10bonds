import { createRequire } from "node:module";
import path from "node:path";

// The exact solver (HiGHS, branch and cut, compiled to WebAssembly) for the coherent portfolio optimiser
// (lib/coherentFrontier.ts). One shared instance; solve() blocks the thread while it runs, so callers solve one
// problem per turn of the event loop.

type Solution = { Status: string; ObjectiveValue: number; Columns: Record<string, { Primal: number }> };
type Highs = { solve: (lp: string, options?: Record<string, unknown>) => Solution };

let loading: Promise<Highs> | null = null;
export function loadSolver(): Promise<Highs> {
  loading ??= (async () => {
    const req = createRequire(path.join(process.cwd(), "package.json"));
    const factory = req("highs") as (o?: { locateFile?: (f: string) => string }) => Promise<Highs>;
    const dir = path.dirname(req.resolve("highs"));
    return factory({ locateFile: (f) => path.join(dir, f) });
  })();
  return loading;
}

/** Gap tolerances every solve runs with: the optimum is exact up to these (loss in summed % points; relative gap 0). */
export const MIP_ABS_GAP = 1e-7;
export const SOLVE_SECONDS = 20;
export const SOLVER_OPTIONS = { output_flag: false, mip_rel_gap: 0, mip_abs_gap: MIP_ABS_GAP, time_limit: SOLVE_SECONDS } as const;
