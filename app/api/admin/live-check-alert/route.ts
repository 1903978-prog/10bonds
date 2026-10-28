import { NextResponse } from "next/server";
import { liveCheckTokenOk, sendLiveCheckAlert } from "@/lib/liveCheckAlert";

export const dynamic = "force-dynamic";

/**
 * Called by the nightly live check (nightly-live-check.yml) only when it fails: sends ONE status e-mail to the site owner.
 * The caller proves itself with an HMAC of "live-check-alert" keyed by ACCOUNTS_DATABASE_URL, like the weekly e-mail.
 */
export async function POST(req: Request) {
  const given = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!liveCheckTokenOk(process.env.ACCOUNTS_DATABASE_URL, given)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const b = (await req.json().catch(() => ({}))) as { summary?: unknown; runUrl?: unknown };
  const summary = typeof b.summary === "string" ? b.summary : "No details.";
  const runUrl = typeof b.runUrl === "string" && b.runUrl.startsWith("https://github.com/") ? b.runUrl : "https://github.com/1903978-prog/10bonds/actions";
  const r = await sendLiveCheckAlert(summary, runUrl);
  return NextResponse.json({ ok: r === "sent", result: r }, { status: r === "sent" ? 200 : 502 });
}
