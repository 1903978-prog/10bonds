import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// "x::text day" is a syntax error in Postgres (DAY is read as an interval field), which made the admin freshness section answer "Bond data is not connected."
describe("lib/bonds.ts SQL", () => {
  it("never aliases a column with a bare `day` after a cast", () => {
    expect(readFileSync(new URL("./bonds.ts", import.meta.url), "utf8")).not.toMatch(/::\w+\s+day\b/);
  });
});
