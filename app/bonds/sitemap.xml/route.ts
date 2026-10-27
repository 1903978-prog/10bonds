import { bondSitemapFiles, bondSitemapIndexXml } from "@/lib/seo/bondSitemap";

export const dynamic = "force-dynamic";

/** /bonds/sitemap.xml: the index of the bond sitemap files (lib/seo/bondSitemap.ts). */
export async function GET() {
  const files = await bondSitemapFiles();
  return new Response(bondSitemapIndexXml(files.length), {
    status: files.length ? 200 : 503,
    headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": files.length ? "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400" : "no-store" },
  });
}
