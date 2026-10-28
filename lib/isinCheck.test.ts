import { describe, expect, it } from "vitest";
import { isIsinValid } from "./isinCheck";

describe("ISIN format and check digit", () => {
  it("accepts the real ISINs we use", () => {
    for (const i of ["FR0000186413", "DE000HEL4BV8", "GR0128016731", "US054989AB41", "US263901AA85", "US0378331005"]) expect(isIsinValid(i), i).toBe(true);
  });
  it("rejects a wrong check digit, wrong length and bad characters", () => {
    for (const i of ["FR0000186414", "DE000HEL4BV9", "FR000018641", "FR00001864130", "1R0000186413", "fr0000186413", "FR-000186413", ""]) expect(isIsinValid(i), i).toBe(false);
  });
  it("accepts a well-formed ISIN that is not in our data", () => {
    expect(isIsinValid("US0378331005")).toBe(true); // checksum valid; the server then answers "not in our database"
  });
});
