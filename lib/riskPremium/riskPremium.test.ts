import { describe, expect, it } from "vitest";
import type { PublicBond } from "../types";
import { CURVE_RATINGS, curveProblems, getRequiredSpread, getRequiredYieldDifference, V1_CURVE, V1_PREMIUMS, type CurveConfig } from "./curve";
import { bundCurve, bundYieldAt } from "./benchmark";
import { evaluateBond, type EvalContext } from "./evaluate";
import { compareBonds, explainPair } from "./compare";
import { rankRiskAdjusted } from "./rank";
import { activate, activeOf, draftFrom, type CurveVersion } from "./versions";

// The mandatory examples of the specification (Livio, 20/10/2026), one test each, plus the building blocks.

const AS_OF = "2026-10-19T00:00:00.000Z";
const inYears = (y: number) => new Date(Date.parse(AS_OF) + y * 365.25 * 86_400_000).toISOString().slice(0, 10);

let n = 0;
function bond(issuer: string, rating: string | null, ytm: number, o: Partial<PublicBond> & { years?: number } = {}): PublicBond {
  const years = o.years ?? 5;
  n++;
  return {
    isin: o.isin ?? `XS${String(n).padStart(10, "0")}`,
    name: o.name ?? `${issuer} ${ytm}% ${inYears(years).slice(0, 4)}`,
    issuer,
    country: o.country ?? "NL",
    currency: o.currency ?? "EUR",
    coupon: 3,
    maturity: o.maturity === undefined ? inYears(years) : o.maturity,
    ratingSp: rating,
    ratingMoodys: null,
    ratingFitch: null,
    ratingResolved: rating,
    grossYtm: ytm,
    modifiedDuration: o.modifiedDuration ?? years * 0.9,
    ytmAsOf: o.ytmAsOf ?? AS_OF,
  };
}

// A flat Bund curve at 2.50%, so a bond's spread is its yield minus 2.50%.
const BUNDS = [
  bond("Bundesrepublik Deutschland", "AAA", 2.5, { years: 2, isin: "DE0000000001", country: "DE" }),
  bond("Bundesrepublik Deutschland", "AAA", 2.5, { years: 9, isin: "DE0000000002", country: "DE" }),
];
const ctx = (curve: CurveConfig = V1_CURVE, extra: Partial<EvalContext> = {}): EvalContext => ({ curve, bund: bundCurve(BUNDS, AS_OF), asOf: AS_OF, ...extra });
const ev = (b: PublicBond, c = ctx()) => evaluateBond(b, c);
const pair = (a: PublicBond, b: PublicBond) => {
  const r = compareBonds(ev(a), ev(b));
  if (!r.comparable) throw new Error(r.reason);
  return r;
};

describe("building blocks", () => {
  it("required spreads and differences come from the curve, in bp", () => {
    expect(getRequiredSpread("AA-", V1_CURVE)).toBe(50);
    expect(getRequiredSpread("Baa1", V1_CURVE)).toBe(95); // Moody's spelling maps to BBB+
    expect(getRequiredYieldDifference("AA-", "BBB+", V1_CURVE)).toBe(45);
    expect(getRequiredYieldDifference("A", "BBB", V1_CURVE)).toBe(55);
    expect(getRequiredYieldDifference("AAA", "BBB", V1_CURVE)).toBe(80);
    expect(getRequiredYieldDifference("AA-", "BBB-", V1_CURVE)).toBe(115);
    expect(getRequiredSpread("B+", V1_CURVE)).toBeNull();
  });
  it("Bund benchmark is interpolated by maturity and never extrapolated", () => {
    const c = bundCurve([bond("Bundesrepublik Deutschland", "AAA", 2.0, { years: 2, isin: "DE1", country: "DE" }), bond("Bundesrepublik Deutschland", "AAA", 3.0, { years: 6, isin: "DE2", country: "DE" })], AS_OF);
    expect(bundYieldAt(c, 4)).toBeCloseTo(2.5, 2);
    expect(bundYieldAt(c, 10)).toBeNull();
    expect(bundYieldAt(c, 1)).toBeNull();
  });
  it("risk-adjusted yield is an internal score: yield minus the required premium in percentage points", () => {
    const e = ev(bond("Alpha Corp", "AA-", 4.0));
    expect(e.requiredBp).toBe(50);
    expect(e.riskAdjustedYtm).toBe(3.5);
    expect(e.spreadBp).toBe(150);
    expect(e.surplusBp).toBe(100);
  });
  it("the explanation uses risk scores and plain words", () => {
    const text = explainPair(pair(bond("Alpha Corp", "AA-", 4.0), bond("Beta Corp", "BBB+", 4.3)), (e) => (e.notch === 3 ? 2 : 4));
    expect(text).toContain("0.30%");
    expect(text).toContain("below the 0.45% minimum");
    expect(text).not.toMatch(/\bBBB|\bAA-/);
  });
});

