import { NextResponse } from "next/server";
import { storedPsi } from "@/lib/seo/assess";
import { notFound, seoAdmin } from "@/lib/seo/input";
import { LOCALES } from "@/lib/seo/locales";
import { readCrawl } from "@/lib/seo/summary";
import { issuesOf } from "@/lib/seo/technical";

export const dynamic = "force-dynamic";

/** Pages & technical and Speed tabs: the last crawl with its problems, and the last speed measure per language. */
export async function GET() {
  if (!(await seoAdmin())) return notFound();
  const [crawl, psi] = await Promise.all([readCrawl(), Promise.all(LOCALES.map(async (m) => ({ market: m, ...(await storedPsi(m).catch(() => ({ psi: null, error: null }))) })))]);
  return NextResponse.json({ crawl, issues: crawl ? issuesOf(crawl) : [], psi }, { headers: { "Cache-Control": "no-store" } });
}
