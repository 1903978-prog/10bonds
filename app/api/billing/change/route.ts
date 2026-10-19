import { NextResponse } from "next/server";
import { applySubscription, subscriptionIdOf } from "@/lib/accounts";
import { currentUser } from "@/lib/currentUser";
import { isInterval, isPaidPlan } from "@/lib/plans";
import { proStatus } from "@/lib/pro";
import { allow } from "@/lib/rateLimit";
import { ensureStripeSetup, priceKey, readSubscription, stripe, stripeConfigured } from "@/lib/stripe";

export const dynamic = "force-dynamic";

/** Upgrade or downgrade an existing subscription (plan and/or monthly-yearly). The difference is prorated by Stripe. */
export async function POST(req: Request) {
  if (!stripeConfigured()) return NextResponse.json({ error: "Paid plans open very soon." }, { status: 503 });
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  // The owner already has every plan for free and is never charged.
  if (user.isAdmin) return NextResponse.json({ error: "Your admin account already has every plan, free of charge." }, { status: 400 });
  const b = await req.json().catch(() => ({}));
  const plan = b?.plan, interval = b?.interval;
  if (!isPaidPlan(plan) || !isInterval(interval)) return NextResponse.json({ error: "Unknown plan." }, { status: 400 });
  if (!allow(`change:${user.id}`, 10)) return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
  if (plan === "pro" && !user.isAdmin && (await proStatus(user).catch(() => "none")) !== "approved")
    return NextResponse.json({ error: "The Pro plan is for approved professionals. Please request access first." }, { status: 403 });
  const subId = await subscriptionIdOf(user.id);
  if (!subId) return NextResponse.json({ error: "You have no active subscription. Choose a plan on the pricing page." }, { status: 404 });
  try {
    const { prices } = await ensureStripeSetup();
    const current = await stripe("GET", `/subscriptions/${subId}`);
    const item = current?.items?.data?.[0];
    if (!item || !["active", "trialing", "past_due"].includes(current.status)) return NextResponse.json({ error: "You have no active subscription." }, { status: 404 });
    const updated = await stripe("POST", `/subscriptions/${subId}`, {
      items: [{ id: item.id, price: prices[priceKey(plan, interval)] }],
      proration_behavior: "create_prorations",
      cancel_at_period_end: false,
      metadata: { user_id: user.id, plan, interval },
    });
    await applySubscription(readSubscription(updated));
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[change] failed:", (e as Error).message);
    return NextResponse.json({ error: "The plan could not be changed. Please try again later." }, { status: 502 });
  }
}

