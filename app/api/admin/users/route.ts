import { NextResponse } from "next/server";
import { listUsersForAdmin } from "@/lib/accounts";
import { currentUser } from "@/lib/currentUser";

export const dynamic = "force-dynamic";

export async function GET() {
  const u = await currentUser();
  if (!u?.isAdmin) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ users: await listUsersForAdmin() }, { headers: { "Cache-Control": "no-store" } });
}
