import { NextResponse } from "next/server";
import { currentUser } from "@/lib/currentUser";
import { emailDomainState } from "@/lib/emailDomain";

export const dynamic = "force-dynamic";

/** Admin only: whether confirmation e-mails can be sent, and the DNS records the sending domain needs. */
export async function GET() {
  const u = await currentUser();
  if (!u?.isAdmin) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(await emailDomainState(), { headers: { "Cache-Control": "no-store" } });
}