describe("mandatory examples", () => {
  it("1: AA- 4.00% vs BBB+ 4.30%: 30 bp extra < 45 bp required, AA- preferred", () => {
    const r = pair(bond("Alpha Corp", "AA-", 4.0), bond("Beta Corp", "BBB+", 4.3));
    expect(r.requiredBp).toBe(45);
    expect(r.actualBp).toBe(30);
    expect(r.preferred.rating).toBe("AA-");
  });
  it("2: AA- 4.00% vs BBB+ 4.50%: 50 bp > 45 bp, BBB+ passes", () => {
    const r = pair(bond("Alpha Corp", "AA-", 4.0), bond("Beta Corp", "BBB+", 4.5));
    expect(r.actualBp).toBe(50);
    expect(r.lowerPasses).toBe(true);
    expect(r.preferred.rating).toBe("BBB+");
  });
  it("3: exact equality (4.45%): AA- preferred as the higher-quality bond", () => {
    const r = pair(bond("Alpha Corp", "AA-", 4.0), bond("Beta Corp", "BBB+", 4.45));
    expect(r.actualBp).toBe(45);
    expect(r.lowerPasses).toBe(false);
    expect(r.preferred.rating).toBe("AA-");
    // The ranking agrees: equal surplus, higher rating first.
    const { results } = rankRiskAdjusted([...BUNDS, bond("Beta Corp", "BBB+", 4.45), bond("Alpha Corp", "AA-", 4.0)], 4.5, 3.5, ctx());
    expect(results.map((b) => b.risk.rating)).toEqual(["AA-", "BBB+"]);
  });
  it("4: AAA 3.50% vs BBB 4.10%: 60 bp < 80 bp, AAA preferred", () => {
    const r = pair(bond("Alpha Corp", "AAA", 3.5), bond("Beta Corp", "BBB", 4.1));
    expect(r.requiredBp).toBe(80);
    expect(r.actualBp).toBe(60);
    expect(r.preferred.rating).toBe("AAA");
  });
  it("5: AAA 3.50% vs BBB 4.50%: 100 bp > 80 bp, BBB passes", () => {
    const r = pair(bond("Alpha Corp", "AAA", 3.5), bond("Beta Corp", "BBB", 4.5));
    expect(r.actualBp).toBe(100);
    expect(r.preferred.rating).toBe("BBB");
  });
  it("6: risk-adjusted scores 3.50 / 3.35 / 3.55 rank BBB, AA-, BBB+", () => {
    const a = bond("Alpha Corp", "AA-", 4.0), b = bond("Beta Corp", "BBB+", 4.3), c = bond("Gamma Corp", "BBB", 4.7);
    expect([ev(a), ev(b), ev(c)].map((e) => e.riskAdjustedYtm)).toEqual([3.5, 3.35, 3.55]);
    const { results } = rankRiskAdjusted([...BUNDS, a, b, c], 4.5, 3.5, ctx());
    expect(results.map((r) => r.risk.rating)).toEqual(["BBB", "AA-", "BBB+"]);
  });
  it("7: BBB- with a 498 bp spread (surplus 333 bp) needs an exceptional spread review", () => {
    const cit = bond("Cit Corp", "BBB-", 2.5 + 4.98);
    const e = ev(cit);
    expect(e.spreadBp).toBe(498);
    expect(e.requiredBp).toBe(165);
    expect(e.surplusBp).toBe(333);
    expect(e.status).toBe("review");
    const { results } = rankRiskAdjusted([...BUNDS, cit, bond("Alpha Corp", "A", 4.0)], 4.5, 3.5, ctx());
    expect(results.map((r) => r.issuer)).toEqual(["Alpha Corp"]);
    // Approved by the admin: it may rank; rejected: it stays out.
    expect(ev(cit, ctx(V1_CURVE, { reviews: new Map([[cit.isin, "approved"]]) })).status).toBe("eligible");
    expect(ev(cit, ctx(V1_CURVE, { reviews: new Map([[cit.isin, "rejected"]]) })).status).toBe("rejected");
  });
  it("8: investment-grade floor: BB+ at 8% is ineligible, A at 4% is not", () => {
    const hy = bond("Junk Corp", "BB+", 8), a = bond("Alpha Corp", "A", 4);
    expect(ev(hy).status).toBe("below_floor");
    const { results } = rankRiskAdjusted([...BUNDS, hy, a], 4.5, 3.5, ctx());
    expect(results.map((r) => r.issuer)).toEqual(["Alpha Corp"]);
  });
  it("9: no verified rating: insufficient credit assessment, no rating or premium assigned", () => {
    const e = ev(bond("Nora Corp", null, 4.2));
    expect(e.status).toBe("insufficient_data");
    expect(e.reason).toMatch(/rating/i);
    expect(e.rating).toBeNull();
    expect(e.requiredBp).toBeNull();
    expect(e.surplusBp).toBeNull();
  });
  it("10: different maturities are not compared on raw yield", () => {
    const wide = { ...V1_CURVE, minMaturity: 3, maxMaturity: 8 };
    const short = bond("Alpha Corp", "AA-", 3.6, { years: 3.5 }), long = bond("Beta Corp", "BBB+", 4.6, { years: 7.5 });
    // Without a Bund benchmark: not comparable at all.
    const noBench = compareBonds(evaluateBond(short, { curve: wide, bund: bundCurve([], AS_OF), asOf: AS_OF }), evaluateBond(long, { curve: wide, bund: bundCurve([], AS_OF), asOf: AS_OF }));
    expect(noBench.comparable).toBe(false);
    // With one: compared on spreads over the maturity-matched Bund, not raw yields.
    const c = { curve: wide, bund: bundCurve([bond("Bundesrepublik Deutschland", "AAA", 2.0, { years: 2, isin: "DE1", country: "DE" }), bond("Bundesrepublik Deutschland", "AAA", 3.0, { years: 9, isin: "DE2", country: "DE" })], AS_OF), asOf: AS_OF };
    const r = compareBonds(evaluateBond(short, c), evaluateBond(long, c));
    if (!r.comparable) throw new Error(r.reason);
    expect(r.method).toBe("benchmark");
    expect(r.actualBp).not.toBe(100); // raw yield gap would be 100 bp
    // And the default 4-6y curve does not apply to either maturity.
    expect(ev(short).status).toBe("unsupported");
    expect(ev(long).status).toBe("unsupported");
  });
  it("11: a French government bond does not get the corporate curve", () => {
    const oat = bond("French Republic", "AA-", 3.2, { country: "FR", isin: "FR0000000001" });
    const corp = bond("Alpha Corp", "AA-", 3.6, { country: "FR" });
    expect(ev(oat).status).toBe("unsupported");
    expect(ev(oat).reason).toMatch(/sovereign/);
    expect(ev(corp).status).toBe("eligible");
    const { results } = rankRiskAdjusted([...BUNDS, oat, corp], 4.5, 3.5, ctx());
    expect(results.map((r) => r.issuer)).toEqual(["Alpha Corp"]);
  });
  it("12: at most one bond per issuer", () => {
    const bonds = [...BUNDS, bond("Alpha Corp", "A", 4.4, { years: 4.6 }), bond("Alpha Corp", "A", 4.3, { years: 5 }), bond("Alpha Corp", "A", 4.2, { years: 5.4 }), bond("Beta Corp", "A", 3.9)];
    const { results } = rankRiskAdjusted(bonds, 4.5, 3.5, ctx());
    expect(results.map((r) => r.issuer)).toEqual(["Alpha Corp", "Beta Corp"]);
  });
  it("13: the user's 5y / 4% target stays in force: a 10y speculative bond at 10% does not enter", () => {
    const hy = bond("Junk Corp", "BB", 10, { years: 10.5, modifiedDuration: 8 });
    const fits = ["Alpha", "Beta", "Gamma", "Delta"].map((x, i) => bond(`${x} Corp`, "A", 3.9 + i * 0.1));
    const r = rankRiskAdjusted([...BUNDS, hy, ...fits], 5, 4, ctx());
    expect(r.results.map((b) => b.issuer)).not.toContain("Junk Corp");
    expect(r.results.length).toBe(4);
  });
  it("14: premium schedule integrity", () => {
    expect(V1_CURVE.premiums).toEqual({ AAA: 35, "AA+": 40, AA: 45, "AA-": 50, "A+": 55, A: 60, "A-": 70, "BBB+": 95, BBB: 115, "BBB-": 165, "BB+": 195, BB: 235, "BB-": 300 });
    expect(curveProblems(V1_CURVE)).toEqual([]);
    for (let i = 1; i < CURVE_RATINGS.length; i++) expect(V1_PREMIUMS[CURVE_RATINGS[i]]).toBeGreaterThan(V1_PREMIUMS[CURVE_RATINGS[i - 1]]);
    for (const a of CURVE_RATINGS) for (const b of CURVE_RATINGS) expect(getRequiredYieldDifference(a, b, V1_CURVE)).toBe(Math.abs(V1_PREMIUMS[a] - V1_PREMIUMS[b]));
    expect(curveProblems(draftFrom(V1_CURVE, { version: "1.1", premiums: { "BBB+": 40 } }))).not.toEqual([]); // not increasing
  });
  it("15: a new draft (BBB+ 105 bp) changes nothing until it is activated", () => {
    const v1: CurveVersion = { ...V1_CURVE, id: 1, status: "active", notes: null, justification: null, createdAt: AS_OF, createdBy: "seed", activatedAt: AS_OF, activatedBy: "seed" };
    const draft: CurveVersion = { ...draftFrom(v1, { version: "1.1", premiums: { "BBB+": 105 } }), id: 2, status: "draft", notes: null, justification: "test", createdAt: AS_OF, createdBy: "admin", activatedAt: null, activatedBy: null };
    const before = [v1, draft];
    const b = bond("Beta Corp", "BBB+", 4.3);
    const recorded = ev(b, ctx(activeOf(before)!));
    expect(recorded).toMatchObject({ requiredBp: 95, versionId: 1, version: "1.0" });
    const snapshot = JSON.stringify(recorded);

    const after = activate(before, 2, "admin", AS_OF);
    expect(before[0].status).toBe("active"); // inputs untouched
    expect(after.find((v) => v.id === 1)).toMatchObject({ status: "archived", premiums: { "BBB+": 95 } });
    expect(ev(b, ctx(activeOf(after)!))).toMatchObject({ requiredBp: 105, versionId: 2, version: "1.1" });
    expect(JSON.stringify(recorded)).toBe(snapshot); // the historical record is unchanged
    expect(() => activate(after, 1, "admin", AS_OF)).toThrow(/draft/);
  });
});

