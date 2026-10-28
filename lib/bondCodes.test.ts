import { describe, expect, it } from "vitest";
import { CODE_RE, codeOf, MAX_SEQ, orderForCodes, planCodes, type BondIdentity } from "./bondCodes";

const b = (isin: string, issuer: string, name: string, currency: string, maturity = "2030-01-01"): BondIdentity => ({ isin, issuer, name, currency, maturity });

describe("bond codes", () => {
  it("first assignment is alphabetical per currency with independent sequences and an ISIN tie-break", () => {
    const plan = planCodes([b("X3", "Zeta SA", "Zeta 2030", "EUR"), b("X1", "Alpha AG", "Alpha 2031", "EUR", "2031-01-01"), b("X2", "Alpha AG", "Alpha 2031", "EUR", "2031-01-01"), b("U1", "Beta Inc", "Beta", "USD"), b("X4", "Émile SA", "E", "EUR")], {});
    expect(plan.map((p) => `${p.isin}:${p.code}`)).toEqual(["X1:EUR00001", "X2:EUR00002", "X4:EUR00003", "X3:EUR00004", "U1:USD00001"].sort((a, c) => plan.findIndex((p) => a.startsWith(p.isin + ":")) - plan.findIndex((p) => c.startsWith(p.isin + ":"))));
    expect(plan.find((p) => p.isin === "U1")!.code).toBe("USD00001");
    expect(plan.find((p) => p.isin === "X1")!.code).toBe("EUR00001");
    expect(plan.every((p) => CODE_RE.test(p.code) && p.code.startsWith(p.currency))).toBe(true);
  });
  it("same input gives the same order; later bonds continue the sequence and never reuse a number", () => {
    const all = [b("A", "Delta", "d", "EUR"), b("B", "Alpha", "a", "EUR")];
    expect(orderForCodes(all).map((x) => x.isin)).toEqual(orderForCodes([...all].reverse()).map((x) => x.isin));
    expect(planCodes([b("C", "Aardvark", "aa", "EUR")], { EUR: 2 })[0].code).toBe("EUR00003");
  });
  it("stops with an explicit message at capacity instead of making a clashing code", () => {
    expect(() => planCodes([b("Z", "Z", "z", "EUR")], { EUR: MAX_SEQ })).toThrow(/capacity/);
    expect(codeOf("EUR", 27)).toBe("EUR00027");
  });
});
