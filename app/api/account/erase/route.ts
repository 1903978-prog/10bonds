import { NextResponse } from "next/server";
import { eraseActivity } from "@/lib/accounts";
import { currentUser } from "@/lib/currentUser";

export const dynamic = "force-dynamic";

/** Erase usage history (stats and search counts) but keep the account. */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  if ((await req.json().catch(() => ({})))?.confirm !== true) return NextResponse.json({ error: "Please confirm." }, { status: 400 });
  return NextResponse.json({ ok: true, ...(await eraseActivity(user.id)) });
}
