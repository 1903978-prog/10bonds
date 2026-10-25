// The landing's first slide (the owner, 25/10/2026): "Average Bond ETF vs AI portfolio" is shown at once, from this stored
// snapshot, with no request on page load and no recalculation of the 6.09%. To refresh it, copy the figures from the live
// card (/api/benchmark: ret, risk, duration and portfolio.ytm, avgRisk, duration) and update `asOf`.
export const LANDING_SNAPSHOT = {
  asOf: "2026-10-25",
  ret: 4.46,
  risk: 6,
  duration: 3.77,
  portfolio: { ytm: 6.09, avgRisk: 6.0, duration: 4.0 },
};
