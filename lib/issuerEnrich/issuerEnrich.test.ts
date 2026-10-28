import { describe, expect, it } from "vitest";
import { sectorOfSic } from "./sic";
import { sectorOfName } from "./nameRules";
import { ENRICHED } from "./data";
import { groupInfo } from "../issuerGroups";
import { issuerKey } from "../ranking";

describe("SIC to sector", () => {
  it("maps typical codes", () => {
    expect(sectorOfSic(1311)).toBe("Energy");
    expect(sectorOfSic("4911")).toBe("Utilities");
    expect(sectorOfSic(4922)).toBe("Energy");
    expect(sectorOfSic(2834)).toBe("Health care");
    expect(sectorOfSic(3674)).toBe("Technology");
    expect(sectorOfSic(6022)).toBe("Financials");
    expect(sectorOfSic(4813)).toBe("Communication services");
    expect(sectorOfSic(0)).toBeNull();
  });
});

describe("name rules", () => {
  it("sovereigns, supranationals, banks, utilities, captives", () => {
    expect(sectorOfName("Indonesia")).toBe("Government & agencies");
    expect(sectorOfName("IBRD")).toBe("Government & agencies");
    expect(sectorOfName("FEDERAL FARM CREDIT")).toBe("Government & agencies");
    expect(sectorOfName("Banco Santander")).toBe("Financials");
    expect(sectorOfName("Pacific Gas & Electric Company")).toBe("Utilities");
    expect(sectorOfName("Toyota Credit")).toBe("Consumer discretionary");
    expect(sectorOfName("Apple")).toBeNull();
  });
});

describe("groupInfo uses enrichment only when the table has no entry", () => {
  it("applies sector and parent group", () => {
    const k = issuerKey({ issuer: "Zzz Test Sub", isin: "XS0000000000" });
    ENRICHED[k] = { sector: "Utilities", parent: "zzz test parent" };
    try {
      const g = groupInfo({ issuer: "Zzz Test Sub", isin: "XS0000000000" });
      expect(g.sector).toBe("Utilities");
      expect(g.group).toBe("zzz test parent");
    } finally { delete ENRICHED[k]; }
  });
});
