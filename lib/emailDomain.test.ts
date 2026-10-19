import { describe, expect, it } from "vitest";
import { fromDomain } from "./email";

describe("fromDomain", () => {
  it("reads the sending domain", () => {
    expect(fromDomain("10BONDS <noreply@10bonds.com>")).toBe("10bonds.com");
    expect(fromDomain("a@B.Example.org")).toBe("b.example.org");
    expect(fromDomain("nothing")).toBeNull();
  });
});
