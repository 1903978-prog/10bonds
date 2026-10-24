import { describe, expect, it } from "vitest";
import { parseResume, RESUME_MS } from "./finderResume";
import { TERMS } from "./limits";

const ok = { duration: TERMS[1].duration, mix: 12, currency: "EUR", size: "100k", mode: "portfolio", sheet: true, at: 1000 };

describe("parseResume", () => {
  it("reads back valid choices", () => {
    expect(parseResume(JSON.stringify(ok), 2000)).toEqual({ duration: TERMS[1].duration, mix: 12, currency: "EUR", size: "100k", mode: "portfolio", sheet: true });
  });
  it("expires after an hour", () => {
    expect(parseResume(JSON.stringify(ok), 1000 + RESUME_MS + 1)).toBeNull();
  });
  it("drops anything unexpected", () => {
    expect(parseResume("not json", 2000)).toBeNull();
    expect(parseResume(null, 2000)).toBeNull();
    expect(parseResume(JSON.stringify({ ...ok, mix: 31 }), 2000)).toBeNull();
    expect(parseResume(JSON.stringify({ ...ok, duration: 7.3 }), 2000)).toBeNull();
    expect(parseResume(JSON.stringify({ ...ok, currency: "GBP" }), 2000)).toBeNull();
  });
});

import { generateUsername, normaliseUsername } from "./accounts";
import { parseEventBatch } from "./trackRules";

describe("sign-up helpers", () => {
  it("makes valid, different usernames from an e-mail", () => {
    for (const e of ["anna@example.com", "a@b.co", "very.long.address.indeed.more@x.org", "ß@x.de"]) {
      const u = generateUsername(e);
      expect(normaliseUsername(u)).toBe(u);
    }
    expect(generateUsername("anna@example.com")).not.toBe(generateUsername("anna@example.com"));
  });
  it("accepts the funnel events and drops unknown ones", () => {
    const id = "123e4567-e89b-12d3-a456-426614174000";
    const r = parseEventBatch({ visitorId: id, events: [{ kind: "portfolio_generated", path: "/", detail: { device: "phone" } }, { kind: "bogus", path: "/" }] });
    expect(r?.events.map((e) => e.kind)).toEqual(["portfolio_generated"]);
  });
});
