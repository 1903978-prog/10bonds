import { describe, expect, it } from "vitest";
import { cleanParams, DEFAULT_PARAMS } from "./params";

describe("risk params", () => {
  it("falls back to the defaults", () => {
    expect(cleanParams(null)).toEqual(DEFAULT_PARAMS);
    expect(cleanParams({ maxAboveTarget: "abc", sensitivityShifts: [] })).toEqual(DEFAULT_PARAMS);
  });
  it("keeps numbers inside the allowed range and sorts the shifts", () => {
    const p = cleanParams({ maxAboveTarget: 99, outlierMinPeers: 2, peerDuration: 0.3, sensitivityShifts: [25, 0, -10, 25, 9999] });
    expect(p).toMatchObject({ maxAboveTarget: 5, outlierMinPeers: 3, peerDuration: 0.3, sensitivityShifts: [-10, 25] });
  });
});
