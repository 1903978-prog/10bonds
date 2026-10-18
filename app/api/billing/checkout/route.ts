import { NextResponse } from "next/server";
import { setStripeCustomer } from "@/lib/accounts";
import { currentUser } from "@/lib/currentUser";
import { siteUrl } from "@/lib/email";
import { allow } from "@/lib/rateLimit";
import { ensureStripeSetup, PLANS, stripe, stripeConfigured, type PaidPlan } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!stripeConfigured()) return NextResponse.json({ error: "Paid plans open very soon." }, { status: 503 });
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Please create a free account or sign in first." }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const plan = b?.plan as PaidPlan;
  if (!(plan in PLANS)) return NextResponse.json({ error: "Unknown plan." }, { status: 400 });
  // EU consumers: a digital service that starts at once needs this express request (Directive 2011/83/EU, art. 16(m)).
  if (b?.startNow !== true) return NextResponse.json({ error: "Please tick the box to start your plan straight away." }, { status: 400 });
  if (!allow(`checkout:${user.id}`, 10)) return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
  // Someone who already pays changes plan in the portal, so nobody ends up with two subscriptions.
  if (user.subscription && ["active", "trialing", "past_due"].includes(user.subscription.status))
    return NextResponse.json({ error: "You already have a subscription. Use “Manage subscription” to change plan." }, { status: 409 });
  try {
    const { prices } = await ensureStripeSetup();
    let customer = user.stripeCustomerId;
    if (!customer) {
      const c = await stripe("POST", "/customers", { email: user.email, metadata: { user_id: user.id, app: "10bonds" } });
      customer = c.id as string;
      await setStripeCustomer(user.id, customer);
    }
    const session = await stripe("POST", "/checkout/sessions", {
      mode: "subscription",
      customer,
      client_reference_id: String(user.id),
      line_items: [{ price: prices[plan], quantity: 1 }],
      subscription_data: { metadata: { user_id: user.id, plan, start_now_requested: "yes" } },
      metadata: { user_id: user.id, plan },
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      success_url: `${siteUrl()}/pricing?paid=1`,
      cancel_url: `${siteUrl()}/pricing?cancelled=1`,
    });
    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error("[checkout] failed:", (e as Error).message);
    return NextResponse.json({ error: "Payment could not be started. Please try again later." }, { status: 502 });
  }
}
