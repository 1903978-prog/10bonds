import { NextResponse } from "next/server";
import { ensureStripeSetup, stripeConfigured, stripeMode } from "@/lib/stripe";

export const dynamic = "force-dynamic";

/** Whether paid plans work: key present, prices, portal and webhook found or created. No secrets in the answer. */
export async function GET() {
  if (!stripeConfigured()) return NextResponse.json({ configured: false }, { headers: { "Cache-Control": "no-store" } });
  try {
    const s = await ensureStripeSetup();
    return NextResponse.json({ configured: true, mode: stripeMode(), prices: Object.keys(s.prices).length, portal: Boolean(s.portalConfig), webhook: Boolean(s.webhookSecret) }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ configured: true, mode: stripeMode(), error: (e as Error).message.slice(0, 200) }, { status: 503 });
  }
}
