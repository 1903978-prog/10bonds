import { createHmac, timingSafeEqual } from "node:crypto";
import { getSetting, setSetting } from "./accounts";
import { siteUrl } from "./email";

/**
 * Stripe through its plain HTTP API (no SDK). The only thing the app needs is STRIPE_SECRET_KEY:
 * products, monthly prices, the customer portal set-up and the webhook (with its signing key) are
 * created by the app itself the first time they are needed, and found again afterwards.
 */
export type PaidPlan = "plus" | "premium";
export const PLANS: Record<PaidPlan, { name: string; cents: number; lookupKey: string }> = {
  plus: { name: "10BONDS Plus", cents: 900, lookupKey: "tenbonds_plus_monthly_eur" },
  premium: { name: "10BONDS Premium", cents: 1900, lookupKey: "tenbonds_premium_monthly_eur" },
};
export const WEBHOOK_EVENTS = ["checkout.session.completed", "customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted"];

export function stripeConfigured(): boolean {
  return /^(sk|rk)_(test|live)_/.test(process.env.STRIPE_SECRET_KEY ?? "");
}
export const stripeMode = () => (process.env.STRIPE_SECRET_KEY ?? "").includes("_live_") ? "live" : "test";

/** Stripe's form encoding: nested objects and arrays as a[b][0]=c. */
export function formEncode(obj: Record<string, unknown>, prefix = "", out = new URLSearchParams()): URLSearchParams {
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (Array.isArray(v)) v.forEach((x, i) => (typeof x === "object" ? formEncode(x as Record<string, unknown>, `${key}[${i}]`, out) : out.append(`${key}[${i}]`, String(x))));
    else if (typeof v === "object") formEncode(v as Record<string, unknown>, key, out);
    else out.append(key, String(v));
  }
  return out;
}

export class StripeError extends Error {
  constructor(public status: number, public code: string | null, message: string) {
    super(message);
  }
}

export async function stripe<T = Record<string, any>>(method: "GET" | "POST" | "DELETE", path: string, params: Record<string, unknown> = {}): Promise<T> {
  const body = formEncode(params);
  // A stand-in Stripe for local tests only: never with a live key.
  const base = process.env.STRIPE_API_BASE && stripeMode() === "test" ? process.env.STRIPE_API_BASE : "https://api.stripe.com";
  const url = `${base}/v1${path}${method === "GET" && body.size ? `?${body}` : ""}`;
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`, ...(method === "POST" ? { "Content-Type": "application/x-www-form-urlencoded" } : {}) },
    body: method === "POST" ? body : undefined,
    signal: AbortSignal.timeout(20_000),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new StripeError(res.status, json?.error?.code ?? null, json?.error?.message ?? `Stripe HTTP ${res.status}`);
  return json as T;
}

type Setup = { prices: Record<PaidPlan, string>; portalConfig: string; webhookSecret: string };
let setupPromise: Promise<Setup> | null = null;

/** Find or create everything Stripe needs. Safe to call many times; work is done once per server start. */
export function ensureStripeSetup(): Promise<Setup> {
  setupPromise ??= doSetup().catch((e) => {
    setupPromise = null;
    throw e;
  });
  return setupPromise;
}

async function doSetup(): Promise<Setup> {
  const mode = stripeMode();
  // 1. Prices, found by their lookup key.
  const found = await stripe<{ data: { id: string; lookup_key: string }[] }>("GET", "/prices", {
    lookup_keys: Object.values(PLANS).map((p) => p.lookupKey),
    active: true,
    limit: 10,
  });
  const prices = {} as Record<PaidPlan, string>;
  for (const [plan, p] of Object.entries(PLANS) as [PaidPlan, (typeof PLANS)[PaidPlan]][]) {
    const hit = found.data.find((x) => x.lookup_key === p.lookupKey);
    if (hit) prices[plan] = hit.id;
    else {
      const product = await stripe("POST", "/products", { name: p.name, metadata: { app: "10bonds", plan } });
      const price = await stripe("POST", "/prices", {
        product: product.id, currency: "eur", unit_amount: p.cents, recurring: { interval: "month" },
        lookup_key: p.lookupKey, tax_behavior: "inclusive", metadata: { app: "10bonds", plan },
      });
      prices[plan] = price.id;
    }
  }
  // 2. Customer portal (cancel, change plan, card, invoices).
  const portalKey = `stripe_portal_config_${mode}`;
  let portalConfig = await getSetting(portalKey);
  if (!portalConfig) {
    const productOf = async (priceId: string) => (await stripe("GET", `/prices/${priceId}`)).product as string;
    const cfg = await stripe("POST", "/billing_portal/configurations", {
      business_profile: { headline: "10BONDS subscription", privacy_policy_url: `${siteUrl()}/terms#privacy`, terms_of_service_url: `${siteUrl()}/terms` },
      features: {
        customer_update: { enabled: true, allowed_updates: ["email", "address", "tax_id"] },
        invoice_history: { enabled: true },
        payment_method_update: { enabled: true },
        subscription_cancel: { enabled: true, mode: "at_period_end" },
        subscription_update: {
          enabled: true,
          default_allowed_updates: ["price"],
          proration_behavior: "create_prorations",
          products: await Promise.all((Object.keys(PLANS) as PaidPlan[]).map(async (k) => ({ product: await productOf(prices[k]), prices: [prices[k]] }))),
        },
      },
      metadata: { app: "10bonds" },
    });
    portalConfig = cfg.id as string;
    await setSetting(portalKey, portalConfig);
  }
  // 3. Webhook to this site. Its signing key is only shown when it is created, so it is stored then.
  const url = `${siteUrl()}/api/stripe/webhook`;
  const idKey = `stripe_webhook_id_${mode}`;
  const secretKey = `stripe_webhook_secret_${mode}`;
  const [storedId, storedSecret] = await Promise.all([getSetting(idKey), getSetting(secretKey)]);
  const endpoints = await stripe<{ data: { id: string; url: string; status: string }[] }>("GET", "/webhook_endpoints", { limit: 100 });
  const mine = endpoints.data.filter((e) => e.url === url);
  if (storedSecret && storedId && mine.some((e) => e.id === storedId)) return { prices, portalConfig, webhookSecret: storedSecret };
  for (const e of mine) await stripe("DELETE", `/webhook_endpoints/${e.id}`);
  const created = await stripe("POST", "/webhook_endpoints", { url, enabled_events: WEBHOOK_EVENTS, description: "10BONDS plan updates", metadata: { app: "10bonds" } });
  await setSetting(secretKey, created.secret);
  await setSetting(idKey, created.id);
  return { prices, portalConfig, webhookSecret: created.secret };
}

