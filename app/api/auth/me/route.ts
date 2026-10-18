import { NextResponse } from "next/server";
import { currentUser } from "@/lib/currentUser";
import { emailConfigured } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await currentUser();
  return NextResponse.json(user
      ? { email: user.email, username: user.username, plan: user.plan, storedPlan: user.storedPlan, premiumUntil: user.premiumUntil, emailVerified: user.emailVerified, isAdmin: user.isAdmin, confirmationOn: emailConfigured() }
      : null, { headers: { "Cache-Control": "no-store" } });
}
