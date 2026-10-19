/** @type {import('next').NextConfig} */

// The Content-Security-Policy is set per request in middleware.ts (it needs a fresh nonce every time).
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
];

const nextConfig = {
  // Lint runs as its own CI step before every deploy (npm run lint); the Fly build does not repeat it.
  eslint: { ignoreDuringBuilds: true },
  output: "standalone",
  poweredByHeader: false,
  // Title, description, canonical and hreflang always in the page <head> for every visitor and crawler
  // (no streamed metadata), so every search engine and the SEO check read them without running scripts.
  htmlLimitedBots: /.*/,
  // French guides replaced by Livio's articles on 19 Oct 2026 (lib/seo/guidesLivioFr.ts).
  async redirects() {
    return [
      ["oat-obligations-etat-francaises", "oat-obligations-etat"],
      ["rendement-a-l-echeance", "calcul-rendement-obligation"],
      ["obligations-ou-etf", "obligations-ou-etf-obligataires"],
    ].map(([from, to]) => ({ source: `/fr/guides/${from}`, destination: `/fr/guides/${to}`, permanent: true }));
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};
export default nextConfig;
