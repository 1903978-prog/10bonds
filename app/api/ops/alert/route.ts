import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

/**
 * The one summary e-mail when the nightly live check (nightly-live-check.yml) finds a problem on the live site.
 * The caller proves itself with an HMAC of "ops-alert" keyed by ACCOUNTS_DATABASE_URL, like the weekly e-mail.
 * Body: { "summary": "text" }. Goes to OPS_ALERT_TO (default: the owner).
 */
export async function POST(req: Request) {
  const key = process.env.ACCOUNTS_DATABASE_URL;
  const given = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!key || !given) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const want = createHmac("sha256", key).update("ops-alert").digest("hex");
  if (given.length !== want.length || !timingSafeEqual(Buffer.from(given), Buffer.from(want))) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = (await req.json().catch(() => ({}))) as { summary?: unknown };
  const summary = String(body.summary ?? "").slice(0, 4000) || "The nightly live check failed.";
  const esc = summary.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const to = process.env.OPS_ALERT_TO || "1903978@gmail.com";
  const result = await sendEmail(to, "10BONDS nightly live check failed", `<pre style="font:14px/1.5 monospace;white-space:pre-wrap">${esc}</pre>`, summary);
  return NextResponse.json({ ok: result === "sent", result }, { status: result === "sent" ? 200 : 502 });
}
