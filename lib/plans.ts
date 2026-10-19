/** Paid plan prices, in euro cents, VAT included. Yearly = 12 months less 20%. Safe to import in the browser. */
export type PaidPlan = "plus" | "premium" | "pro";
export const PAID_PLANS: PaidPlan[] = ["plus", "premium", "pro"];
export type Interval = "month" | "year";
export const YEARLY_DISCOUNT = 0.2;
export const MONTHLY_CENTS: Record<PaidPlan, number> = { plus: 900, premium: 1900, pro: 8900 };
export const yearlyCents = (plan: PaidPlan) => Math.round(MONTHLY_CENTS[plan] * 12 * (1 - YEARLY_DISCOUNT));
export const priceCents = (plan: PaidPlan, interval: Interval) => (interval === "year" ? yearlyCents(plan) : MONTHLY_CENTS[plan]);
export const PLAN_NAMES: Record<PaidPlan, string> = { plus: "Plus", premium: "Premium", pro: "Pro" };

/** "€9", "€86.40", "€854.40" (or "86,40 €" in it/fr/de). Whole euros without decimals. */
export function euro(cents: number, lang: "en" | "it" | "fr" | "de" = "en"): string {
  const whole = cents % 100 === 0;
  const n = (cents / 100).toLocaleString(lang === "en" ? "en-GB" : lang, { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 });
  return lang === "en" ? `€${n}` : `${n} €`;
}
export const isPaidPlan = (x: unknown): x is PaidPlan => x === "plus" || x === "premium" || x === "pro";
export const isInterval = (x: unknown): x is Interval => x === "month" || x === "year";
