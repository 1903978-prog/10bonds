import { describe, expect, it } from "vitest";
import { leftoverMachines, type FlyMachine } from "./flyLeftovers";

const m = (id: string, tag: string, state: string, checks: string[]): FlyMachine => ({ id, state, image_ref: { tag }, checks: checks.map((s, i) => ({ name: `c${i}`, status: s })) });

describe("leftoverMachines", () => {
  it("removes the stuck green machine of a cancelled release (11 Nov case)", () => {
    const r = leftoverMachines([m("d891", "old", "started", ["passing", "passing"]), m("784e", "new", "started", ["passing", "critical"])]);
    expect(r.destroy).toEqual(["784e"]);
  });
  it("does nothing when all machines share one image", () => {
    expect(leftoverMachines([m("a", "x", "started", ["passing"]), m("b", "x", "stopped", [])]).destroy).toEqual([]);
  });
  it("never removes anything when no machine is healthy", () => {
    expect(leftoverMachines([m("a", "x", "started", ["critical"]), m("b", "y", "started", ["critical"])]).destroy).toEqual([]);
  });
  it("refuses when healthy machines run different images", () => {
    expect(leftoverMachines([m("a", "x", "started", ["passing"]), m("b", "y", "started", ["passing"])]).destroy).toEqual([]);
  });
  it("never removes a healthy machine", () => {
    const r = leftoverMachines([m("a", "x", "started", ["passing"]), m("b", "x", "started", ["passing"]), m("c", "y", "stopped", [])]);
    expect(r.destroy).toEqual(["c"]);
  });
});
