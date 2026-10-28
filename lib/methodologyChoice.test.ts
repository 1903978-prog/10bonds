import { describe, expect, it } from "vitest";
import { engineOf, parseMethodology, usesBands } from "./methodologyChoice";

describe("methodology choice", () => {
  it("reads 1 to 5, the older admin values, and nothing else", () => {
    expect([parseMethodology("1"), parseMethodology("4"), parseMethodology("m1"), parseMethodology("spread")]).toEqual([1, 4, 1, 3]);
    expect([parseMethodology("0"), parseMethodology("6"), parseMethodology("x"), parseMethodology(null), parseMethodology("2.5")]).toEqual([null, null, null, null, null]);
  });
  it("maps each methodology to its engine", () => {
    expect([1, 2, 3, 4].map((n) => engineOf(n as 1 | 2 | 3 | 4))).toEqual(["m1", "spread", "spread", "spread"]);
    expect([1, 2, 3, 4].map((n) => usesBands(n as 1 | 2 | 3 | 4))).toEqual([false, false, true, true]);
  });
});
