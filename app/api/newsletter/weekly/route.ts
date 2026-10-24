import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { sendWeekly } from "@/lib/weeklySend";

export const dynamic = "force-dynamic";

/**
 * The weekly top 10 e-mail, called every Monday morning by GitHub Actions (weekly-email.yml). The caller proves itself
 * with an HMAC of "weekly-email" keyed by ACCOUNTS_DATABASE_URL, like the SEO refresh. Nothing is sent while the admin
 * has sending switched off (/admin/weekly-email). Answers at once; the sending runs in the background.
 */
export async function POST(req: Request) {
  const key = process.env.ACCOUNTS_DATABASE_URL;
  const given = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!key || !given) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const want = createHmac("sha256", key).update("weekly-email").digest("hex");
  if (given.length !== want.length || !timingSafeEqual(Buffer.from(given), Buffer.from(want))) return NextResponse.json({ error: "Not found" }, { status: 404 });
  sendWeekly().catch((e) => console.error("Weekly e-mail failed:", (e as Error).message));
  return NextResponse.json({ ok: true, started: new Date().toISOString() }, { status: 202 });
}
