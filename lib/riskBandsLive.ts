import type { PublicBond } from "./types";
import { candidatesOf, type BandCand } from "./coherentFrontier";
import { atLeastAsGood, bestGreedy, improveSteps, inClasses, pruneCandidates, statOf, type BandConfig, type RiskBand, type Stat } from "./riskBands";
import { rulesFor } from "./riskBandsBuild";
import { solveBand } from "./riskBandsSolve";

// Progressive search for a band when no stored result applies (a customer's blacklist, a cold start): owner 27/10/2026, item 4.
//   a. instant start: greedy list of 10 different issuers (lib/riskBands.ts greedyStart);
//   b. improvement by 1-for-1 swaps, each accepted swap streamed (yield never drops, expected loss never rises);
//   c. the exact solve runs in parallel (time-boxed); its list replaces the current one only if at least as good on yield AND expected loss,
//      and then the list is labelled optimal;
//   d. finished results are cached by the caller's key.
// Every figure is analytic (closed form).

export type LiveStep = {
  phase: "start" | "swap" | "exact" | "done";
  sel: BandCand[];
  stat: Stat;
  /** True only for a list the exact solve proved best for the band. */
  optimal: boolean;
  /** Swap steps: the ISINs that left and came in (the row replaced in place). */
  out?: string;
  in?: string;
};

export const EXACT_SECONDS = 3;

export type LiveResult = { sel: BandCand[]; stat: Stat; optimal: boolean };
const done = new Map<string, LiveResult>();
const DONE_MAX = 300;
export const cachedLive = (key: string): LiveResult | undefined => done.get(key);
export function rememberLive(key: string, r: LiveResult): void {
  if (done.size >= DONE_MAX) done.delete(done.keys().next().value as string);
  done.set(key, r);
}

const tick = () => new Promise<void>((r) => setImmediate(r));

/** The steps of one progressive search. `exact: false` skips the exact solve (used when the server is short of memory). */
export async function* liveBand(bonds: PublicBond[], duration: number, band: RiskBand, config: BandConfig, opts: { exact?: boolean; exactSeconds?: number } = {}): AsyncGenerator<LiveStep> {
  const all = candidatesOf(bonds, duration, false).filter((c) => inClasses(band, c.cls));
  const kept = pruneCandidates(all, config.perCell);
  const rules = rulesFor(duration);
  const exactP = opts.exact === false ? null : solveBand(kept, band, rules, { timeLimit: opts.exactSeconds ?? EXACT_SECONDS }).catch(() => null);
  // One window of three risk classes holds the whole list: the best greedy start over the windows that can reach the band; swaps stay inside it.
  const start = bestGreedy(kept, band, rules);
  let cur: BandCand[] | null = start?.sel ?? null;
  const pool = start?.pool ?? kept;
  let exactDone: Awaited<NonNullable<typeof exactP>> | null = null;
  let exactSettled = !exactP;
  exactP?.then((r) => { exactDone = r; exactSettled = true; });
  const switchToExact = (): LiveStep | null => {
    const r = exactDone;
    exactDone = null;
    if (!r || !r.sel.length) return null;
    const stat = statOf(r.sel);
    if (cur && !(atLeastAsGood(stat, statOf(cur)))) return null;
    return { phase: "exact", sel: r.sel, stat, optimal: r.status === "optimal" };
  };
  if (cur) {
    yield { phase: "start", sel: cur, stat: statOf(cur), optimal: false };
    const steps = improveSteps(cur, pool, band, rules, { deadlineMs: 2500 });
    for (const st of steps) {
      await tick();
      const ex = exactSettled ? switchToExact() : null;
      if (ex) { yield ex; return; }
      cur = st.sel;
      yield { phase: "swap", sel: st.sel, stat: st.stat, optimal: false, out: st.out, in: st.in };
    }
  }
  if (exactP) {
    await exactP;
    const ex = switchToExact();
    if (ex) { yield ex; return; }
  }
  if (cur) yield { phase: "done", sel: cur, stat: statOf(cur), optimal: false };
}
