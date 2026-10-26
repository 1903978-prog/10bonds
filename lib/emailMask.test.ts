import { describe, expect, it } from "vitest";
import { maskEmails } from "./email";

describe("maskEmails (server log of Resend errors)", () => {
  it("hides every address and keeps the rest of the message", () => {
    const body = '{"statusCode":422,"message":"Invalid `to` field: jane.doe+x@mail.example.co.uk and BOB@Example.com"}';
    const out = maskEmails(body);
    expect(out).not.toMatch(/jane|doe|bob|example/i);
    expect(out).toContain("j***@m***.uk");
    expect(out).toContain("B***@E***.com");
    expect(out).toContain('"statusCode":422');
  });

  it("leaves text without addresses alone", () => {
    expect(maskEmails("The example.com domain is not verified")).toBe("The example.com domain is not verified");
    expect(maskEmails("")).toBe("");
  });
});
