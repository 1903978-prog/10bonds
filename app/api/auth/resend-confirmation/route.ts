import { NextResponse } from "next/server";
import { sendConfirmation } from "@/lib/confirm";
import { currentUser } from "@/lib/currentUser";
import { allow } from "@/lib/rateLimit";
import { requestLang } from "@/lib/welcomeEmail";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  if (user.emailVerified) return NextResponse.json({ ok: true, already: true });
  if (!allow(`resend:${user.id}`, 3, 60 * 60_000)) return NextResponse.json({ error: "Please wait a while before asking again." }, { status: 429 });
  const r = await sendConfirmation(user.id, user.email, user.username ?? user.email, requestLang(req));
  if (r === "sent") return NextResponse.json({ ok: true });
  return NextResponse.json({ error: r === "not-configured" ? "Confirmation e-mails are not switched on yet." : "The e-mail could not be sent. Please try later." }, { status: 503 });
}
