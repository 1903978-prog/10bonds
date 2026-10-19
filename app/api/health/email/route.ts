import { NextResponse } from "next/server";
import { emailStatus } from "@/lib/email";

export const dynamic = "force-dynamic";

/** Whether e-mails can be sent (key set, sender domain verified in Resend). No secrets. */
export async function GET() {
  return NextResponse.json(await emailStatus(), { headers: { "Cache-Control": "no-store" } });
}
