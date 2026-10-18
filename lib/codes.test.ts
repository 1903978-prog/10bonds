import { describe, expect, it } from "vitest";
import { makeCode, normaliseCode } from "./codes";

describe("trial codes", () => {
  it("makes codes the redeem form accepts", () => {
    for (let i = 0; i < 50; i++) expect(normaliseCode(makeCode())).not.toBeNull();
  });
  it("accepts lower case and spaces, refuses other shapes", () => {
    expect(normaliseCode(" 10b-abcd-ef23 ")).toBe("10B-ABCD-EF23");
    expect(normaliseCode("10B-ABC0-EF23")).toBeNull();
    expect(normaliseCode("XYZ")).toBeNull();
    expect(normaliseCode(5)).toBeNull();
  });
});
