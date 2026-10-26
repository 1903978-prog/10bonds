import { describe, expect, it } from "vitest";
import { diversification } from "./diversification";

const ten = (f: (i: number) => { sector: string | null; country: string | null }) => Array.from({ length: 10 }, (_, i) => f(i));

describe("diversification score", () => {
  it("is 100 when every bond has its own industry and country", () => {
    expect(diversification(ten((i) => ({ sector: `S${i}`, country: `C${i}` })))?.score).toBe(100);
  });
  it("is 0 when all bonds share one industry and one country", () => {
    expect(diversification(ten(() => ({ sector: "Financials", country: "IT" })))?.score).toBe(0);
  });
  it("averages the two dimensions", () => {
    const d = diversification(ten((i) => ({ sector: "Financials", country: `C${i}` })))!;
    expect(d.industryScore).toBe(0);
    expect(d.countryScore).toBe(100);
    expect(d.score).toBe(50);
  });
  it("treats missing data as one shared group", () => {
    expect(diversification(ten(() => ({ sector: null, country: null })))?.score).toBe(0);
  });
  it("gives 5 groups of 2 a score of 44", () => {
    // H = 5 × 0.2² = 0.2, N = 5, (5 − 1) ÷ 9 = 44.4
    const d = diversification(ten((i) => ({ sector: `S${i % 5}`, country: `S${i % 5}` })))!;
    expect(d.score).toBe(44);
  });
  it("needs at least two bonds", () => {
    expect(diversification([{ sector: "A", country: "B" }])).toBeNull();
  });
});
