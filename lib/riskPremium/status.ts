// Statuses of a bond in the risk premium model (shared with the admin page in the browser).

export type RiskStatus =
  | "eligible" // passes every check and its surplus is above zero
  | "below_hurdle" // observed spread does not exceed the required spread
  | "review" // exceptional spread: always left out of the list
  | "rejected" // exceptional spread rejected by the admin
  | "below_floor" // rated below the credit floor (default BBB-)
  | "insufficient_data" // missing or unreliable yield, price date, maturity, rating or benchmark
  | "unsupported"; // the curve does not apply (government, agency, other currency, maturity, structure)

export const STATUS_LABEL: Record<RiskStatus, string> = {
  eligible: "Eligible",
  below_hurdle: "Below required compensation",
  review: "Exceptional spread: left out",
  rejected: "Exceptional spread: rejected after review",
  below_floor: "Below credit floor",
  insufficient_data: "Insufficient data",
  unsupported: "Unsupported methodology",
};
