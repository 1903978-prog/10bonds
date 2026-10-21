import { NextResponse } from "next/server";
import { grantStatsBonus } from "@/lib/accounts";
import { currentUser } from "@/lib/currentUser";

export const dynamic = "force-dynamic";

/** The browser calls this once a signed-in person has allowed Statistics: one free week, once per account. */
export async function POST() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  const premiumUntil = await grantStatsBonus(user.id);
  return NextResponse.json({ ok: true, granted: premiumUntil !== null, premiumUntil });
}
