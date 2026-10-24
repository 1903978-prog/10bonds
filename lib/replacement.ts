import type { PublicBond } from "./types";
import { bondRisk } from "./ratings";

// Bond Replacement Engine (professional accounts only).
// For each bond in an uploaded portfolio, look for a bond in our data that is either:
//   A) higher yield: similar duration, same or lower risk score, more yield; or
//   B) lower risk:   similar duration, similar yield, lower risk score.
// A swap is only suggested when the gain is clear after trading costs and it does not
// build up a bigger position in one issuer. Otherwise the answer is "keep".

export type Holding = { isin: string; amount: number };

export type EngineSettings = {
  /** Round-trip trading cost (sell + buy), percent of the amount. */
  costPct: number;
  /** "Similar duration" means within this many years. */
  durationTolerance: number;
  /** Higher-yield swap: extra yield per year after costs must be at least this (percent). */
  minPickupPct: number;
  /** Lower-risk swap: the most yield per year (after costs) we are ready to give up (percent). */
  maxGiveUpPct: number;
  /** One issuer may not grow above this share of the portfolio (percent), unless the sold bond was already bigger. */
  maxIssuerPct: number;
  mode: "both" | "yield" | "risk";
};

export const DEFAULT_SETTINGS: EngineSettings = {
  costPct: 0.3,
  durationTolerance: 0.5,
  minPickupPct: 0.15,
  maxGiveUpPct: 0.1,
  maxIssuerPct: 10,
  mode: "both",
};

export const SETTING_LIMITS: Record<Exclude<keyof EngineSettings, "mode">, { min: number; max: number }> = {
  costPct: { min: 0, max: 3 },
  durationTolerance: { min: 0.1, max: 2 },
  minPickupPct: { min: 0, max: 2 },
  maxGiveUpPct: { min: 0, max: 1 },
  maxIssuerPct: { min: 1, max: 100 },
};

/** Trading costs are spread over the bond's remaining duration, but never over less than a year. */
const MIN_HORIZON_YEARS = 1;
// One step of the 10BONDS risk score counts like 0.1 points of yield.
const RISK_STEP_VALUE = 0.1;

export type BondView = {
  isin: string;
  name: string;
  issuer: string;
  risk: number | null; // 10BONDS risk score 1..10
  sp?: string | null; // S&P grade: added for the admin only (app/api/pro/replace)
  ytm: number;
  duration: number;
  maturity: string | null;
};

export type Line =
  | {
      action: "swap";
      kind: "yield" | "risk";
      amount: number;
      sell: BondView;
      buy: BondView;
      ytmChange: number; // percentage points, before costs
      netYtmChange: number; // per year, after costs
      durationChange: number;
      riskBetter: number; // > 0 = lower risk score
      costPct: number;
      breakevenYears: number | null;
      rationale: string[];
    }
  | { action: "keep"; amount: number; sell: BondView; reason: string }
  | { action: "unknown"; amount: number; isin: string; reason: string };

export type PortfolioStats = { amount: number; ytm: number | null; duration: number | null; risk: number | null; largestIssuer: { issuer: string; pct: number } | null };

export type EngineResult = {
  lines: Line[];
  before: PortfolioStats;
  after: PortfolioStats;
  swaps: number;
  extraIncomePerYear: number; // EUR, before costs
  tradingCost: number; // EUR, one-off
  settings: EngineSettings;
};

export function cleanSettings(raw: unknown): EngineSettings {
  const r = (raw ?? {}) as Record<string, unknown>;
  const out = { ...DEFAULT_SETTINGS };
  for (const key of Object.keys(SETTING_LIMITS) as (keyof typeof SETTING_LIMITS)[]) {
    const n = Number(r[key]);
    if (r[key] !== undefined && r[key] !== "" && Number.isFinite(n)) out[key] = Math.min(SETTING_LIMITS[key].max, Math.max(SETTING_LIMITS[key].min, n));
  }
  if (r.mode === "yield" || r.mode === "risk" || r.mode === "both") out.mode = r.mode;
  return out;
}

const issuerOf = (b: PublicBond) => (b.issuer ?? b.name).trim();

function view(b: PublicBond): BondView {
  return {
    isin: b.isin,
    name: b.name,
    issuer: issuerOf(b),
    risk: bondRisk(b),
    ytm: b.grossYtm!,
    duration: b.modifiedDuration!,
    maturity: b.maturity,
  };
}

const pct = (n: number) => `${n.toFixed(2)}%`;
const signedPct = (n: number) => `${n >= 0 ? "+" : "−"}${Math.abs(n).toFixed(2)}%`;
const yrs = (n: number) => `${n.toFixed(1)} yrs`;

