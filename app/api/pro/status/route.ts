import { NextResponse } from "next/server";
import { currentUser } from "@/lib/currentUser";
import { proStatus } from "@/lib/pro";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ status: "signed-out" }, { headers: { "Cache-Control": "no-store" } });
  try {
    return NextResponse.json({ status: await proStatus(user) }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Professional access is not available right now." }, { status: 503 });
  }
}
