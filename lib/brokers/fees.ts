import type { Category, FeeRule, TariffData } from "./types";

// Deterministic cost maths for one bond purchase. Everything is in euro and rounded to the cent at the end.
// Only charges published in the broker's tariff are counted. Bid-ask spreads and execution quality are
// never estimated: they are real costs, but no tariff publishes them.

const cents = (n: number) => Math.round(n * 100) / 100;

/** The fee a rule charges on an order of `amount` euro. */
export function ruleFee(rule: FeeRule, amount: number): number {
  if (!(amount > 0)) throw new Error("Order amount must be positive");
  switch (rule.type) {
    case "fixed":
      return cents(rule.fee);
    case "percent": {
      let fee = (amount * rule.pct) / 100;
      if (rule.min !== null) fee = Math.max(fee, rule.min);
      if (rule.max !== null) fee = Math.min(fee, rule.max);
      return cents(fee);
    }
    case "fixed_plus_percent": {
      let fee = rule.fee + (amount * rule.pct) / 100;
      if (rule.min !== null) fee = Math.max(fee, rule.min);
      if (rule.max !== null) fee = Math.min(fee, rule.max);
      return cents(fee);
    }
    case "tiered": {
      const tier = rule.tiers.find((t) => t.upTo === null || amount <= t.upTo);
      if (!tier) throw new Error("No tier covers this amount");
      if (tier.fee !== undefined) return cents(tier.fee);
      let fee = Math.max((amount * (tier.pct ?? 0)) / 100, tier.min ?? 0);
      if (tier.max !== undefined && tier.max !== null) fee = Math.min(fee, tier.max);
      return cents(fee);
    }
    case "marginal": {
      let fee = 0;
      let from = 0;
      for (const t of rule.tiers) {
        const to = t.upTo === null ? amount : Math.min(amount, t.upTo);
        if (to > from) fee += ((to - from) * t.pct) / 100;
        if (t.upTo === null || amount <= t.upTo) break;
        from = t.upTo;
      }
      if (rule.min !== null) fee = Math.max(fee, rule.min);
      if (rule.max !== null) fee = Math.min(fee, rule.max);
      return cents(fee);
    }
  }
}

/** Plain-language description of a rule, for tables and profiles. */
export function describeRule(rule: FeeRule, eur: (n: number) => string, pct: (n: number) => string, words: { min: string; max: string; upTo: string; above: string }): string {
  switch (rule.type) {
    case "fixed":
      return eur(rule.fee);
    case "percent":
    case "fixed_plus_percent": {
      const base = rule.type === "percent" ? pct(rule.pct) : `${eur(rule.fee)} + ${pct(rule.pct)}`;
      const parts = [base];
      if (rule.min !== null) parts.push(`${words.min} ${eur(rule.min)}`);
      if (rule.max !== null) parts.push(`${words.max} ${eur(rule.max)}`);
      return parts.join(", ");
    }
    case "marginal": {
      const parts = rule.tiers.map((t, i) => (t.upTo === null ? `${pct(t.pct)} ${words.above}${i ? ` ${eur(rule.tiers[i - 1].upTo ?? 0)}` : ""}` : `${pct(t.pct)} ${words.upTo} ${eur(t.upTo)}`));
      if (rule.min !== null) parts.push(`${words.min} ${eur(rule.min)}`);
      if (rule.max !== null) parts.push(`${words.max} ${eur(rule.max)}`);
      return parts.join(", ");
    }
    case "tiered":
      return rule.tiers
        .map((t) => {
          const fee = t.fee !== undefined ? eur(t.fee) : `${pct(t.pct ?? 0)}${t.min ? `, ${words.min} ${eur(t.min)}` : ""}${t.max ? `, ${words.max} ${eur(t.max)}` : ""}`;
          return t.upTo === null ? `${words.above}: ${fee}` : `${words.upTo} ${eur(t.upTo)}: ${fee}`;
        })
        .join(" · ");
  }
}