export function runEngine(holdings: Holding[], universe: PublicBond[], s: EngineSettings = DEFAULT_SETTINGS): EngineResult {
  const usable = universe.filter((b) => b.grossYtm !== null && b.modifiedDuration !== null);
  const byIsin = new Map(usable.map((b) => [b.isin, b]));
  const held = new Set(holdings.map((h) => h.isin));
  const total = holdings.reduce((sum, h) => sum + h.amount, 0);

  // Issuer exposure in EUR, updated as swaps are accepted.
  const exposure = new Map<string, number>();
  for (const h of holdings) {
    const b = byIsin.get(h.isin);
    const key = b ? issuerOf(b) : `?${h.isin}`;
    exposure.set(key, (exposure.get(key) ?? 0) + h.amount);
  }

  const usedBuys = new Set<string>();
  const lines: Line[] = new Array(holdings.length);
  // Biggest positions first: they matter most and get first pick of the alternatives.
  const order = holdings.map((h, i) => i).sort((a, b) => holdings[b].amount - holdings[a].amount);

  for (const i of order) {
    const h = holdings[i];
    const old = byIsin.get(h.isin);
    if (!old) {
      lines[i] = { action: "unknown", amount: h.amount, isin: h.isin, reason: "Not in our bond data (only euro bonds with a current yield are covered), so we cannot compare it." };
      continue;
    }
    const oldRisk = bondRisk(old);
    if (oldRisk === null) {
      lines[i] = { action: "keep", amount: h.amount, sell: view(old), reason: "This bond has no risk score in our data, so we cannot be sure an alternative has no higher credit risk." };
      continue;
    }

    const horizon = Math.max(MIN_HORIZON_YEARS, old.modifiedDuration!);
    const costPerYear = s.costPct / horizon;
    const sellIssuer = issuerOf(old);
    const sellWeight = (exposure.get(sellIssuer) ?? 0) / total;

    let best: { b: PublicBond; kind: "yield" | "risk"; score: number; net: number; notches: number } | null = null;
    let similar = 0;
    let blockedByConcentration: PublicBond | null = null;

    for (const b of usable) {
      if (held.has(b.isin) || usedBuys.has(b.isin)) continue;
      if (Math.abs(b.modifiedDuration! - old.modifiedDuration!) > s.durationTolerance) continue;
      const risk = bondRisk(b);
      if (risk === null) continue; // unknown credit risk is never a replacement
      similar++;
      const gross = b.grossYtm! - old.grossYtm!;
      const net = gross - costPerYear;
      const notches = oldRisk - risk;

      let kind: "yield" | "risk" | null = null;
      if (s.mode !== "risk" && notches >= 0 && net >= s.minPickupPct) kind = "yield";
      else if (s.mode !== "yield" && notches >= 1 && net >= -s.maxGiveUpPct) kind = "risk";
      if (!kind) continue;

      const score = net + RISK_STEP_VALUE * notches;
      if (best && score <= best.score) continue;

      // Concentration: the buy issuer may not end above the limit, unless the sold position was already that big.
      const buyIssuer = issuerOf(b);
      const after = (exposure.get(buyIssuer) ?? 0) + (buyIssuer === sellIssuer ? 0 : h.amount);
      if (after / total > Math.max(s.maxIssuerPct / 100, sellWeight) + 1e-9) {
        blockedByConcentration ??= b;
        continue;
      }
      best = { b, kind, score, net, notches };
    }

    if (!best) {
      lines[i] = { action: "keep", amount: h.amount, sell: view(old), reason: keepReason(similar, blockedByConcentration, s) };
      continue;
    }

    const { b, kind, net, notches } = best;
    usedBuys.add(b.isin);
    const buyIssuer = issuerOf(b);
    if (buyIssuer !== sellIssuer) {
      exposure.set(sellIssuer, (exposure.get(sellIssuer) ?? 0) - h.amount);
      exposure.set(buyIssuer, (exposure.get(buyIssuer) ?? 0) + h.amount);
    }
    const gross = b.grossYtm! - old.grossYtm!;
    const breakeven = gross > 0 ? s.costPct / gross : null;
    const sell = view(old);
    const buy = view(b);
    lines[i] = {
      action: "swap",
      kind,
      amount: h.amount,
      sell,
      buy,
      ytmChange: gross,
      netYtmChange: net,
      durationChange: b.modifiedDuration! - old.modifiedDuration!,
      riskBetter: notches,
      costPct: s.costPct,
      breakevenYears: breakeven,
      rationale: rationale(kind, sell, buy, gross, net, notches, breakeven, s),
    };
  }

  const finalBonds = lines.map((l, i) => {
    if (l.action === "swap") return { b: byIsin.get(l.buy.isin)!, amount: holdings[i].amount };
    if (l.action === "keep") return { b: byIsin.get(l.sell.isin)!, amount: holdings[i].amount };
    return null;
  });
  const startBonds = holdings.map((h) => (byIsin.has(h.isin) ? { b: byIsin.get(h.isin)!, amount: h.amount } : null));

  const swaps = lines.filter((l) => l.action === "swap") as Extract<Line, { action: "swap" }>[];
  return {
    lines,
    before: stats(startBonds),
    after: stats(finalBonds),
    swaps: swaps.length,
    extraIncomePerYear: swaps.reduce((sum, l) => sum + (l.amount * l.ytmChange) / 100, 0),
    tradingCost: swaps.reduce((sum, l) => sum + (l.amount * l.costPct) / 100, 0),
    settings: s,
  };
}

