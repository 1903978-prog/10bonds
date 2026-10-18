import { NextResponse } from "next/server";
import { currentUser } from "@/lib/currentUser";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await currentUser();
  return NextResponse.json(user ? { email: user.email, username: user.username, plan: user.plan } : null, { headers: { "Cache-Control": "no-store" } });
}