describe("target yield stays meaningful", () => {
  it("a lower target gives a lower-yield list; no bond far above the target", () => {
    const names = "Alpha Beta Gamma Delta Epsilon Zeta Eta Theta Iota Kappa Lambda Mu Nu Xi Omicron Pi Rho Sigma Tau Upsilon".split(" ");
    const bonds = [...BUNDS, ...names.map((x, i) => bond(`${x} Corp`, i % 2 ? "A" : "A-", 3.3 + i * 0.1))];
    const low = rankRiskAdjusted(bonds, 4.5, 3.4, ctx());
    const high = rankRiskAdjusted(bonds, 4.5, 4.2, ctx());
    const avg = (r: typeof low) => r.results.reduce((s, b) => s + b.grossYtm!, 0) / r.results.length;
    expect([low.targetReached, high.targetReached, low.results.length, high.results.length]).toEqual([true, true, 10, 10]);
    expect(avg(low)).toBeLessThan(avg(high));
    expect(avg(low)).toBeLessThanOrEqual(3.4 + 0.5 + 1e-9);
    expect(Math.max(...low.results.map((b) => b.grossYtm!))).toBeLessThanOrEqual(3.4 + 2 + 1e-9);
  });
  it("a corporate yielding well below the Bund is treated as unreliable data", () => {
    expect(ev(bond("Odd Corp", "A", 1.4)).status).toBe("insufficient_data");
  });
});
