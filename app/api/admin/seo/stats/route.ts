import { NextResponse } from "next/server";
import { bing, google, type Engine } from "@/lib/seo/engines";
import { serviceAccount } from "@/lib/seo/google";
import { notFound, seoAdmin } from "@/lib/seo/input";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

let cache: { at: number; body: { google: Engine; bing: Engine; at: string } } | null = null;
const TTL = 30 * 60_000; // both sources update about once a day

/** Headline Google Search Console and Bing Webmaster figures for the top of the SEO page. ?fresh=1 skips the cache. */
export async function GET(req: Request) {
  if (!(await seoAdmin())) return notFound();
  const fresh = new URL(req.url).searchParams.get("fresh") === "1";
  let body = cache && !fresh && Date.now() - cache.at < TTL ? cache.body : null;
  if (!body) {
    const [g, b] = await Promise.all([google(), bing()]);
    body = { google: g, bing: b, at: new Date().toISOString() };
    // Kept only when both answered, so a newly added key shows on the next load.
    cache = g.state === "connected" && b.state === "connected" ? { at: Date.now(), body } : null;
  }
  return NextResponse.json({ ...body, serviceAccount: serviceAccount()?.client_email ?? null }, { headers: { "Cache-Control": "no-store" } });
}