export type CostStatus = "ok" | "not_offered" | "not_disclosed" | "not_eligible";

export type CostBreakdown = {
  status: CostStatus;
  amount: number;
  category: Category;
  /** 1. Broker commission. */
  commission: number | null;
  /** 2. Mandatory third-party charges (exchange / venue fees) that can be worked out from the tariff. */
  thirdParty: number;
  /** Third-party charges that are published but could not be worked out per order. */
  thirdPartyUncounted: string[];
  /** 3. Currency conversion, for bonds in another currency (one conversion, at purchase). */
  fx: number | null;
  /** Commission + counted third-party + FX. Never includes spreads. */
  total: number | null;
  /** total as a percentage of the order. */
  totalPct: number | null;
  venue: string | null;
  /** false when the commission comes from a general exchange tariff that does not name bonds. */
  bondSpecific: boolean;
};

function available(t: TariffData, c: Category): boolean | null {
  if (c === "fx_bond") return t.foreignCurrencyBonds.available;
  if (c === "eu_corp") return t.corpBonds.available;
  return t.govBonds.available;
}

/** Cost of buying `amount` euro of a bond in category `c`.
 *  When the broker offers several standard price plans or venues for the category, the cheapest one for this
 *  order size is used. Promotional rates are never used: they are shown separately with their end date. */
export function purchaseCost(t: TariffData, c: Category, amount: number): CostBreakdown {
  const empty: CostBreakdown = { status: "not_disclosed", amount, category: c, commission: null, thirdParty: 0, thirdPartyUncounted: [], fx: null, total: null, totalPct: null, venue: null, bondSpecific: true };
  if (!t.eligible) return { ...empty, status: "not_eligible" };
  const avail = available(t, c);
  if (avail === false) return { ...empty, status: "not_offered" };
  // A tiered tariff may stop at a published ceiling (e.g. up to 50,000 euro): larger orders count as not disclosed.
  const covers = (r: FeeRule) => r.type !== "tiered" || r.tiers.some((x) => x.upTo === null || amount <= x.upTo);
  const options = t.commissions.filter((s) => s.appliesTo.includes(c) && !s.promo && covers(s.rule) && (!s.venueFee || covers(s.venueFee)));
  if (options.length === 0 || avail === null) return empty;
  const price = (s: (typeof options)[number]) => ruleFee(s.rule, amount) + (s.venueFee ? ruleFee(s.venueFee, amount) : 0);
  // Prefer venues whose charges are fully published, so an unquantified charge never looks like a saving.
  const known = options.filter((s) => !s.venueFeeUncounted);
  const schedule = (known.length ? known : options).reduce((best, s) => (price(s) < price(best) ? s : best));
  const commission = ruleFee(schedule.rule, amount);
  let thirdParty = schedule.venueFee ? ruleFee(schedule.venueFee, amount) : 0;
  const thirdPartyUncounted: string[] = schedule.venueFeeUncounted ? [schedule.venueFeeUncounted] : [];
  for (const f of t.thirdPartyFees) {
    if (!f.appliesTo.includes(c)) continue;
    if (f.rule && covers(f.rule)) thirdParty += ruleFee(f.rule, amount);
    else thirdPartyUncounted.push(f.description);
  }
  let fx: number | null = 0;
  if (c === "fx_bond") fx = t.fxFee.pct === null ? null : cents((amount * t.fxFee.pct) / 100);
  if (fx === null) return { ...empty, commission, thirdParty: cents(thirdParty), thirdPartyUncounted, venue: schedule.venue, bondSpecific: schedule.bondSpecific };
  const total = cents(commission + thirdParty + fx);
  return {
    status: "ok",
    amount,
    category: c,
    commission,
    thirdParty: cents(thirdParty),
    thirdPartyUncounted,
    fx,
    total,
    totalPct: Math.round((total / amount) * 100000) / 1000,
    venue: schedule.venue,
    bondSpecific: schedule.bondSpecific,
  };
}
