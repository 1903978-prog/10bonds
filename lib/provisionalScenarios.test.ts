import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { ALL_SCENARIOS, SCENARIOS, matchScenarios, scenarioRow, type Candidate } from "./provisionalScenarios";

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
  it("has the 20 bonds; batch 2 matches by ISIN and keeps his markers", () => {
    expect(ALL_SCENARIOS).toHaveLength(20);
    const r = matchScenarios([c("IT0005636797", "UniCredit", "2031-03-26"), c("XS2073758885", "PLN", "2031-11-04")]);
    expect(r.find((m) => m.scenario.key === "unicredit")!.isin).toBe("IT0005636797");
    expect(r.find((m) => m.scenario.key === "pln")!.problem).toBe("none");
    const u = ALL_SCENARIOS.find((s) => s.key === "unicredit")!;
    expect(u.detail).toMatchObject({ reco: "EXCLUDE", dur: "1.23†", ytm: "5.29% conditional", spread: "N/A" });
    expect(ALL_SCENARIOS.find((s) => s.key === "grenke")!.detail!.ytm).toBe("~5.00%*");
  });
  it("the data (with recommendation labels) is never imported by browser components", () => {
    for (const f of readdirSync("components").filter((x) => /\.tsx$/.test(x))) expect(readFileSync(`components/${f}`, "utf8")).not.toMatch(/lib\/provisionalScenarios/);
  });
});
