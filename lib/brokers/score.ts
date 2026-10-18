import { purchaseCost } from "./fees";
import { SCENARIOS, type Category, type Methodology, type TariffData } from "./types";

// The published comparison methodology. Each criterion is scored 0-100 from tariff facts only, then
// combined with the methodology weights. It takes no commercial input: affiliate deals and sponsored
// placements are not even passed in, so they cannot move a score.

export type Criteria = { cost: number; range: number; access: number; transparency: number; platform: number };
export type Scored = { brokerId: string; criteria: Criteria; overall: number };

/** Categories that drive the cost score: the country's own government bonds and euro corporate bonds. */
export const COST_CATEGORIES: Category[] = ["domestic_gov", "eu_corp"];

/** Fields whose official confirmation counts toward transparency. */
export const KEY_FIELDS = ["commissions", "thirdPartyFees", "custodyFee", "accountFee", "fxFee", "govBonds", "corpBonds", "tariffDocUrl"] as const;

const round1 = (n: number) => Math.round(n * 10) / 10;

export function rangeScore(t: TariffData): number {
  let s = 0;
  if (t.govBonds.available) s += 30;
  if (t.commissions.some((c) => c.appliesTo.includes("eu_gov")) && t.govBonds.available) s += 20;
  if (t.corpBonds.available) s += 30;
  if (t.foreignCurrencyBonds.available) s += 20;
  return s;
}

export function accessScore(t: TariffData): number {
  if (!t.eligible) return 0;
  let s = t.taxAgent.value === true ? 70 : t.taxAgent.value === null ? 25 : 0;
  if (t.accountFee.annualEur === 0 && t.custodyFee.annualEur === 0) s += 30;
  return s;
}

export function transparencyScore(t: TariffData): number {
  const missing = KEY_FIELDS.filter((f) => t.unverified.some((u) => u === f || u.startsWith(`${f}.`))).length;
  let s = (100 * (KEY_FIELDS.length - missing)) / KEY_FIELDS.length;
  if (!t.tariffDocUrl) s = Math.min(s, 50);
  return round1(s);
}

export function platformScore(t: TariffData): number {
  const n = new Set(t.venues.map((v) => v.toLowerCase())).size;
  return n === 0 ? 0 : Math.min(100, 20 + n * 20);
}

/** Cost: for each standard order and category, 100 for the cheapest broker, 0 for the dearest, linear between.
 *  A broker with no published cost (or no access) for a cell gets 0 for that cell. */
export function costScores(rows: { brokerId: string; data: TariffData }[]): Record<string, number> {
  const totals: Record<string, number[]> = {};
  for (const r of rows) totals[r.brokerId] = [];
  for (const c of COST_CATEGORIES)
    for (const amount of SCENARIOS) {
      const costs = rows.map((r) => ({ id: r.brokerId, cost: purchaseCost(r.data, c, amount) }));
      const ok = costs.filter((x) => x.cost.status === "ok").map((x) => x.cost.total as number);
      const lo = Math.min(...ok);
      const hi = Math.max(...ok);
      for (const x of costs) {
        let s = 0;
        if (x.cost.status === "ok") s = hi === lo ? 100 : (100 * (hi - (x.cost.total as number))) / (hi - lo);
        totals[x.id].push(s);
      }
    }
  return Object.fromEntries(Object.entries(totals).map(([id, v]) => [id, round1(v.reduce((a, b) => a + b, 0) / v.length)]));
}

/** Scores and orders the eligible brokers of one country, best first; ties keep alphabetical order. */
export function scoreCountry(rows: { brokerId: string; data: TariffData }[], m: Methodology): Scored[] {
  const eligible = rows.filter((r) => r.data.eligible);
  const cost = costScores(eligible);
  const w = m.weights;
  const sum = w.cost + w.range + w.access + w.transparency + w.platform || 1;
  return eligible
    .map((r) => {
      const criteria: Criteria = {
        cost: cost[r.brokerId],
        range: rangeScore(r.data),
        access: accessScore(r.data),
        transparency: transparencyScore(r.data),
        platform: platformScore(r.data),
      };
      const overall = round1(
        (criteria.cost * w.cost + criteria.range * w.range + criteria.access * w.access + criteria.transparency * w.transparency + criteria.platform * w.platform) / sum,
      );
      return { brokerId: r.brokerId, criteria, overall };
    })
    .sort((a, b) => b.overall - a.overall || a.brokerId.localeCompare(b.brokerId));
}
