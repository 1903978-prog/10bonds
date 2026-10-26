import path from "node:path";
import { Worker } from "node:worker_threads";
import { AsyncLocalStorage } from "node:async_hooks";

// The exact solver (HiGHS, branch and cut, compiled to WebAssembly) for the coherent portfolio optimiser
// (lib/coherentFrontier.ts). One shared worker thread (lib/highsWorker.mjs) runs every solve, so a long solve never
// blocks the website's own thread (health checks and visitors keep being answered); solves run one after another.

type Solution = { Status: string; ObjectiveValue: number; Columns: Record<string, { Primal: number }> };
type Highs = { solve: (lp: string, options?: Record<string, unknown>) => Promise<Solution> };
type Pending = { resolve: (s: Solution) => void; reject: (e: Error) => void };

let worker: Worker | null = null;
const pending = new Map<number, Pending>();
let nextId = 0;

function start(): Worker {
  const w = new Worker(path.join(process.cwd(), "lib", "highsWorker.mjs"));
  w.on("message", (m: { id: number; result?: Solution; error?: string }) => {
    const p = pending.get(m.id);
    if (!p) return;
    pending.delete(m.id);
    busy = false;
    if (pending.size === 0) w.unref();
    if (m.error !== undefined) p.reject(new Error(m.error)); else p.resolve(m.result!);
    pump();
  });
  const fail = (e: Error) => {
    if (worker === w) worker = null;
    for (const p of pending.values()) p.reject(e);
    pending.clear();
    queue.high.length = 0;
    queue.low.length = 0;
    busy = false;
  };
  w.on("error", fail);
  w.on("exit", (code) => fail(new Error(`Solver worker stopped (${code})`)));
  w.unref();
  return w;
}

// Solves wait in a queue and go to the worker one at a time. Background warm-up work runs as "low" (runLow), so a
// customer's search jumps ahead of it instead of waiting behind minutes of warm-up solves.
const lowMode = new AsyncLocalStorage<boolean>();
export const runLow = <T>(fn: () => Promise<T>): Promise<T> => lowMode.run(true, fn);
type Job = { id: number; lp: string; options?: Record<string, unknown> };
const queue: { high: Job[]; low: Job[] } = { high: [], low: [] };
let busy = false;

function pump() {
  if (busy) return;
  const job = queue.high.shift() ?? queue.low.shift();
  if (!job) return;
  busy = true;
  const w = (worker ??= start());
  w.ref();
  w.postMessage(job);
}

const solver: Highs = {
  solve: (lp, options) => new Promise<Solution>((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });
    (lowMode.getStore() ? queue.low : queue.high).push({ id, lp, options });
    pump();
  }),
};

export async function loadSolver(): Promise<Highs> {
  return solver;
}

/** Gap tolerances every solve runs with: the optimum is exact up to these (loss in summed % points; relative gap 0). */
export const MIP_ABS_GAP = 1e-7;
export const SOLVE_SECONDS = 20;
export const SOLVER_OPTIONS = { output_flag: false, mip_rel_gap: 0, mip_abs_gap: MIP_ABS_GAP, time_limit: SOLVE_SECONDS } as const;
