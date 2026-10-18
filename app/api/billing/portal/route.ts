import { NextResponse } from "next/server";
import { currentUser } from "@/lib/currentUser";
import { siteUrl } from "@/lib/email";
import { ensureStripeSetup, stripe, stripeConfigured } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export async function POST() {
  if (!stripeConfigured()) return NextResponse.json({ error: "Paid plans open very soon." }, { status: 503 });
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  if (!user.stripeCustomerId) return NextResponse.json({ error: "You have no subscription yet." }, { status: 404 });
  try {
    const { portalConfig } = await ensureStripeSetup();
    const s = await stripe("POST", "/billing_portal/sessions", { customer: user.stripeCustomerId, configuration: portalConfig, return_url: `${siteUrl()}/pricing` });
    return NextResponse.json({ url: s.url });
  } catch (e) {
    console.error("[portal] failed:", (e as Error).message);
    return NextResponse.json({ error: "The subscription page could not be opened. Please try again later." }, { status: 502 });
  }
}
