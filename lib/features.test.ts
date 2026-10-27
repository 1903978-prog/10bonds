import { describe, expect, it } from "vitest";
import { defaultMatrix, FEATURES, featuresOf, planLines } from "./features";
import { cleanMatrix } from "./planFeatures";
import { cleanExclusion, excludedBy } from "./blacklist";
import { PRICING_TEXT } from "./pricingText";
import type { PublicBond } from "./types";

describe("plan features", () => {
  it("has 20 to 30 features, each key once", () => {
    expect(FEATURES.length).toBeGreaterThanOrEqual(20);
    expect(FEATURES.length).toBeLessThanOrEqual(40);
    expect(new Set(FEATURES.map((f) => f.key)).size).toBe(FEATURES.length);
  });
  it("ISIN search is a paid feature, apart from showing ISINs in lists", () => {
    const m = defaultMatrix();
    expect(featuresOf(m, "free")).not.toContain("isin_search");
    expect(featuresOf(m, "free")).toContain("isin");
    for (const p of ["plus", "premium", "pro"] as const) expect(featuresOf(m, p)).toContain("isin_search");
  });
  it("free sees portfolios with ISIN; the blacklist is for paying plans", () => {
    const m = defaultMatrix();
    expect(featuresOf(m, "free")).toEqual(expect.arrayContaining(["isin", "portfolio_sim"]));
    expect(featuresOf(m, "free")).not.toContain("blacklist");
    for (const p of ["plus", "premium", "pro"] as const) expect(featuresOf(m, p)).toContain("blacklist");
  });
  it("ideas not built yet never count as a feature", () => {
    const m = defaultMatrix();
    m.email_alerts.free = true;
    expect(featuresOf(m, "free")).not.toContain("email_alerts");
  });
  it("cleans a saved table: unknown rows and non-boolean cells are ignored", () => {
    const m = cleanMatrix({ isin: { free: false, plus: "yes" }, nope: { free: true } });
    expect(m.isin).toEqual({ free: false, plus: true, premium: true, pro: true });
    expect("nope" in m).toBe(false);
  });
  it("Plans page lines follow the ticks", () => {
    const t = PRICING_TEXT.en;
    const m = defaultMatrix();
    const free = planLines(m, "free", "en", t, { daily: 10 });
    expect(free).toContain("Full top 10 with ISIN, coupon, maturity");
    expect(free).toContain("10 searches a day");
    const plus = planLines(m, "plus", "en", t, { daily: 10 });
    expect(plus[0]).toBe("Everything in the free account");
    expect(plus).toContain("Excel download, bond swap and blacklist");
    expect(plus).not.toContain("Full top 10 with ISIN, coupon, maturity");
    m.full_top10.free = false;
    expect(planLines(m, "plus", "en", t, { daily: 10 })).toContain("Full top 10 with ISIN, coupon, maturity");
    for (const p of ["free", "plus", "premium", "pro"] as const) expect(planLines(defaultMatrix(), p, "en", t, { daily: 10 }).length).toBeLessThanOrEqual(7);
  });
});

describe("blacklist", () => {
  const b = (isin: string, issuer: string) => ({ isin, issuer, name: issuer }) as PublicBond;
  it("leaves out excluded bonds and every bond of an excluded issuer", () => {
    const skip = excludedBy([{ kind: "bond", value: "XS0000000001", label: "" }, { kind: "issuer", value: "Acme", label: "" }])!;
    expect(skip(b("XS0000000001", "Other"))).toBe(true);
    expect(skip(b("XS0000000002", "Acme"))).toBe(true);
    expect(skip(b("XS0000000003", "Other"))).toBe(false);
    expect(excludedBy([])).toBeNull();
  });
  it("accepts only real ISINs for bonds", () => {
    expect(cleanExclusion({ kind: "bond", value: "XS0000000001" })).toMatchObject({ kind: "bond", value: "XS0000000001" });
    expect(cleanExclusion({ kind: "bond", value: "nope" })).toBeNull();
    expect(cleanExclusion({ kind: "issuer", value: " Acme " })).toMatchObject({ value: "Acme", label: "Acme" });
    expect(cleanExclusion({ kind: "other", value: "x" })).toBeNull();
  });
});
