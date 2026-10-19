import { NextResponse } from "next/server";
import { OWNER_COOKIE, forgetVisitor } from "@/lib/accounts";
import { currentUser } from "@/lib/currentUser";

export const dynamic = "force-dynamic";

const VISITOR_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Called when the admin page opens: this browser stops counting in the stats, even signed out, and its past visits go. */
export async function POST(req: Request) {
  const u = await currentUser();
  if (!u?.isAdmin) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const b = await req.json().catch(() => ({}));
  if (typeof b?.visitorId === "string" && VISITOR_ID.test(b.visitorId)) await forgetVisitor(b.visitorId).catch(() => {});
  const res = NextResponse.json({ ok: true });
  res.cookies.set(OWNER_COOKIE, "1", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 730 });
  return res;
}
