import { NextResponse } from "next/server";
import { currentUser } from "@/lib/currentUser";
import { sendWeeklyTest, setWeeklyOn, weeklyStatus } from "@/lib/weeklySend";

export const dynamic = "force-dynamic";

async function admin() {
  const u = await currentUser();
  return u?.isAdmin ? u : null;
}

export async function GET() {
  if (!(await admin())) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(await weeklyStatus(), { headers: { "Cache-Control": "no-store" } });
}

// {action: "test", lang} sends this week's e-mail to the admin; {action: "on" | "off"} switches the Monday sending.
export async function POST(req: Request) {
  const u = await admin();
  if (!u) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const b = await req.json().catch(() => ({}));
  if (b?.action === "test") {
    const r = await sendWeeklyTest(u.id, u.email, typeof b.lang === "string" ? b.lang : "en");
    const msg = { sent: `Sent to ${u.email}. Check your inbox (and spam).`, "no-data": "No bond list available right now.", "not-configured": "E-mail is not set up on the server (RESEND_API_KEY / EMAIL_FROM).", failed: "Resend refused the e-mail. Try again later." }[r];
    return NextResponse.json({ ok: r === "sent", message: msg, status: await weeklyStatus() }, { status: r === "sent" ? 200 : 502 });
  }
  if (b?.action === "on" || b?.action === "off") {
    const ok = await setWeeklyOn(b.action === "on");
    return NextResponse.json({ ok, message: ok ? (b.action === "on" ? "Sending is ON: subscribers get it every Monday." : "Sending is OFF.") : "Send yourself a test first.", status: await weeklyStatus() }, { status: ok ? 200 : 409 });
  }
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
