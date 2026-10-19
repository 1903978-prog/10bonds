import { NextResponse } from "next/server";
import { accountsConfigured } from "@/lib/accounts";
import { notFound, seoAdmin } from "@/lib/seo/input";
import { seoSummary } from "@/lib/seo/summary";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Top of the SEO & GEO page: both scores, history, connected sources and next steps. Admin only. */
export async function GET() {
  if (!(await seoAdmin())) return notFound();
  if (!accountsConfigured()) return NextResponse.json({ error: "The accounts database is not connected, so SEO data cannot be stored." }, { status: 503 });
  return NextResponse.json(await seoSummary(), { headers: { "Cache-Control": "no-store" } });
}
