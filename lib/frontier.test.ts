import { describe, expect, it } from "vitest";
import { frontierOf } from "./frontier";
import { rankBonds } from "./ranking";
import { bondRisk } from "./ratings";
import { SAMPLE_BONDS } from "./sample-bonds";

describe("efficient frontier chart", () => {
  it("dots every rated bond and marks exactly the bonds of the 5-year, risk-5 search", () => {
    const eur = SAMPLE_BONDS.filter((b) => b.currency === "EUR");
    const f = frontierOf(eur);
    expect(f.dots).toHaveLength(eur.filter((b) => bondRisk(b) !== null && b.grossYtm !== null).length);
    const want = rankBonds(eur, 5, Number.MAX_VALUE, undefined, 5).results;
    expect(f.picks).toHaveLength(want.length);
    for (const i of f.picks) expect(f.dots[i][0]).toBeLessThanOrEqual(5);
  });
});
