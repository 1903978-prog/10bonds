import { describe, expect, it } from "vitest";
import { SCENARIOS, matchScenarios, scenarioRow, type Candidate } from "./provisionalScenarios";

const c = (isin: string, issuer: string, maturity: string, currency = "EUR"): Candidate => ({ isin, name: issuer, issuer, currency, maturity });

describe("provisional scenarios", () => {
  it("holds the 10 bonds with the values as given", () => {
    expect(SCENARIOS).toHaveLength(10);
    const dz = SCENARIOS.find((s) => s.key === "dz")!;
    expect(dz.br).toBe("0–84");
    expect(dz.riskPay).toBe("Not quantifiable");
    expect(SCENARIOS.find((s) => s.key === "linde")!.riskPay).toBe("11.5–57.5×");
    expect(scenarioRow(dz).basis).toContain("not validated");
  });
  it("matches by issuer and exact maturity, and never guesses", () => {
    const r = matchScenarios([
      c("XS2338570331", "EQT AB", "2031-05-14"),
      c("DE000A1", "Robert Bosch GmbH", "2030-06-02"),
      c("DE000A2", "Robert Bosch GmbH", "2030-06-02"),
      c("XS9", "Linde Finance BV", "2030-10-20"),
    ]);
    expect(r.find((m) => m.scenario.key === "eqt")!.isin).toBe("XS2338570331");
    expect(r.find((m) => m.scenario.key === "bosch")!.problem).toBe("ambiguous");
    expect(r.find((m) => m.scenario.key === "linde")!.problem).toBe("none");
  });
});
