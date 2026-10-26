import type { PublicBond } from "./types";
import { bondNotch, bondRisk } from "./ratings";
import { lossPdOf } from "./tiers";
import { issuerGroupOf } from "./issuerGroups";
import { sectorOf, SECTOR_TAXONOMY_VERSION, UNCLASSIFIED } from "./sectors";

// Rating coherence and credit concentration rules (the owner, 25/10/2026), Methodology with spread rules only (admin):
// hard constraints of the exact optimiser (lib/coherentFrontier.ts), never a filter applied afterwards.
// With m = the worst risk class actually in the list (1 AAA .. 10 CC/C, the worst agency rating as everywhere):
//   A. every bond's class is within m - 2 .. m (and m is at most the risk ceiling asked for);
//   B. at least 7 bonds in classes m - 1 and m;
//   C. at least 2 bonds in class m;
//   D. at most 2 bonds rated B+ or below, by the real notch (not the broad class);
//   E. no bond carries more than 25% of the list's expected loss (default chance to maturity x the same loss given
//      default for every bond, so the share is pd_i / sum of pd);
//   F. at most 1 bond per issuer group (aliases and subsidiaries joined, lib/issuerGroups.ts);
//   G. at most 3 bonds per major sector (banks and insurers both count as Financials, lib/sectors.ts).
// The numbers are edited at /admin/risk-premium ("Spread rules" tab) and stored with every result (policySignature).

export type CoherencePolicy = {
  /** Classes the list may span below its worst class (A). */
  maxDispersion: number;
  /** Bonds in the two weakest classes present (B). */
  minCore: number;
  /** Bonds in the worst class present (C). */
  minWorst: number;
  /** Largest share of the list's expected loss one bond may carry, 0..1 (E). */
  maxLossShare: number;
  /** Bonds per major sector (G). */
  maxPerSector: number;
  /** Bonds rated B+ or below (D). */
  maxWeak: number;
  /** Bonds per issuer group (F). */
  maxPerIssuer: number;
};

export const DEFAULT_POLICY: CoherencePolicy = { maxDispersion: 2, minCore: 7, minWorst: 2, maxLossShare: 0.25, maxPerSector: 3, maxWeak: 2, maxPerIssuer: 1 };

export const POLICY_FIELDS: { key: keyof CoherencePolicy; label: string; min: number; max: number; step: number; pct?: boolean }[] = [
  { key: "maxDispersion", label: "Maximum rating-class dispersion", min: 1, max: 3, step: 1 },
  { key: "minCore", label: "Minimum bonds in core rating classes", min: 5, max: 10, step: 1 },
  { key: "minWorst", label: "Minimum bonds in worst represented class", min: 1, max: 5, step: 1 },
  { key: "maxLossShare", label: "Maximum expected-loss share per bond", min: 0.15, max: 0.5, step: 0.01, pct: true },
  { key: "maxPerSector", label: "Maximum bonds per major sector", min: 2, max: 5, step: 1 },
  { key: "maxWeak", label: "Maximum bonds rated B+ or below", min: 0, max: 3, step: 1 },
  { key: "maxPerIssuer", label: "Maximum bonds per issuer group", min: 1, max: 1, step: 1 },
];

/**
 * A clean policy from what the admin sent, or null when a value is missing or out of range. The ranges keep every rule
 * switched on (editing can tighten or loosen a rule within them, never turn the model off): e.g. the core is at least
 * 5 of 10, the window at most 3 classes, and one bond per issuer group stays fixed.
 */
export function cleanPolicy(raw: unknown): CoherencePolicy | null {
  if (!raw || typeof raw !== "object") return null;
  const out = { ...DEFAULT_POLICY };
  for (const f of POLICY_FIELDS) {
    const v = Number((raw as Record<string, unknown>)[f.key]);
    if (!Number.isFinite(v) || v < f.min || v > f.max) return null;
    out[f.key] = f.pct ? Math.round(v * 100) / 100 : Math.round(v);
  }
  return out;
}

let policy: CoherencePolicy = DEFAULT_POLICY;
let policyVersion = "default";

/** Use the saved policy (called when the live risk settings load; null keeps the defaults). */
export function setPolicy(p: CoherencePolicy | null | undefined, version?: string | null): void {
  const c = p ? cleanPolicy(p) : null;
  policy = c ?? DEFAULT_POLICY;
  policyVersion = c ? version || "saved" : "default";
}
export const activePolicy = () => policy;

/** Stored with every result and part of the frontier cache key: the rules, their version, the sector taxonomy. */
export const policySignature = (p: CoherencePolicy = policy) =>
  `coh1:${policyVersion}:${POLICY_FIELDS.map((f) => p[f.key]).join(",")}:${SECTOR_TAXONOMY_VERSION}`;

