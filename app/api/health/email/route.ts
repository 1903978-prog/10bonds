import { NextResponse } from "next/server";
import { emailStatus } from "@/lib/email";

export const dynamic = "force-dynamic";

/** Whether e-mails can be sent (key set, sender domain verified in Resend). No secrets. */
export async function GET() {
  const { domain: _domain, ...status } = await emailStatus(); // the sender domain is not needed publicly
  return NextResponse.json(status, { headers: { "Cache-Control": "no-store" } });
}
