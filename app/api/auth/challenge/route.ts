import { NextResponse } from "next/server";
import { newChallenge } from "@/lib/botCheck";

export const dynamic = "force-dynamic";

export async function GET() {
  const c = newChallenge();
  if (!c) return NextResponse.json({ error: "Sign-up is not available right now." }, { status: 503 });
  return NextResponse.json(c, { headers: { "Cache-Control": "no-store" } });
}
