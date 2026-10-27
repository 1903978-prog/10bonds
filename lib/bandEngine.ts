import type { PublicBond } from "./types";
import { activePolicy, END_POLICY, type CoherencePolicy } from "./coherence";
import { bestInBand, candidatesOf, listOfCands, newCertificate, type BandCand, type Certificate } from "./coherentFrontier";
import { LIMITS } from "./limits";

// 30-BAND MODE (owner 27/10/2026): for each of 30 predefined average rating-risk intervals, the highest-YTM list of 10 bonds under the approved policies
// (exact, HiGHS), least expected loss among equals; then economically dominated bands are flagged so a progressive slider only shows genuine steps up.
// A band with no feasible list is reported unavailable with the rule that blocks it. Separate from the live slider; nothing in production calls this.

export type Band = { k: number; lo: number; hi: number };
/** Band k covers [1 + 0.3 (k-1), +0.2]; band 30 ends at 10.0 (1.0-1.2, 1.3-1.5, ... 9.7-10.0). */
export const BANDS: Band[] = Array.from({ length: 30 }, (_, i) => {
  const lo = Math.round((1 + 0.3 * i) * 10) / 10;
  return { k: i + 1, lo, hi: i === 29 ? 10 : Math.round((lo + 0.2) * 10) / 10 };
});

export type BandStatus = "feasible" | "dominated" | "unavailable";
export type BandResult = {
  k: number; lo: number; hi: number; status: BandStatus;
  avgRisk: number | null; ytm: number | null; el: number | null; avgDuration: number | null; isins: string[];
  /** Why the band is unavailable, or why it was dominated. */
  reason: string | null;
  /** For an unavailable band: the first single rule that, if lifted, would give a list (information only, never shown as a portfolio). */
  ifLifted?: { rule: string; ytm: number } | null;
  uncertified?: boolean;
  /** "endpoint" = the approved end rules (no loss-share, sector or weak-bond caps); applies to band 1 and band 30 only. */
  policy: "regular" | "endpoint";
  /** Endpoint bands only: the same band under the regular rules, for comparison (null = infeasible). */
  regular?: { ytm: number; el: number } | null;
};

const EPS = 1e-6;
const avgOf = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;

const RULES: { name: string; relax: (p: CoherencePolicy) => CoherencePolicy }[] = [
  { name: "max 2 bonds rated B+ or below", relax: (p) => ({ ...p, maxWeak: 10 }) },
  { name: "max 3 bonds per sector", relax: (p) => ({ ...p, maxPerSector: 10 }) },
  { name: "max 25% of expected loss per bond", relax: (p) => ({ ...p, maxLossShare: 1 }) },
];

/** Marks lists that are not genuine steps up (see header), in place. */
export function markDominated(rs: BandResult[]): void {
  const live = rs.filter((r) => r.status === "feasible");
  for (const p of live) {
    // 1. A riskier band that does not pay more than a safer band is not a step up.
    const safer = live.find((q) => q !== p && q.avgRisk! < p.avgRisk! - EPS && q.ytm! >= p.ytm! - EPS);
    if (safer) { p.status = "dominated"; p.reason = `Yield ${p.ytm!.toFixed(2)}% is not above the safer band ${safer.k} (${safer.ytm!.toFixed(2)}%)`; continue; }
  }
  const left = rs.filter((r) => r.status === "feasible");
  for (const p of left) {
    // 2. Pareto on (yield up, expected loss down): another band is at least as good on both and better on one (identical: the safer band stays).
    const q = left.find((o) => o !== p && o.ytm! >= p.ytm! - EPS && o.el! <= p.el! + EPS && (o.ytm! > p.ytm! + EPS || o.el! < p.el! - EPS || o.k < p.k));
    if (q) { p.status = "dominated"; p.reason = `Band ${q.k} has ${q.ytm! > p.ytm! + EPS ? "a higher yield" : "the same yield"} and ${q.el! < p.el! - EPS ? "a lower" : "the same"} expected loss`; }
  }
}

/** The 30 bands for one horizon over the given bonds (already filtered as the live engine does). */
export async function runBands(bonds: PublicBond[], duration: number, opts: { policy?: CoherencePolicy; only?: number[]; diagnose?: boolean; endpoints?: boolean } = {}): Promise<{ results: BandResult[]; cert: Certificate; certEndpoints: Certificate; candidates: number }> {
  const cands = candidatesOf(bonds, duration, false); // spread hurdles are diagnostic only (owner 1B)
  const policy = opts.policy ?? activePolicy();
  const cert = newCertificate();
  const certEndpoints = newCertificate();
  const t0 = Date.now();
  const results: BandResult[] = [];
  for (const b of BANDS) {
    if (opts.only && !opts.only.includes(b.k)) continue;
    const endpoint = opts.endpoints !== false && (b.k === 1 || b.k === 30);
    const usedPolicy = endpoint ? END_POLICY : policy;
    const r = await bestInBand(cands, usedPolicy, duration, b, endpoint ? certEndpoints : cert);
    if (r.sel.length) {
      const list = listOfCands(r.sel);
      let regular: BandResult["regular"];
      if (endpoint) {
        const g = await bestInBand(cands, policy, duration, b, certEndpoints);
        regular = g.sel.length ? { ytm: listOfCands(g.sel).ytm, el: listOfCands(g.sel).el } : null;
      }
      results.push({ ...b, policy: endpoint ? "endpoint" : "regular", regular, status: "feasible", avgRisk: avgOf(r.sel.map((c) => c.cls)), ytm: list.ytm, el: list.el, avgDuration: avgOf(r.sel.map((c) => c.dur)), isins: list.isins, reason: null, uncertified: r.status === "uncertified" || undefined });
      continue;
    }
    let ifLifted: BandResult["ifLifted"] = null;
    let reason = "No list of 10 bonds from different issuer groups, with durations within the limits, has an average risk class in this range";
    if (opts.diagnose !== false) {
      for (const rule of RULES) {
        const x = await bestInBand(cands, rule.relax(usedPolicy), duration, b, cert);
        if (x.sel.length) { ifLifted = { rule: rule.name, ytm: listOfCands(x.sel).ytm }; reason = `Blocked by the rule "${rule.name}"`; break; }
      }
      if (!ifLifted) {
        const all = RULES.reduce((p, r) => r.relax(p), usedPolicy);
        const x = await bestInBand(cands, all, duration, b, cert);
        if (x.sel.length) { ifLifted = { rule: "the three caps together", ytm: listOfCands(x.sel).ytm }; reason = "Blocked by the sector, weak-bond and loss-share caps together"; }
        else reason = `The eligible bonds for this horizon cannot reach this average risk even with those caps lifted (${cands.filter((c) => c.cls >= Math.ceil(b.lo)).length} eligible bonds at class ${Math.ceil(b.lo)} or worse, ${new Set(cands.filter((c) => c.cls >= Math.ceil(b.lo)).map((c) => c.group)).size} issuer groups; the risk ceiling is class ${LIMITS.risk.max})`;
      }
    }
    results.push({ ...b, policy: endpoint ? "endpoint" : "regular", status: "unavailable", avgRisk: null, ytm: null, el: null, avgDuration: null, isins: [], reason, ifLifted });
  }
  cert.seconds = (Date.now() - t0) / 1000;
  cert.certified = cert.uncertified === 0;
  certEndpoints.certified = certEndpoints.uncertified === 0;
  markDominated(results);
  return { results, cert, certEndpoints, candidates: cands.length };
}

export type { BandCand };
