import { NextResponse } from "next/server";
import { pageVisits } from "@/lib/accounts";
import { dailyHistory } from "@/lib/seo/daily";
import { dailyTable, refreshDailyTable } from "@/lib/seo/dailyTable";
import { notFound, seoAdmin } from "@/lib/seo/input";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** The saved daily search numbers, read from the database only (no live Google or Bing calls). */
export async function GET() {
  if (!(await seoAdmin())) return notFound();
  const [rows, days, pages] = await Promise.all([dailyHistory().catch(() => []), dailyTable().catch(() => []), pageVisits(30).catch(() => [])]);
  return NextResponse.json({ rows, days, pages }, { headers: { "Cache-Control": "no-store" } });
}

/** "Refresh now": pulls Google and Bing once and saves every day they report. */
export async function POST() {
  if (!(await seoAdmin())) return notFound();
  try {
    const saved = await refreshDailyTable();
    return NextResponse.json({ saved, days: await dailyTable() });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
