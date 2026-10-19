import { NextResponse } from "next/server";
import { isoWeek, MANUAL_ASSISTANTS, parseManual } from "@/lib/seo/citationManual";
import { geoReport, readManual } from "@/lib/seo/geoReport";
import { notFound, seoAdmin } from "@/lib/seo/input";
import { setSeoSetting } from "@/lib/seo/store";

export const dynamic = "force-dynamic";

/** AI Visibility: the GEO score out of 100, its checks, and visitors arriving from AI assistants. Admin only. */
export async function GET() {
  if (!(await seoAdmin())) return notFound();
  return NextResponse.json(await geoReport(), { headers: { "Cache-Control": "no-store" } });
}

/** Save the answers Livio pasted from ChatGPT or Claude for this week. Keeps the last 12 weeks. */
export async function POST(req: Request) {
  if (!(await seoAdmin())) return notFound();
  const b = (await req.json().catch(() => ({}))) as { assistant?: string; text?: string };
  const a = MANUAL_ASSISTANTS.find((x) => x.id === b.assistant);
  if (!a || typeof b.text !== "string" || !b.text.trim()) return NextResponse.json({ error: "Paste the answers first." }, { status: 400 });
  const parsed = parseManual(b.text.slice(0, 400_000));
  if (!parsed.answered) return NextResponse.json({ error: 'No answers found. Each answer must start with its number, like "Q1:".' }, { status: 400 });
  const manual = await readManual();
  const week = isoWeek();
  manual[week] = { ...manual[week], [a.id]: { ...parsed, at: new Date().toISOString() } };
  for (const k of Object.keys(manual).sort().reverse().slice(12)) delete manual[k];
  await setSeoSetting("citation_manual", JSON.stringify(manual));
  return NextResponse.json({ ok: true, week, answered: parsed.answered, cited: parsed.cited });
}
