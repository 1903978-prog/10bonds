import { NextResponse } from "next/server";
import { deleteUser, subscriptionIdOf } from "@/lib/accounts";
import { currentUser } from "@/lib/currentUser";
import { SESSION_COOKIE } from "@/lib/session";
import { stripe, stripeConfigured } from "@/lib/stripe";

export const dynamic = "force-dynamic";

/** Delete the account and all its data (GDPR art. 17). The user must type DELETE. Any subscription is cancelled at
 *  once first, so nothing is charged again. Stripe keeps the invoices, which tax law requires us to keep. */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  if ((await req.json().catch(() => ({})))?.confirm !== "DELETE") return NextResponse.json({ error: "Please type DELETE to confirm." }, { status: 400 });
  const subId = await subscriptionIdOf(user.id);
  if (subId && stripeConfigured() && user.subscription && ["active", "trialing", "past_due"].includes(user.subscription.status)) {
    try {
      await stripe("DELETE", `/subscriptions/${subId}`);
    } catch (e) {
      console.error("[delete] cancel failed:", (e as Error).message);
      return NextResponse.json({ error: "Your subscription could not be cancelled, so the account was not deleted. Please try again later." }, { status: 502 });
    }
  }
  if (user.stripeCustomerId && stripeConfigured()) {
    // Drop the link to our (deleted) account. Stripe keeps the customer and invoices, as tax law requires.
    await stripe("POST", `/customers/${user.stripeCustomerId}`, { metadata: { user_id: "", app: "10bonds", deleted: "yes" } }).catch(() => {});
  }
  await deleteUser(user.id);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
