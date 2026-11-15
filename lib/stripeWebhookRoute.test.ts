import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "../app/api/stripe/webhook/route";
import { applySubscription } from "@/lib/accounts";
import {
  ensureStripeSetup,
  readSubscription,
  stripe,
  stripeConfigured,
  verifySignature,
} from "@/lib/stripe";

// This suite never calls Stripe or a database. Webhook delivery is simulated,
// and lib/stripe.test.ts tests the actual HMAC verifier and plan decoder.
vi.mock("@/lib/accounts", () => ({ applySubscription: vi.fn() }));
vi.mock("@/lib/stripe", () => ({
  ensureStripeSetup: vi.fn(),
  readSubscription: vi.fn(),
  stripe: vi.fn(),
  stripeConfigured: vi.fn(),
  verifySignature: vi.fn(),
}));

const deliver = (event: unknown, signature = "signed") =>
  POST(new Request("https://10bonds.com/api/stripe/webhook", {
    method: "POST",
    headers: { "content-type": "application/json", "stripe-signature": signature },
    body: typeof event === "string" ? event : JSON.stringify(event),
  }));

const active = {
  customerId: "cus_1",
  userId: 42,
  subscriptionId: "sub_1",
  status: "active",
  plan: "plus" as const,
  interval: "month" as const,
  renewsAt: null,
  cancelAtEnd: false,
};

describe("Stripe webhook route: offline acceptance", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(stripeConfigured).mockReturnValue(true);
    vi.mocked(ensureStripeSetup).mockResolvedValue({
      webhookSecret: "whsec_fixture",
      portalConfig: "bpc_fixture",
      prices: {} as Awaited<ReturnType<typeof ensureStripeSetup>>["prices"],
    });
    vi.mocked(verifySignature).mockReturnValue(true);
    vi.mocked(readSubscription).mockReturnValue(active);
    vi.mocked(applySubscription).mockResolvedValue(42);
    vi.mocked(stripe).mockResolvedValue({ id: "sub_1", customer: "cus_1", status: "active" });
  });

  it("fails closed when Stripe is not configured and performs no side effects", async () => {
    vi.mocked(stripeConfigured).mockReturnValue(false);
    const response = await deliver({ type: "customer.subscription.updated" });
    expect(response.status).toBe(503);
    expect(ensureStripeSetup).not.toHaveBeenCalled();
    expect(applySubscription).not.toHaveBeenCalled();
  });

  it("rejects unsigned or tampered deliveries before reading Stripe or the database", async () => {
    vi.mocked(verifySignature).mockReturnValue(false);
    const response = await deliver({ type: "customer.subscription.updated" }, "invalid");
    expect(response.status).toBe(400);
    expect(stripe).not.toHaveBeenCalled();
    expect(applySubscription).not.toHaveBeenCalled();
  });

  it("applies only the authoritative Stripe subscription, never the event snapshot", async () => {
    const response = await deliver({
      type: "customer.subscription.updated",
      data: { object: { id: "sub_1", status: "canceled", plan: "fake" } },
    });
    expect(response.status).toBe(200);
    expect(stripe).toHaveBeenCalledWith("GET", "/subscriptions/sub_1");
    expect(readSubscription).toHaveBeenCalledWith(expect.objectContaining({ status: "active" }));
    expect(applySubscription).toHaveBeenCalledWith(active);
  });

  it("looks up checkout.session.completed subscriptions from Stripe", async () => {
    const response = await deliver({
      type: "checkout.session.completed",
      data: { object: { subscription: "sub_2", payment_status: "paid" } },
    });
    expect(response.status).toBe(200);
    expect(stripe).toHaveBeenCalledWith("GET", "/subscriptions/sub_2");
    expect(applySubscription).toHaveBeenCalledOnce();
  });

  it("requests retry on transient Stripe read failure, without modifying plan", async () => {
    vi.mocked(stripe).mockRejectedValueOnce(new Error("temporary 503"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const response = await deliver({ type: "customer.subscription.updated", data: { object: { id: "sub_1" } } });
      expect(response.status).toBe(500);
      expect(applySubscription).not.toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  });

  it("requests retry if persisting a subscription fails", async () => {
    vi.mocked(applySubscription).mockRejectedValueOnce(new Error("db unavailable"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const response = await deliver({ type: "customer.subscription.updated", data: { object: { id: "sub_1" } } });
      expect(response.status).toBe(500);
    } finally {
      spy.mockRestore();
    }
  });

  it.each(["{not-json", "null", "false", '"not-an-event"'])("rejects malformed or non-object signed JSON (%s)", async (payload) => {
    const response = await deliver(payload);
    expect(response.status).toBe(400);
    expect(stripe).not.toHaveBeenCalled();
    expect(applySubscription).not.toHaveBeenCalled();
  });

  it("ignores unrelated signed events without changing accounts", async () => {
    const response = await deliver({ type: "charge.succeeded", data: { object: { id: "ch_1" } } });
    expect(response.status).toBe(200);
    expect(stripe).not.toHaveBeenCalled();
    expect(applySubscription).not.toHaveBeenCalled();
  });
});
