import { NextResponse } from "next/server";
import { currentUser } from "@/lib/currentUser";
import { loadPromo, savePromo } from "@/lib/promoServer";

export const dynamic = "force-dynamic";

async function admin() {
  const u = await currentUser();
  return u?.isAdmin && u.adminState === "ok" ? u : null;
}

/** The running promo (percent off the first month, start, end). Admin only. */
export async function GET() {
  if (!(await admin())) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ promo: await loadPromo() }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  if (!(await admin())) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const b = await req.json().catch(() => null);
  const p = b?.promo;
  const pct = Number(p?.percent);
  if (!p || !Number.isFinite(pct) || pct < 1 || pct > 99 || !Number.isFinite(Date.parse(p.startsAt)) || !Number.isFinite(Date.parse(p.endsAt)))
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  return NextResponse.json({ ok: true, promo: await savePromo({ enabled: p.enabled !== false, percent: pct, startsAt: p.startsAt, endsAt: p.endsAt }) });
}
