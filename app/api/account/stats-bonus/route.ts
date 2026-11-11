import { NextResponse } from "next/server";
import { grantStatsBonus } from "@/lib/accounts";
import { currentUser } from "@/lib/currentUser";
import { allow, clientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

/**
 * The browser calls this once a signed-in person has allowed Statistics: one free week, once per account and once per browser.
 * The server checks the browser really allowed Statistics (its id has a recorded page view) and limits tries per address.
 */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  if (!allow(`statsbonus:${clientIp(req)}`, 20, 24 * 3600_000)) return NextResponse.json({ error: "Too many attempts." }, { status: 429 });
  const b = await req.json().catch(() => ({}));
  const visitorId = typeof b?.visitorId === "string" ? b.visitorId : null;
  const r = await grantStatsBonus(user.id, visitorId);
  if (r === "no-consent-proof") return NextResponse.json({ ok: false, granted: false, error: "Statistics are not allowed in this browser yet." }, { status: 403 });
  if (r === "already-given") return NextResponse.json({ ok: true, granted: false, premiumUntil: null });
  return NextResponse.json({ ok: true, granted: true, premiumUntil: r.premiumUntil });
}
