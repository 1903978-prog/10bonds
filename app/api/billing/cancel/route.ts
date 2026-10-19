import { NextResponse } from "next/server";
import { applySubscription, subscriptionIdOf } from "@/lib/accounts";
import { currentUser } from "@/lib/currentUser";
import { allow } from "@/lib/rateLimit";
import { readSubscription, stripe, stripeConfigured } from "@/lib/stripe";

export const dynamic = "force-dynamic";

/** Cancel at the end of the period already paid ({resume:true} takes the cancellation back). */
export async function POST(req: Request) {
  if (!stripeConfigured()) return NextResponse.json({ error: "Paid plans open very soon." }, { status: 503 });
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  if (!allow(`cancel:${user.id}`, 10)) return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
  const resume = (await req.json().catch(() => ({})))?.resume === true;
  const subId = await subscriptionIdOf(user.id);
  if (!subId) return NextResponse.json({ error: "You have no active subscription." }, { status: 404 });
  try {
    const updated = await stripe("POST", `/subscriptions/${subId}`, { cancel_at_period_end: !resume });
    await applySubscription(readSubscription(updated));
    return NextResponse.json({ ok: true, cancelAtEnd: !resume });
  } catch (e) {
    console.error("[cancel] failed:", (e as Error).message);
    return NextResponse.json({ error: "The subscription could not be changed. Please try again later." }, { status: 502 });
  }
}