function keepReason(similar: number, blocked: PublicBond | null, s: EngineSettings): string {
  if (similar === 0) return `No other bond with a risk score in our data has a similar duration (within ${s.durationTolerance} years).`;
  if (blocked) return `The best alternative (${issuerOf(blocked)}) would push that issuer above ${s.maxIssuerPct}% of the portfolio, so we do not suggest it.`;
  const goals =
    s.mode === "risk"
      ? "a lower risk score at a similar yield"
      : s.mode === "yield"
        ? `at least ${pct(s.minPickupPct)} more yield a year after costs, with no higher risk score`
        : `at least ${pct(s.minPickupPct)} more yield a year after costs with no higher risk score, or a lower risk score at a similar yield`;
  return `None of the ${similar} bonds with a similar duration gives ${goals}. This bond already holds up well.`;
}

function rationale(kind: "yield" | "risk", sell: BondView, buy: BondView, gross: number, net: number, notches: number, breakeven: number | null, s: EngineSettings): string[] {
  const durDiff = buy.duration - sell.duration;
  const out: string[] = [];
  out.push(
    kind === "yield"
      ? `Higher yield for the same risk: ${pct(buy.ytm)} instead of ${pct(sell.ytm)} (${signedPct(gross)} a year).`
      : `Lower credit risk for a similar yield: risk ${buy.risk} instead of ${sell.risk}.`,
  );
  out.push(`Similar interest-rate risk: duration ${yrs(buy.duration)} vs ${yrs(sell.duration)} (${durDiff >= 0 ? "+" : "−"}${Math.abs(durDiff).toFixed(1)} yrs).`);
  out.push(
    notches > 0
      ? `Risk score improves by ${notches} ${notches === 1 ? "step" : "steps"} (${sell.risk} → ${buy.risk}).`
      : `Same risk score (${buy.risk}).`,
  );
  if (kind === "risk") out.push(`Yield ${gross >= 0 ? "also rises" : "drops only"} by ${Math.abs(gross).toFixed(2)}% a year.`);
  out.push(
    `After an assumed ${pct(s.costPct)} trading cost, the net change is ${signedPct(net)} a year` +
      (breakeven !== null ? `; the cost is earned back in about ${breakeven < 0.1 ? "a month" : yrs(breakeven).replace(" yrs", " years")}.` : "."),
  );
  if (buy.issuer !== sell.issuer) out.push(`Also spreads the portfolio over a different issuer (${buy.issuer}).`);
  return out;
}

function stats(rows: ({ b: PublicBond; amount: number } | null)[]): PortfolioStats {
  const known = rows.filter((r): r is { b: PublicBond; amount: number } => r !== null);
  const amount = known.reduce((s, r) => s + r.amount, 0);
  if (!amount) return { amount: 0, ytm: null, duration: null, risk: null, largestIssuer: null };
  const w = (f: (b: PublicBond) => number | null) => {
    const xs = known.filter((r) => f(r.b) !== null);
    const a = xs.reduce((s, r) => s + r.amount, 0);
    return a ? xs.reduce((s, r) => s + f(r.b)! * r.amount, 0) / a : null;
  };
  const risk = w((b) => bondRisk(b));
  const issuers = new Map<string, number>();
  for (const r of known) issuers.set(issuerOf(r.b), (issuers.get(issuerOf(r.b)) ?? 0) + r.amount);
  const [topIssuer, topAmount] = [...issuers.entries()].sort((a, b) => b[1] - a[1])[0];
  return {
    amount,
    ytm: w((b) => b.grossYtm),
    duration: w((b) => b.modifiedDuration),
    risk: risk === null ? null : Math.round(risk * 10) / 10,
    largestIssuer: { issuer: topIssuer, pct: (topAmount / amount) * 100 },
  };
}
