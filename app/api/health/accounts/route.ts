import { NextResponse } from "next/server";
import { accountsHealth } from "@/lib/accounts";

export const dynamic = "force-dynamic";

export async function GET() {
  const h = await accountsHealth();
  return NextResponse.json(h, { status: h.stage === "ok" ? 200 : 503 });
}
