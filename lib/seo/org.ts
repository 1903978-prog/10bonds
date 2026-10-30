import { COMPANY } from "@/lib/legal";
import { SITE_URL } from "@/lib/seo/crawl";

// The one Organization block every page's structured data uses: name, logo and the legal entity behind the
// site with its registered address (from lib/legal.ts, the same text as the privacy page). No social profiles
// (`sameAs`) are listed because the site has none yet; add them here when they exist.
export const ORGANIZATION = {
  "@type": "Organization",
  name: "10BONDS",
  url: SITE_URL,
  logo: `${SITE_URL}/icon.svg`,
  legalName: COMPANY.legalName,
  email: COMPANY.privacyEmail,
} as const;
