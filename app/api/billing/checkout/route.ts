import { NextResponse } from "next/server";
import { setStripeCustomer } from "@/lib/accounts";
import { currentUser } from "@/lib/currentUser";
import { siteUrl } from "@/lib/email";
import { allow } from "@/lib/rateLimit";
import { isInterval, isPaidPlan } from "@/lib/plans";
import { proStatus } from "@/lib/pro";
import { activePromo } from "@/lib/promoServer";
import { ensureStripePrices, ensurePromoCoupon, priceKey, stripe, stripeConfigured } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!stripeConfigured()) return NextResponse.json({ error: "Paid plans open very soon." }, { status: 503 });
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Please create a free account or sign in first." }, { status: 401 });
  // The owner already has every plan for free and is never charged.
  if (user.isAdmin) return NextResponse.json({ error: "Your admin account already has every plan, free of charge." }, { status: 400 });
  const b = await req.json().catch(() => ({}));
  const plan = b?.plan;
  const interval = b?.interval ?? "month";
  if (!isPaidPlan(plan) || !isInterval(interval)) return NextResponse.json({ error: "Unknown plan." }, { status: 400 });
  // Pro is for approved professionals only.
  if (plan === "pro" && !user.isAdmin && (await proStatus(user).catch(() => "none")) !== "approved")
    return NextResponse.json({ error: "The Pro plan is for approved professionals. Please request access first." }, { status: 403 });
  // EU consumers: a digital service that starts at once needs this express request (Directive 2011/83/EU, art. 16(m)).
  if (b?.startNow !== true) return NextResponse.json({ error: "Please tick the box to start your plan straight away." }, { status: 400 });
  if (!allow(`checkout:${user.id}`, 10)) return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
  // Someone who already pays changes plan in the portal, so nobody ends up with two subscriptions.
  if (user.subscription && ["active", "trialing", "past_due"].includes(user.subscription.status))
    return NextResponse.json({ error: "You already have a subscription. Change plan on your profile page." }, { status: 409 });
  try {
    const { prices } = await ensureStripePrices();
    let customer = user.stripeCustomerId;
    if (!customer) {
      const c = await stripe("POST", "/customers", { email: user.email, metadata: { user_id: user.id, app: "10bonds" } });
      customer = c.id as string;
      await setStripeCustomer(user.id, customer);
    }
    // During the promo the discount is applied by Stripe itself (first period only); promo codes cannot be combined with it.
    const promo = interval === "month" ? await activePromo() : null;
    let coupon: string | null = null;
    if (promo) {
      try {
        coupon = await ensurePromoCoupon(promo.percent, promo.endsAt, "Halloween 2026 promo");
      } catch (e) {
        console.error("[checkout] promo coupon failed, continuing without it:", (e as Error).message);
      }
    }
    const session = await stripe("POST", "/checkout/sessions", {
      mode: "subscription",
      customer,
      client_reference_id: String(user.id),
      line_items: [{ price: prices[priceKey(plan, interval)], quantity: 1 }],
      subscription_data: { metadata: { user_id: user.id, plan, interval, start_now_requested: "yes" } },
      metadata: { user_id: user.id, plan },
      ...(coupon ? { discounts: [{ coupon }] } : { allow_promotion_codes: true }),
      billing_address_collection: "auto",
      // Always charge in EUR: no local-currency conversion (and no conversion fee) at checkout.
      currency: "eur",
      adaptive_pricing: { enabled: false },
      // Business customers can add their VAT number, so the invoice is made out to the firm.
      ...(plan === "pro" ? { tax_id_collection: { enabled: true }, customer_update: { name: "auto", address: "auto" } } : {}),
      success_url: `${siteUrl()}/pricing?paid=1`,
      cancel_url: `${siteUrl()}/pricing?cancelled=1`,
    });
    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error("[checkout] failed:", (e as Error).message, (e as { code?: string }).code ?? "");
    return NextResponse.json({ error: "Payment could not be started. Please try again later." }, { status: 502 });
  }
}
