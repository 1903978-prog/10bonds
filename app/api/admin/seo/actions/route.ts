import { NextResponse } from "next/server";
import { bad, notFound, oneOf, seoAdmin } from "@/lib/seo/input";
import { LOCALES } from "@/lib/seo/locales";
import { DIMENSIONS } from "@/lib/seo/rubric";
import { setActionStatus } from "@/lib/seo/store";

export const dynamic = "force-dynamic";

// One roadmap per market: keys look like "it:guides.coverage".
const KEYS = new Set(LOCALES.flatMap((m) => DIMENSIONS.flatMap((d) => d.criteria.map((c) => `${m}:${d.id}.${c.id}`))));

export async function POST(req: Request) {
  if (!(await seoAdmin())) return notFound();
  const b = await req.json().catch(() => ({}));
  const status = oneOf(b?.status, ["not_started", "in_progress", "completed"] as const);
  if (!KEYS.has(b?.key) || !status) return bad("Unknown action or status.");
  await setActionStatus(b.key, status);
  return NextResponse.json({ ok: true });
}
