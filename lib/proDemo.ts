// Demo for the Pro page: a FICTIONAL client portfolio and fictional bonds (no real issuers, ISINs or prices), run through the
// same kind of rules the engine applies: similar duration, a net yield gain after round-trip cost, same or better rating.

export const DEMO_COST_PCT = 0.3; // round-trip cost, % of the amount, spread over the duration
export const DEMO_MIN_GAIN = 0.15; // % a year, after cost
export const DEMO_MAX_DURATION_GAP = 0.5; // years

export type DemoBond = { name: string; amount: number; yield: number; duration: number; risk: number };
export type DemoAlt = DemoBond & { for: string };
export type DemoLine =
  | { action: "keep"; held: DemoBond; why: string }
  | { action: "replace"; held: DemoBond; alt: DemoBond; netGain: number; why: string };

export const DEMO_HELD: DemoBond[] = [
  { name: "Alpine Utilities 4.25% 2031", amount: 200000, yield: 3.4, duration: 4.6, risk: 4 },
  { name: "Northern Rail Holdings 3.9% 2030", amount: 150000, yield: 3.1, duration: 3.8, risk: 3 },
  { name: "Meridian Telecom 4.75% 2032", amount: 150000, yield: 4.2, duration: 5.4, risk: 6 },
  { name: "Harbour Retail Group 5.1% 2029", amount: 100000, yield: 4.0, duration: 3.1, risk: 6 },
  { name: "Castello Energy 3.6% 2031", amount: 200000, yield: 3.3, duration: 4.9, risk: 4 },
];

export const DEMO_POOL: DemoAlt[] = [
  { for: "Alpine Utilities 4.25% 2031", name: "Vale Power 4.5% 2031", amount: 0, yield: 3.95, duration: 4.7, risk: 4 },
  { for: "Meridian Telecom 4.75% 2032", name: "Aurora Mobile 4.9% 2032", amount: 0, yield: 4.25, duration: 5.3, risk: 6 },
  { for: "Harbour Retail Group 5.1% 2029", name: "Lakeside Foods 4.4% 2029", amount: 0, yield: 4.8, duration: 3.2, risk: 5 },
  { for: "Northern Rail Holdings 3.9% 2030", name: "Delta Ports 3.8% 2030", amount: 0, yield: 3.2, duration: 3.9, risk: 3 },
];

/** Net yield gain a year after the round-trip cost spread over the duration. */
export const netGain = (held: DemoBond, alt: DemoBond) => Math.round((alt.yield - held.yield - DEMO_COST_PCT / alt.duration) * 100) / 100;

export function runDemo(held = DEMO_HELD, pool = DEMO_POOL): DemoLine[] {
  return held.map((h): DemoLine => {
    const alt = pool.find((p) => p.for === h.name);
    if (!alt) return { action: "keep", held: h, why: "No alternative found within the duration and rating limits." };
    const gain = netGain(h, alt);
    if (Math.abs(alt.duration - h.duration) > DEMO_MAX_DURATION_GAP) return { action: "keep", held: h, why: "The alternative’s duration is too different." };
    if (alt.risk > h.risk) return { action: "keep", held: h, why: "The alternative has a higher risk level." };
    if (gain < DEMO_MIN_GAIN) return { action: "keep", held: h, why: `Net gain of ${gain.toFixed(2)}% a year is below the ${DEMO_MIN_GAIN}% threshold.` };
    return { action: "replace", held: h, alt: { ...alt, amount: h.amount }, netGain: gain, why: `Same or lower risk level, duration within ${DEMO_MAX_DURATION_GAP} years, net gain ${gain.toFixed(2)}% a year after the ${DEMO_COST_PCT}% round-trip cost.` };
  });
}

/** Value-weighted yield of the portfolio before and after applying every replacement. */
export function demoTotals(lines = runDemo()) {
  const total = lines.reduce((a, l) => a + l.held.amount, 0);
  const before = lines.reduce((a, l) => a + l.held.amount * l.held.yield, 0) / total;
  const after = lines.reduce((a, l) => a + l.held.amount * (l.action === "replace" ? l.alt.yield : l.held.yield), 0) / total;
  return { total, before: Math.round(before * 100) / 100, after: Math.round(after * 100) / 100 };
}
