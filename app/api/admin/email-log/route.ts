import { NextResponse } from "next/server";
import { currentUser } from "@/lib/currentUser";
import { recentEmailLog } from "@/lib/emailLog";

export const dynamic = "force-dynamic";

/** Admin only: the last 30 e-mail send attempts and what Resend answered. */
export async function GET() {
  const u = await currentUser();
  if (!u?.isAdmin) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(await recentEmailLog().catch(() => []), { headers: { "Cache-Control": "no-store" } });
}
