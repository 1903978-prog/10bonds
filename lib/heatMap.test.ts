import { describe, expect, it } from "vitest";
import { HEAT_HORIZONS, HEAT_YTMS, heatColumn, heatMapOf } from "./heatMap";
import { bandOf } from "@/components/HeatMapChart";

describe("risk heat map", () => {
  it("has 18 returns from 3.0% to 6.4% and the slider horizons", () => {
    expect(HEAT_YTMS).toHaveLength(18);
    expect(HEAT_YTMS[0]).toBe(3);
    expect(HEAT_YTMS[17]).toBe(6.4);
    expect(HEAT_HORIZONS).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 20, 25, 30]);
  });

  it("takes the lowest-loss list reaching each return, empty where none does", () => {
    const pts = [{ ytm: 3.5, el: 0.05 }, { ytm: 4.1, el: 0.3 }];
    const col = heatColumn({ at: (t) => (pts.find((p) => p.ytm >= t - 1e-9) as never) ?? null }, [3, 3.6, 4.2]);
    expect(col).toEqual([0.05, 0.3, null]);
    const map = heatMapOf([col, [1, 2, 3]], [5, 6], [3, 3.6, 4.2]);
    expect(map.cells).toEqual([[0.05, 1], [0.3, 2], [null, 3]]);
  });

  it("colours 0-0.1% dark green and very high losses dark red", () => {
    expect(bandOf(0).bg).toBe(bandOf(0.1).bg);
    expect(bandOf(0.11).bg).not.toBe(bandOf(0.1).bg);
    expect(bandOf(9).bg).toBe("#8b1a12");
  });
});
