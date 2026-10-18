import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo/crawl";

// Search engines may read every public page; admin, account tools and the API stay out.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/redeem"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
