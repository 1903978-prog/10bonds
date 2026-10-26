import { NextResponse } from "next/server";
import { pageVisits } from "@/lib/accounts";
import { dailyHistory } from "@/lib/seo/daily";
import { dailyTable, refreshDailyTable } from "@/lib/seo/dailyTable";
import { notFound, seoAdmin } from "@/lib/seo/input";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Payload = { rows: Awaited<ReturnType<typeof dailyHistory>>; days: Awaited<ReturnType<typeof dailyTable>>; pages: Awaited<ReturnType<typeof pageVisits>> };
let cache: { at: number; data: Payload } | null = null;
let pending: Promise<Payload> | null = null;

function build(): Promise<Payload> {
  pending ??= Promise.all([dailyHistory().catch(() => []), dailyTable().catch(() => []), pageVisits(30).catch(() => [])])
    .then(([rows, days, pages]) => (cache = { at: Date.now(), data: { rows, days, pages } }).data)
    .finally(() => { pending = null; });
  return pending;
}

/** The saved daily search numbers, read from the database only (no live Google or Bing calls). Served from memory at once and refreshed behind the scenes. */
export async function GET() {
  if (!(await seoAdmin())) return notFound();
  if (cache && Date.now() - cache.at > 30_000) void build();
  const data = cache ? cache.data : await build();
  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
}

/** "Refresh now": pulls Google and Bing once and saves every day they report. */
export async function POST() {
  if (!(await seoAdmin())) return notFound();
  try {
    const saved = await refreshDailyTable();
    const days = await dailyTable();
    if (cache) cache = { at: cache.at, data: { ...cache.data, days } };
    return NextResponse.json({ saved, days });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
