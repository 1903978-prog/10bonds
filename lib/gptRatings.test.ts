import { describe, expect, it } from "vitest";
import { GPT_PROMPT, isinText, parseGptRatings } from "./gptRatings";

describe("GPT ratings (admin)", () => {
  it("copies the ISINs one per line, with the prompt on top when asked", () => {
    expect(isinText(["XS1234567890", undefined, "IT0005123456"])).toBe("XS1234567890\nIT0005123456");
    expect(isinText(["XS1234567890"], true)).toBe(`${GPT_PROMPT}\nXS1234567890`);
  });

  it("reads the format the prompt asks for, and skips the prompt's own example", () => {
    const text = ["ISIN | Rating | Basis", "XS1234567890 | BBB+ | Issuer rating, senior unsecured", "IT0005123456 | NR | No public data", GPT_PROMPT].join("\n");
    expect(parseGptRatings(text)).toEqual({
      XS1234567890: { rating: "BBB+", basis: "Issuer rating, senior unsecured" },
      IT0005123456: { rating: "NR", basis: "No public data" },
    });
  });

  it("reads a markdown table", () => {
    const text = [
      "| ISIN | Issuer | Rating |",
      "|---|---|---|",
      "| XS1234567890 | A2A SpA | **BBB+** |",
      "| IT0005123456 | Enel | Baa1 |",
      "| FR0000000001 | Unknown | n/a |",
    ].join("\n");
    expect(parseGptRatings(text)).toEqual({ XS1234567890: { rating: "BBB+", basis: null }, IT0005123456: { rating: "Baa1", basis: null } });
  });

  it("reads CSV, tab tables and plain lines", () => {
    expect(parseGptRatings('ISIN,Rating,Basis\nXS1234567890,"A-",Strong bank\nDE000A1B2C38\tA\nXS0000000017 - Telecom Italia: rated BB- (S&P)')).toEqual({
      XS1234567890: { rating: "A-", basis: "Strong bank" },
      DE000A1B2C38: { rating: "A", basis: null },
      XS0000000017: { rating: "BB-", basis: null },
    });
  });
});
