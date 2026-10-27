import { bondSitemapFiles } from "@/lib/seo/bondSitemap";

export const dynamic = "force-dynamic";

/** /bonds/sitemaps/1.xml, 2.xml ...: up to 3,000 bonds (12,000 addresses) each, kept compressed. */
export async function GET(_req: Request, { params }: { params: Promise<{ n: string }> }) {
  const n = Number.parseInt((await params).n, 10);
  const files = await bondSitemapFiles();
  const file = Number.isInteger(n) ? files[n - 1] : undefined;
  if (!file) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(file), {
    headers: { "Content-Type": "application/xml; charset=utf-8", "Content-Encoding": "gzip", "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400" },
  });
}
