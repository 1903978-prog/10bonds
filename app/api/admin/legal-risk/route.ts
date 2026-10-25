import { NextResponse } from "next/server";
import { currentUser } from "@/lib/currentUser";
import { dashboardData } from "@/lib/legalRisk/dashboard";
import { saveReview } from "@/lib/legalRisk/reviews";
import { CRITERIA } from "@/lib/legalRisk/register";

export const dynamic = "force-dynamic";

async function admin() {
  const u = await currentUser();
  return u?.isAdmin && u.adminState === "ok" ? u : null;
}

/** Fresh dashboard data and technical check results ("Run technical checks"). Admin only. */
export async function GET() {
  if (!(await admin())) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(await dashboardData(), { headers: { "Cache-Control": "no-store" } });
}

/** Saves tracking, the reviewer's approval, or a reassessment stamp for one criterion. */
export async function POST(req: Request) {
  if (!(await admin())) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const b = (await req.json().catch(() => null)) as { id?: number; action?: string; tracking?: string; reviewer?: string; reviewNote?: string; clearReview?: boolean } | null;
  const id = Number(b?.id);
  if (!b || !CRITERIA.some((c) => c.id === id)) return NextResponse.json({ error: "Unknown criterion" }, { status: 400 });
  const today = new Date().toISOString().slice(0, 10);
  if (b.action === "reassess") await saveReview(id, { reassessedAt: today });
  else if (b.action === "review") {
    if (b.clearReview) await saveReview(id, { reviewer: "", reviewedAt: "" });
    else if (!b.reviewer?.trim()) return NextResponse.json({ error: "Name the reviewer." }, { status: 400 });
    else await saveReview(id, { reviewer: b.reviewer, reviewedAt: today, reviewNote: b.reviewNote ?? "" });
  } else if (b.action === "tracking") await saveReview(id, { tracking: b.tracking });
  else return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  return NextResponse.json(await dashboardData(), { headers: { "Cache-Control": "no-store" } });
}
