import { randomInt } from "node:crypto";
import { NextResponse } from "next/server";
import { createTrialCodes, findUserById, listDiscountCodes, markDiscountUsed, saveDiscountCode, setStripeCustomer } from "@/lib/accounts";
import { makeCode } from "@/lib/codes";
import { currentUser } from "@/lib/currentUser";
import { stripe, stripeConfigured, stripeMode } from "@/lib/stripe";

export const dynamic = "force-dynamic";

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const makeDiscountCode = () => `D-${Array.from({ length: 8 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("")}`;

async function admin() {
  const u = await currentUser();
  return u?.isAdmin ? u : null;
}

/** All codes made so far. Codes not yet marked used are checked against Stripe (times_redeemed). */
export async function GET() {
  if (!(await admin())) return NextResponse.json({ error: "Not found" }, { status: 404 });
  let codes = await listDiscountCodes();
  if (stripeConfigured()) {
    await Promise.all(codes.filter((c) => !c.usedAt && c.promoId && c.mode === stripeMode()).slice(0, 40).map(async (c) => {
      try {
        const p = await stripe<{ times_redeemed?: number }>("GET", `/promotion_codes/${c.promoId}`);
        if ((p.times_redeemed ?? 0) > 0) await markDiscountUsed(c.code);
      } catch { /* leave as not used */ }
    }));
    codes = await listDiscountCodes();
  }
  return NextResponse.json({ codes: codes.map(({ promoId: _p, ...c }) => c), stripe: stripeConfigured() ? stripeMode() : null }, { headers: { "Cache-Control": "no-store" } });
}

/** Make a code for one user: % or fixed € off for N months, single use, tied to that user's Stripe customer. */
export async function POST(req: Request) {
  const a = await admin();
  if (!a) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const b = await req.json().catch(() => ({}));
  const userId = Math.floor(Number(b?.userId));
  const months = Math.floor(Number(b?.months));
  const kind = b?.kind === "amount" ? "amount" : "percent";
  const value = Number(b?.value);
  if (!Number.isInteger(userId) || userId < 1) return NextResponse.json({ error: "Unknown user." }, { status: 400 });
  if (!Number.isInteger(months) || months < 1 || months > 36) return NextResponse.json({ error: "Months must be 1 to 36." }, { status: 400 });
  if (kind === "percent" ? !(value > 0 && value <= 100) : !(value > 0 && value <= 1000)) return NextResponse.json({ error: kind === "percent" ? "Percent must be 1 to 100." : "Amount must be 1 to 1000 €." }, { status: 400 });
  const user = await findUserById(userId);
  if (!user) return NextResponse.json({ error: "Unknown user." }, { status: 404 });

  // No Stripe: fall back to an in-app Premium code (a free period, not a discount).
  if (!stripeConfigured()) {
    const [code] = await createTrialCodes(a.id, 1, months * 30, `for ${user.email}`, makeCode);
    return NextResponse.json({ code, via: "in-app", note: `Stripe is not connected, so this is an in-app code: ${months * 30} days of free Premium.` });
  }
  try {
    let customer = user.stripeCustomerId;
    if (!customer) {
      customer = (await stripe("POST", "/customers", { email: user.email, metadata: { user_id: user.id, app: "10bonds" } })).id as string;
      await setStripeCustomer(user.id, customer);
    }
    const coupon = await stripe("POST", "/coupons", {
      ...(kind === "percent" ? { percent_off: value } : { amount_off: Math.round(value * 100), currency: "eur" }),
      duration: "repeating", duration_in_months: months, name: "10BONDS discount", metadata: { app: "10bonds", user_id: user.id },
    });
    const code = makeDiscountCode();
    const base = { code, customer, max_redemptions: 1, metadata: { app: "10bonds", user_id: user.id } };
    // Older Stripe API versions take `coupon`, newer ones `promotion`.
    const promo = await stripe("POST", "/promotion_codes", { ...base, coupon: coupon.id }).catch(() => stripe("POST", "/promotion_codes", { ...base, promotion: { type: "coupon", coupon: coupon.id } }));
    await saveDiscountCode({ code, userId: user.id, percentOff: kind === "percent" ? value : null, amountOffCents: kind === "amount" ? Math.round(value * 100) : null, months, couponId: coupon.id, promoId: promo.id, mode: stripeMode(), createdBy: a.id });
    return NextResponse.json({ code, via: "stripe", mode: stripeMode() });
  } catch (e) {
    console.error("[discount-code] failed:", (e as Error).message);
    return NextResponse.json({ error: `Stripe could not make the code: ${(e as Error).message.slice(0, 160)}` }, { status: 502 });
  }
}
