import { describe, expect, it } from "vitest";
import { dropOff } from "./funnelStats";
import { EVENT_KINDS, FUNNEL, parseEventBatch } from "./trackRules";

describe("funnel", () => {
  it("computes drop-off from the previous step and from the top", () => {
    const r = dropOff({ a: 200, b: 100, c: 25, d: 0 }, ["a", "b", "c", "d", "e"]);
    expect(r.map((s) => s.fromPrevious)).toEqual([null, 50, 25, 0, null]);
    expect(r.map((s) => s.fromTop)).toEqual([null, 50, 12.5, 0, 0]);
  });
  it("every funnel step is a known event, and the new steps are accepted from the browser", () => {
    for (const k of FUNNEL) expect(EVENT_KINDS).toContain(k);
    const id = "123e4567-e89b-12d3-a456-426614174000";
    const r = parseEventBatch({ visitorId: id, events: ["pricing_viewed", "checkout_started", "paid", "consent_box"].map((kind) => ({ kind, path: "/pricing" })) });
    expect(r?.events.length).toBe(4);
  });
});
