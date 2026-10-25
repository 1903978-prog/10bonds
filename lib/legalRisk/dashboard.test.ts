import { describe, expect, it } from "vitest";
import { contentChecks } from "./checks";
import { buildDashboard } from "./dashboard";
import { cleanReview, isReviewed } from "./reviews";

describe("reviews", () => {
  it("a review counts only with a reviewer and a date", () => {
    expect(isReviewed(cleanReview({ reviewer: "A. Counsel, Firm", reviewedAt: "2026-10-25" })!)).toBe(true);
    expect(isReviewed(cleanReview({ reviewer: "A. Counsel" })!)).toBe(false);
    expect(isReviewed(cleanReview({ reviewedAt: "2026-10-25" })!)).toBe(false);
    expect(isReviewed(cleanReview({ reviewer: "x", reviewedAt: "yesterday" })!)).toBe(false);
  });
  it("ignores unknown tracking values", () => {
    expect(cleanReview({ tracking: "finished" })).toEqual({});
    expect(cleanReview({ tracking: "done" })).toEqual({ tracking: "done" });
  });
});

describe("dashboard data", () => {
  const d = buildDashboard({ "3": { reviewer: "A. Counsel", reviewedAt: "2026-10-25" } }, contentChecks());
  it("keeps technical status and legal review apart", () => {
    const c3 = d.criteria.find((c) => c.id === 3)!;
    expect(c3.reviewed).toBe(true);
    expect(d.criteria.filter((c) => c.reviewed)).toHaveLength(1);
    // Passing technical checks never marks a criterion as legally reviewed.
    expect(d.criteria.filter((c) => !c.review).every((c) => !c.reviewed)).toBe(true);
  });
  it("never says compliant or zero risk", () => {
    expect(/legally compliant|zero risk|fully compliant/i.test(JSON.stringify(d))).toBe(false);
    expect(d.summary.residualAverage).toBeGreaterThan(0);
  });
  it("ranks 10 top exposures", () => expect(d.summary.topIds).toHaveLength(10));
});
