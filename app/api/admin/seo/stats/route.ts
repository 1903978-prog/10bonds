import { NextResponse } from "next/server";
import { bingKpis, type SearchKpis } from "@/lib/seo/bing";
import { gscSiteFor, searchConsoleKpis, serviceAccount } from "@/lib/seo/google";
import { notFound, seoAdmin } from "@/lib/seo/input";
import { getSeoSetting } from "@/lib/seo/store";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Engine = { state: "not_connected" | "no_property" | "error" | "connected"; message: string; data: SearchKpis | null };
let cache: { at: number; body: { google: Engine; bing: Engine; at: string } } | null = null;
const TTL = 30 * 60_000; // both sources update about once a day

async function google(): Promise<Engine> {
  const sa = serviceAccount();
  if (!sa) return { state: "not_connected", message: "Google is not connected yet.", data: null };
  try {
    // The 10bonds.com property shared with the service account; the Performance tab setting is the fallback.
    const site = (await gscSiteFor()) ?? (await getSeoSetting("gsc_site"));
    if (!site) return { state: "no_property", message: `Add ${sa.client_email} as a user in Search Console.`, data: null };
    return { state: "connected", message: site, data: await searchConsoleKpis(site) };
  } catch (e) {
    return { state: "error", message: (e as Error).message, data: null };
  }
}

async function bing(): Promise<Engine> {
  const key = process.env.BING_WEBMASTER_API_KEY;
  if (!key) return { state: "not_connected", message: "Bing is not connected yet.", data: null };
  try {
    return { state: "connected", message: "www.10bonds.com", data: await bingKpis(key) };
  } catch (e) {
    return { state: "error", message: (e as Error).message, data: null };
  }
}

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
