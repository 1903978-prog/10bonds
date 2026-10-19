import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo/crawl";
import { AI_CRAWLERS } from "@/lib/seo/geo";

const PRIVATE = ["/admin", "/api/", "/redeem", "/account"];

// Search engines may read every public page; admin, account tools and the API stay out. The search and
// user-directed crawlers of AI assistants (ChatGPT, Claude, Perplexity, Copilot via Bing, Google) are named
// explicitly so they keep access to the public pages whatever the general rule says (Livio, 19 Oct 2026).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PRIVATE },
      { userAgent: AI_CRAWLERS, allow: "/", disallow: PRIVATE },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
