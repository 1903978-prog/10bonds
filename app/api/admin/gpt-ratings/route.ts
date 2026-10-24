import { NextResponse } from "next/server";
import { currentUser } from "@/lib/currentUser";
import { loadGptRatings, saveGptRatings } from "@/lib/gptRatingsDb";

export const dynamic = "force-dynamic";

async function admin() {
  const u = await currentUser();
  return u?.isAdmin && u.adminState === "ok" ? u : null;
}

/** GPT's ratings pasted back by the admin (ISIN -> rating, basis, date). Admin only. */
export async function GET() {
  if (!(await admin())) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ratings: await loadGptRatings() }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  if (!(await admin())) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const b = await req.json().catch(() => null);
  const saved = await saveGptRatings(b?.ratings);
  if (!saved) return NextResponse.json({ error: "No ratings found" }, { status: 400 });
  return NextResponse.json({ ok: true, saved, ratings: await loadGptRatings() });
}
