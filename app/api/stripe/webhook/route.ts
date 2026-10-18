import { NextResponse } from "next/server";
import { applySubscription } from "@/lib/accounts";
import { ensureStripeSetup, readSubscription, stripe, stripeConfigured, verifySignature } from "@/lib/stripe";

export const dynamic = "force-dynamic";

/** Stripe tells us about payments here. Only signed messages are acted on; the plan follows the subscription. */
export async function POST(req: Request) {
  if (!stripeConfigured()) return NextResponse.json({ error: "not configured" }, { status: 503 });
  const payload = await req.text();
  let secret: string;
  try {
    secret = (await ensureStripeSetup()).webhookSecret;
  } catch (e) {
    console.error("[webhook] setup failed:", (e as Error).message);
    return NextResponse.json({ error: "setup" }, { status: 500 });
  }
  if (!verifySignature(payload, req.headers.get("stripe-signature"), secret)) return NextResponse.json({ error: "bad signature" }, { status: 400 });
  const event = JSON.parse(payload);
  try {
    let sub: unknown = null;
    if (event.type === "checkout.session.completed" && event.data?.object?.subscription) {
      // Read the subscription itself, so the stored plan is what Stripe holds now.
      sub = await stripe("GET", `/subscriptions/${event.data.object.subscription}`);
    } else if (String(event.type).startsWith("customer.subscription.")) {
      sub = event.data?.object;
    }
    if (sub) {
      const s = readSubscription(sub);
      const userId = await applySubscription(s);
      console.log(`[webhook] ${event.type}: ${s.status} -> plan ${s.plan} for user ${userId ?? "none"}`);
    }
    return NextResponse.json({ received: true });
  } catch (e) {
    console.error("[webhook] failed:", event.type, (e as Error).message);
    // Stripe retries on 5xx, so a passing hiccup heals by itself.
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
