import { NextResponse } from "next/server";
import { currentUser } from "@/lib/currentUser";
import { addDrafts, listOutreach, loadFirstBatch, sendOne, setStatus } from "@/lib/outreach";

export const dynamic = "force-dynamic";

async function admin() {
  const u = await currentUser();
  return u?.isAdmin ? u : null;
}

export async function GET() {
  if (!(await admin())) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ rows: await listOutreach(), replyToSet: Boolean(process.env.OUTREACH_REPLY_TO) }, { headers: { "Cache-Control": "no-store" } });
}

/** load = add the first batch as drafts; add = paste more firms; send = one confirmed send; optout / draft = change a status. Nothing is ever sent automatically. */
export async function POST(req: Request) {
  if (!(await admin())) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const b = await req.json().catch(() => ({}));
  if (b?.action === "load") return NextResponse.json({ added: await loadFirstBatch() });
  if (b?.action === "add" && Array.isArray(b.firms))
    return NextResponse.json({ added: await addDrafts(b.firms.slice(0, 200).map((f: Record<string, unknown>) => ({ firm: String(f.firm ?? "").slice(0, 150), city: f.city ? String(f.city).slice(0, 80) : null, country: f.country, email: String(f.email ?? "").trim(), sourceUrl: String(f.sourceUrl ?? "").slice(0, 300) })).filter((f: { firm: string; sourceUrl: string }) => f.firm && f.sourceUrl), "added by hand") });
  const id = Math.floor(Number(b?.id));
  if (!Number.isFinite(id)) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  if (b?.action === "send") {
    if (b.confirm !== true) return NextResponse.json({ error: "Confirmation missing" }, { status: 400 });
    const r = await sendOne(id);
    return NextResponse.json({ result: r }, { status: r === "sent" ? 200 : 409 });
  }
  if (b?.action === "optout" || b?.action === "draft") return NextResponse.json({ ok: await setStatus(id, b.action) });
  return NextResponse.json({ error: "Bad request" }, { status: 400 });
}
