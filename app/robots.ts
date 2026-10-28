import type { MetadataRoute } from "next";
import { AI_CRAWLERS } from "@/lib/seo/geo";
import { BOND_SITEMAP } from "@/lib/seo/bondPages";

// The public address, whatever the machine is called (the old fly.dev name only redirects here).
const ORIGIN = `https://${process.env.CANONICAL_HOST || "10bonds.com"}`;
const PRIVATE = ["/admin", "/api/", "/redeem", "/account"];

// Search engines may read every public page; admin, account tools and the API stay out. The search and
// user-directed crawlers of AI assistants (ChatGPT, Claude, Perplexity, Copilot via Bing, Google) are named
// explicitly so they keep access to the public pages whatever the general rule says (the owner, 19 Oct 2026).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PRIVATE },
      { userAgent: AI_CRAWLERS, allow: "/", disallow: PRIVATE },
    ],
    sitemap: [`${ORIGIN}/sitemap.xml`, ORIGIN + BOND_SITEMAP],
  };
}
