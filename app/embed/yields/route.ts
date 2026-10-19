import { loadBonds } from "@/lib/bonds";
import { widgetHtml, widgetLang, yieldGrid } from "@/lib/seo/widget";

// The embeddable yields widget. Any website may show it in a frame (see /widget); it holds no script and no cookie.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const data = await loadBonds().catch(() => null);
  const html = widgetHtml(yieldGrid(data?.bonds ?? []), data?.asOf ?? null, widgetLang(q.get("lang")), q.get("theme") === "dark");
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      // Other sites load it often: browsers and caches may keep it for an hour (the data changes once a day).
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
      "X-Robots-Tag": "noindex",
    },
  });
}
