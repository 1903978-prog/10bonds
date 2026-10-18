import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { formEncode, PLANS, readSubscription, verifySignature } from "./stripe";

const sign = (payload: string, secret: string, t: number) => `t=${t},v1=${createHmac("sha256", secret).update(`${t}.${payload}`).digest("hex")}`;

describe("formEncode", () => {
  it("writes nested objects and arrays the way Stripe reads them", () => {
    const s = formEncode({ mode: "subscription", line_items: [{ price: "p_1", quantity: 1 }], metadata: { user_id: 7 }, allow: true }).toString();
    expect(decodeURIComponent(s)).toBe("mode=subscription&line_items[0][price]=p_1&line_items[0][quantity]=1&metadata[user_id]=7&allow=true");
  });
});

describe("verifySignature", () => {
  const secret = "whsec_test";
  const body = '{"id":"evt_1"}';
  const now = 1_800_000_000;
  it("accepts a correctly signed, fresh message", () => expect(verifySignature(body, sign(body, secret, now), secret, now)).toBe(true));
  it("refuses a changed body", () => expect(verifySignature(body + " ", sign(body, secret, now), secret, now)).toBe(false));
  it("refuses another secret", () => expect(verifySignature(body, sign(body, "whsec_other", now), secret, now)).toBe(false));
  it("refuses an old message (replay)", () => expect(verifySignature(body, sign(body, secret, now - 301), secret, now)).toBe(false));
  it("refuses a missing or garbage header", () => {
    expect(verifySignature(body, null, secret, now)).toBe(false);
    expect(verifySignature(body, "t=abc,v1=zz", secret, now)).toBe(false);
  });
});

describe("readSubscription", () => {
  const sub = (status: string, key: string, extra: Record<string, unknown> = {}) => ({
    id: "sub_1", customer: "cus_1", status, metadata: { user_id: "42" }, cancel_at_period_end: false,
    items: { data: [{ price: { lookup_key: key }, current_period_end: 1_800_000_000 }] }, ...extra,
  });
  it("active Plus gives plus", () => expect(readSubscription(sub("active", PLANS.plus.lookupKey)).plan).toBe("plus"));
  it("past_due Premium keeps premium while Stripe retries", () => expect(readSubscription(sub("past_due", PLANS.premium.lookupKey)).plan).toBe("premium"));
  it("cancelled or unpaid gives free", () => {
    expect(readSubscription(sub("canceled", PLANS.premium.lookupKey)).plan).toBe("free");
    expect(readSubscription(sub("unpaid", PLANS.plus.lookupKey)).plan).toBe("free");
    expect(readSubscription(sub("incomplete", PLANS.plus.lookupKey)).plan).toBe("free");
  });
  it("an unknown price never gives a paid plan", () => expect(readSubscription(sub("active", "someone_elses_price")).plan).toBe("free"));
  it("reads user id, renewal date and cancel flag", () => {
    const r = readSubscription(sub("active", PLANS.plus.lookupKey, { cancel_at_period_end: true, customer: { id: "cus_9" } }));
    expect(r).toMatchObject({ userId: 42, customerId: "cus_9", cancelAtEnd: true, subscriptionId: "sub_1" });
    expect(r.renewsAt?.toISOString()).toBe(new Date(1_800_000_000_000).toISOString());
  });
  it("ignores a bad user id", () => expect(readSubscription(sub("active", PLANS.plus.lookupKey, { metadata: { user_id: "x" } })).userId).toBeNull());
});
