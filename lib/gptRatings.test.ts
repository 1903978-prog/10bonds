import { describe, expect, it } from "vitest";
import { GPT_PROMPT, isinText, parseGptRatings } from "./gptRatings";

describe("GPT ratings (admin)", () => {
  it("copies the ISINs one per line, with the prompt on top when asked", () => {
    expect(isinText(["XS1234567890", undefined, "IT0005123456"])).toBe("XS1234567890\nIT0005123456");
    expect(isinText(["XS1234567890"], true)).toBe(`${GPT_PROMPT}\n\nXS1234567890`);
  });

  it("reads a markdown table", () => {
    const text = [
      "| ISIN | Issuer | Rating |",
      "|---|---|---|",
      "| XS1234567890 | A2A SpA | **BBB+** |",
      "| IT0005123456 | Enel | Baa1 |",
      "| FR0000000001 | Unknown | n/a |",
    ].join("\n");
    expect(parseGptRatings(text)).toEqual({ XS1234567890: "BBB+", IT0005123456: "Baa1" });
  });

  it("reads tab tables and plain lines", () => {
    expect(parseGptRatings("DE000A1B2C38\tBASF\tA\nXS0000000017 - Telecom Italia: rated BB- (S&P)")).toEqual({ DE000A1B2C38: "A", XS0000000017: "BB-" });
  });
});
