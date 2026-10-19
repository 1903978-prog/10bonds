import { describe, expect, it } from "vitest";
import { dropDominated } from "./curveFilter";
import type { CurvePoint } from "./singleBond";

const pt = (level: number, ytm: number | null) => ({ level, label: String(level), ytm, options: [], more: 0 }) as unknown as CurvePoint;

describe("dropDominated", () => {
  it("hides a riskier step that yields no more than a safer one", () => {
    const out = dropDominated([pt(1, 4.4), pt(2, 4.3), pt(3, 4.7), pt(7, null), pt(8, 11.8), pt(9, 2.9)]);
    expect(out.map((p) => p.level)).toEqual([1, 3, 7, 8]);
  });
});