/** Check a Stripe-Signature header (v1 scheme, 5-minute tolerance). */
export function verifySignature(payload: string, header: string | null, secret: string, nowSec = Math.floor(Date.now() / 1000), tolerance = 300): boolean {
  if (!header) return false;
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=", 2)).filter((p) => p.length === 2).map(([k, v]) => [k.trim(), v]));
  const t = Number(parts.t);
  if (!Number.isFinite(t) || Math.abs(nowSec - t) > tolerance) return false;
  const expected = createHmac("sha256", secret).update(`${t}.${payload}`).digest();
  return header.split(",").filter((p) => p.trim().startsWith("v1=")).some((p) => {
    const got = Buffer.from(p.trim().slice(3), "hex");
    return got.length === expected.length && timingSafeEqual(got, expected);
  });
}

/** What a subscription object means for the account: which plan, until when. */
export function readSubscription(sub: any): {
  customerId: string; userId: number | null; subscriptionId: string; status: string; plan: "free" | PaidPlan; renewsAt: Date | null; cancelAtEnd: boolean;
} {
  const item = sub?.items?.data?.[0];
  const key = item?.price?.lookup_key as string | undefined;
  const paid = (Object.keys(PLANS) as PaidPlan[]).find((k) => PLANS[k].lookupKey === key) ?? null;
  const live = ["active", "trialing", "past_due"].includes(sub?.status);
  const end = sub?.current_period_end ?? item?.current_period_end ?? null;
  const uid = Number(sub?.metadata?.user_id);
  return {
    customerId: typeof sub?.customer === "string" ? sub.customer : sub?.customer?.id,
    userId: Number.isInteger(uid) && uid > 0 ? uid : null,
    subscriptionId: sub?.id,
    status: String(sub?.status ?? "unknown"),
    plan: live && paid ? paid : "free",
    renewsAt: end ? new Date(end * 1000) : null,
    cancelAtEnd: sub?.cancel_at_period_end === true,
  };
}
