import { NS_SIZE, type NsCand, type NsRules } from "./solve";
import { checkNsList } from "./check";

// Reference sample for the Portfolio BES history: random feasible lists for one position (every hard rule checked by lib/netSpread/check.ts),
// drawn with a fixed seed so a run is reproducible. Stored once per price batch; after enough batches it becomes the frozen reference.
// The same sample is also used on the day as an "opportunity-set percentile" (admin only, labelled as such: the optimiser's list sits near the top by construction).

function prng(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export const seedOf = (s: string) => { let h = 2166136261; for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };

export function sampleFeasible(cands: NsCand[], allowed: readonly number[], rules: NsRules, want: number, seed: string, maxTries = want * 60, sum?: { lo: number; hi: number }): number[] {
  const pool = cands.filter((c) => allowed.includes(c.cls)).sort((a, b) => a.isin.localeCompare(b.isin));
  if (pool.length < NS_SIZE) return [];
  const rnd = prng(seedOf(seed));
  const lo = rules.duration * (1 - rules.avgTol), hi = rules.duration * (1 + rules.avgTol);
  const out: number[] = [];
  for (let t = 0; t < maxTries && out.length < want; t++) {
    const order = pool.map((c, i) => ({ i, k: rnd() })).sort((a, b) => a.k - b.k);
    const sel: NsCand[] = [];
    const groups = new Map<string, number>(), sectors = new Map<string, number>();
    let dsum = 0;
    for (const { i } of order) {
      const c = pool[i];
      if ((groups.get(c.group) ?? 0) >= rules.perIssuer || (!(rules.sectorExempt && c.exempt) && (sectors.get(c.sector) ?? 0) >= rules.perSector)) continue;
      const next = dsum + c.dur;
      sel.push(c); dsum = next;
      groups.set(c.group, (groups.get(c.group) ?? 0) + 1); if (!(rules.sectorExempt && c.exempt)) sectors.set(c.sector, (sectors.get(c.sector) ?? 0) + 1);
      if (sel.length === NS_SIZE) break;
    }
    // Repair a draw whose average duration is outside the window: swap in a random pool bond that moves it towards the window, checked again below.
    for (let r = 0; sel.length === NS_SIZE && r < 40 && (dsum < NS_SIZE * lo || dsum > NS_SIZE * hi); r++) {
      const j = Math.floor(rnd() * NS_SIZE), c = pool[Math.floor(rnd() * pool.length)];
      if (sel.some((x) => x.isin === c.isin)) continue;
      const nd = dsum - sel[j].dur + c.dur;
      if (Math.abs(nd / NS_SIZE - rules.duration) >= Math.abs(dsum / NS_SIZE - rules.duration)) continue;
      const rest = sel.filter((_, k) => k !== j);
      if (rest.filter((x) => x.group === c.group).length >= rules.perIssuer || (!(rules.sectorExempt && c.exempt) && rest.filter((x) => x.sector === c.sector && !(rules.sectorExempt && x.exempt)).length >= rules.perSector)) continue;
      sel[j] = c; dsum = nd;
    }
    if (sel.length === NS_SIZE && checkNsList(sel, allowed, rules, { sum }).every((c) => c.ok)) out.push(sel.reduce((s, c) => s + c.ns, 0) / NS_SIZE);
  }
  return out.sort((a, b) => a - b);
}