/** B+ is notch 13 on the site's scale (AAA = 0). */
export const B_PLUS_NOTCH = 13;
export const isWeakNotch = (b: PublicBond) => (bondNotch(b) ?? 99) >= B_PLUS_NOTCH;
/** The risk class 1..10 (worst agency rating); 10 when unknown (such bonds never reach the optimiser). */
export const classOf = (b: PublicBond) => bondRisk(b) ?? 10;

export type CoherenceFacts = { cls: number; weak: boolean; pd: number; group: string | null; sector: string };
export const factsOf = (b: PublicBond): CoherenceFacts => ({ cls: classOf(b), weak: isWeakNotch(b), pd: lossPdOf(b), group: issuerGroupOf(b), sector: sectorOf(b) });

export type Check = { rule: "count" | "window" | "core" | "worst" | "weak" | "loss" | "issuer" | "sector" | "ceiling"; ok: boolean; detail: string };

/**
 * Every rule checked on one list (used by the tests, the live check and as a last guard on anything the optimiser
 * returns). A list passes only if every check passes; passing one group says nothing about the others.
 */
export function checkList(facts: CoherenceFacts[], p: CoherencePolicy = policy, ceiling = 10, count = 10): Check[] {
  const out: Check[] = [];
  out.push({ rule: "count", ok: facts.length === count, detail: `${facts.length} bonds` });
  if (!facts.length) return out;
  const m = Math.max(...facts.map((f) => f.cls));
  out.push({ rule: "ceiling", ok: m <= ceiling, detail: `worst class ${m}, ceiling ${ceiling}` });
  const low = Math.min(...facts.map((f) => f.cls));
  out.push({ rule: "window", ok: m - low <= p.maxDispersion, detail: `classes ${low}-${m}` });
  const core = facts.filter((f) => f.cls >= m - 1).length;
  out.push({ rule: "core", ok: core >= p.minCore, detail: `${core} in classes ${Math.max(1, m - 1)}-${m}` });
  const worst = facts.filter((f) => f.cls === m).length;
  out.push({ rule: "worst", ok: worst >= p.minWorst, detail: `${worst} in class ${m}` });
  const weak = facts.filter((f) => f.weak).length;
  out.push({ rule: "weak", ok: weak <= p.maxWeak, detail: `${weak} at B+ or below` });
  const total = facts.reduce((s, f) => s + f.pd, 0);
  const top = Math.max(...facts.map((f) => f.pd));
  out.push({ rule: "loss", ok: total <= 0 || top <= p.maxLossShare * total + 1e-9, detail: `largest share ${total > 0 ? Math.round((top / total) * 1000) / 10 : 0}%` });
  const groups = new Map<string, number>();
  let unknown = 0;
  for (const f of facts) if (f.group) groups.set(f.group, (groups.get(f.group) ?? 0) + 1); else unknown++;
  const maxG = Math.max(0, ...groups.values());
  out.push({ rule: "issuer", ok: !unknown && maxG <= p.maxPerIssuer, detail: unknown ? `${unknown} without a known issuer` : `at most ${maxG} per issuer group` });
  const sectors = new Map<string, number>();
  for (const f of facts) sectors.set(f.sector, (sectors.get(f.sector) ?? 0) + 1);
  const [ts, tn] = [...sectors].sort((a, b) => b[1] - a[1])[0];
  out.push({ rule: "sector", ok: tn <= p.maxPerSector, detail: `most in one sector: ${tn} (${ts})` });
  return out;
}

export const passes = (facts: CoherenceFacts[], p?: CoherencePolicy, ceiling?: number) => checkList(facts, p, ceiling).every((c) => c.ok);

/** The small credit profile shown next to the KPIs (admin, spread rules): from the ten bonds actually chosen. */
export type CreditProfile = { ceiling: number; low: number; high: number; core: number; coreOf: number; unclassified: number };
export function creditProfile(facts: CoherenceFacts[], ceiling = 10): CreditProfile | null {
  if (!facts.length) return null;
  const high = Math.max(...facts.map((f) => f.cls));
  const low = Math.min(...facts.map((f) => f.cls));
  return { ceiling, low, high, core: facts.filter((f) => f.cls >= high - 1).length, coreOf: facts.length, unclassified: facts.filter((f) => f.sector === UNCLASSIFIED).length };
}

/** The fields where a policy differs from the defaults (shown to the admin so a loosened model is never silent). */
export const policyChanges = (p: CoherencePolicy): string[] => POLICY_FIELDS.filter((f) => p[f.key] !== DEFAULT_POLICY[f.key]).map((f) => f.label);

export { CLASS_NAMES } from "./creditProfileText";

/** Features of a plan under the coherence rules: swapping a bond or adding a left-out one could break the rules, so neither is offered. */
export const withoutListEdits = <T extends string>(features: readonly T[]): T[] => features.filter((k) => k !== ("swap" as string) && k !== ("add_left_out" as string));
