import { NextResponse } from "next/server";
import { redeemTrialCode } from "@/lib/accounts";
import { normaliseCode } from "@/lib/codes";
import { currentUser } from "@/lib/currentUser";
import { allow } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Please sign in or create a free account first." }, { status: 401 });
  if (!allow(`redeem:${user.id}`, 10)) return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
  const b = await req.json().catch(() => ({}));
  const code = normaliseCode(b?.code);
  if (!code) return NextResponse.json({ error: "That does not look like a 10BONDS code (10B-XXXX-XXXX)." }, { status: 400 });
  const r = await redeemTrialCode(user.id, code);
  if (r === "unknown") return NextResponse.json({ error: "This code does not exist." }, { status: 404 });
  if (r === "used") return NextResponse.json({ error: "This code has already been used." }, { status: 409 });
  return NextResponse.json({ ok: true, premiumUntil: r.premiumUntil });
}
