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

/** A few words for a table cell: for "unsupported", why the curve does not apply. The full reason stays in the tooltip. */
export function shortStatus(status: RiskStatus, reason: string | null): string {
  if (status !== "unsupported" || !reason) return STATUS_LABEL[status];
  if (reason.startsWith("Government")) return "Government bond";
  if (reason.startsWith("Agency")) return "Agency / public issuer";
  if (reason.startsWith("Curve is")) return "Not EUR";
  if (reason.startsWith("Possible")) return "Possible subordinated";
  if (reason.startsWith("Maturity")) return reason.replace(" curve", "");
  return STATUS_LABEL[status];
}
