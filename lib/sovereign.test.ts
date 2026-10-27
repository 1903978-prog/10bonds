import { describe, expect, it } from "vitest";
import { bondLossChance, cumulativeDefault } from "./expectedLoss";
import { isSovereignBond, sovereignCumulative } from "./sovereign";

describe("sovereign default table", () => {
  it("reads the published points and interpolates between them", () => {
    expect(sovereignCumulative(8, 5)).toBeCloseTo(2.32, 9); // BBB, 5y
    expect(sovereignCumulative(8, 6)).toBeCloseTo((2.32 + 3.17) / 2, 9);
    expect(sovereignCumulative(0, 10)).toBe(0);
    expect(sovereignCumulative(17, 7)).toBeCloseTo(57.21, 9);
  });
  it("maps notches to the letter band", () => {
    expect(sovereignCumulative(1, 5)).toBe(0); // AA+
    expect(sovereignCumulative(4, 10)).toBeCloseTo(3.5, 9); // A+
    expect(sovereignCumulative(9, 5)).toBeCloseTo(2.32, 9); // BBB-
    expect(sovereignCumulative(12, 10)).toBeCloseTo(9.75, 9); // BB-
  });
  it("only governments by name use it; the corporate table is unchanged", () => {
    expect(isSovereignBond({ issuer: "Republic of Italy", isin: "IT1", country: "IT" })).toBe(true);
    expect(isSovereignBond({ issuer: "Enel SpA", isin: "XS1", country: "IT" })).toBe(false);
    expect(bondLossChance(8, 5, true)).toBeCloseTo(2.32, 9);
    expect(cumulativeDefault(8, 5)).toBeCloseTo(1.4, 9);
  });
});

describe("governments of every country", () => {
  const gov = (issuer: string) => isSovereignBond({ issuer, isin: "X", country: null });
  it("recognises governments worldwide by name", () => {
    for (const n of ["Federative Republic of Brazil", "Brazil", "Mexico", "United Mexican States", "Republic of Poland", "Romania", "Turkey", "Republic of Turkiye", "Hungary", "Colombia (Republic of)", "Republic of Uruguay", "Oman Sovereign", "People's Republic of China", "Kingdom of Saudi Arabia", "Republic of South Africa", "Republic of Korea", "Republic of Philippines", "Republic of Cote d'Ivoire", "State of Israel", "United States of America", "Czech Republic", "Republic of Peru", "Hashemite Kingdom of Jordan", "Arab Republic of Egypt"]) expect(gov(n), n).toBe(true);
  });
  it("keeps agencies, regions, supranationals, territories and companies on the corporate table", () => {
    for (const n of ["Petrobras", "Republic Services", "Georgia Power", "State of Georgia", "Hong Kong", "Puerto Rico", "European Investment Bank", "Region of Lombardy", "City of Paris", "KfW", "Bank of Mexico", "Mexico City Airport", "Pemex", "Brazil Minerals", null as unknown as string]) expect(gov(n), String(n)).toBe(false);
  });
});
