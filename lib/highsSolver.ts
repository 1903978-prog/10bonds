import path from "node:path";

// The exact solver (HiGHS, branch and cut, compiled to WebAssembly) for the coherent portfolio optimiser
// (lib/coherentFrontier.ts). One shared instance; solve() blocks the thread while it runs, so callers solve one
// problem per turn of the event loop.

type Solution = { Status: string; ObjectiveValue: number; Columns: Record<string, { Primal: number }> };
type HighsFactory = (o?: { locateFile?: (f: string) => string }) => Promise<Highs>;
type Highs = { solve: (lp: string, options?: Record<string, unknown>) => Solution };

let loading: Promise<Highs> | null = null;
export function loadSolver(): Promise<Highs> {
  loading ??= (async () => {
    // A plain import: the package is external to the server bundle (next.config.mjs), so Node loads it as is. (createRequire
    // is replaced by a stub inside the bundle, which made every solve fail with "a is not a function".)
    const mod = (await import("highs")) as unknown as { default?: HighsFactory } & HighsFactory;
    const factory = typeof mod.default === "function" ? mod.default : mod;
    const dir = path.join(process.cwd(), "node_modules", "highs", "build");
    return factory({ locateFile: (f) => path.join(dir, f) });
  })();
  return loading;
}

/** Gap tolerances every solve runs with: the optimum is exact up to these (loss in summed % points; relative gap 0). */
export const MIP_ABS_GAP = 1e-7;
export const SOLVE_SECONDS = 20;
export const SOLVER_OPTIONS = { output_flag: false, mip_rel_gap: 0, mip_abs_gap: MIP_ABS_GAP, time_limit: SOLVE_SECONDS } as const;
