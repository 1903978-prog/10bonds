import { NextResponse } from "next/server";
import { dailyHistory, takeSnapshot } from "@/lib/seo/daily";
import { notFound, seoAdmin } from "@/lib/seo/input";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** The saved daily search numbers. Opening the page also takes today's snapshot when it is missing. */
export async function GET() {
  if (!(await seoAdmin())) return notFound();
  await takeSnapshot().catch((e) => console.error("SEO snapshot on open failed:", (e as Error).message));
  return NextResponse.json({ rows: await dailyHistory() }, { headers: { "Cache-Control": "no-store" } });
}
