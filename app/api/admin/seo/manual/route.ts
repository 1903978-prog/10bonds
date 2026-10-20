import { NextResponse } from "next/server";
import { bad, seoMarketOf, notFound, seoAdmin, str } from "@/lib/seo/input";
import { criterionOf, type Points } from "@/lib/seo/rubric";
import { addManual, criterionChanges, manualHistory, markStale } from "@/lib/seo/store";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await seoAdmin())) return notFound();
  const q = new URL(req.url).searchParams;
  const market = seoMarketOf(q.get("market"));
  const dim = q.get("dimension") ?? "";
  const [history, changes] = await Promise.all([manualHistory(market, dim), criterionChanges(market, dim)]);
  return NextResponse.json({ history, changes }, { headers: { "Cache-Control": "no-store" } });
}

/**
 * Record a manual assessment. For a manual criterion it is the score; for an automatic criterion it is an override
 * and needs a justification. points = null withdraws the last manual score. Every entry is kept.
 */
export async function POST(req: Request) {
  const u = await seoAdmin();
  if (!u) return notFound();
  const b = await req.json().catch(() => ({}));
  const def = criterionOf(String(b?.dimension), String(b?.criterion));
  if (!def) return bad("Unknown criterion.");
  const points = b?.points === null ? null : [0, 1, 2].includes(b?.points) ? (b.points as Points) : undefined;
  if (points === undefined) return bad("Points must be 0, 1, 2 or empty.");
  const evidence = str(b?.evidence, 2000);
  const justification = str(b?.justification, 1000);
  if (points !== null && !evidence) return bad("Describe the evidence you looked at.");
  const override = def.method === "auto";
  if (override && points !== null && !justification) return bad("Overriding an automatic check needs a justification.");
  await addManual({ market: seoMarketOf(b?.market), dimension: b.dimension, criterion: b.criterion, points, override, evidence: evidence ?? "Manual score withdrawn.", justification }, u.email);
  await markStale();
  return NextResponse.json({ ok: true });
}
