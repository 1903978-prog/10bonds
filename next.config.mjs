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
  // The exact solver (WebAssembly) is loaded from node_modules at run time, so it and its .wasm file ship with the server.
  serverExternalPackages: ["highs"],
  outputFileTracingIncludes: { "/api/**/*": ["./node_modules/highs/**", "./lib/highsWorker.mjs"] },
  poweredByHeader: false,
  // The page's own style rules travel inside the HTML, so a first visit does not wait for a second request before it can draw (page speed, 30/10/2026).
  experimental: { inlineCss: true },
  // Title, description, canonical and hreflang always in the page <head> for every visitor and crawler
  // (no streamed metadata), so every search engine and the SEO check read them without running scripts.
  htmlLimitedBots: /.*/,
  // French guides replaced by the owner's articles on 19 Oct 2026 (lib/seo/guidesOwnerFr.ts).
  async redirects() {
    return [
      ["oat-obligations-etat-francaises", "oat-obligations-etat"],
      ["rendement-a-l-echeance", "calcul-rendement-obligation"],
      ["obligations-ou-etf", "obligations-ou-etf-obligataires"],
    ].map(([from, to]) => ({ source: `/fr/guides/${from}`, destination: `/fr/guides/${to}`, permanent: true }))
      // The menu says "Plans"; the page stays at /pricing so old links keep working.
      .concat({ source: "/plans", destination: "/pricing", permanent: false })
      // Admin pages our notes and specs name under other paths: the promised path moves to the page that holds the content.
      .concat([
        ["/admin/backlinks", "/admin/seo?tab=backlinks"],
        ["/admin/seo-roadmap", "/admin/seo?tab=overview"],
        ["/admin/seo-score", "/admin/seo?tab=overview"],
        ["/admin/plan-features", "/admin/features"],
        ["/admin/legal", "/admin/legal-risk"],
        ["/admin/risk-matrix", "/admin/methodology"],
      ].map(([source, destination]) => ({ source, destination, permanent: true })))
      // The sample company is fictional (ACMA GmbH); the old real-bond links keep working.
      .concat(["risk-assessment", "report"].map((r) => ({ source: `/${r}/FR0013482841`, destination: `/${r}/DE000ACMA031`, permanent: true })));
  },
  // Browsers and crawlers ask for /favicon.ico by habit; answer with the same icon the pages name, instead of a 404.
  async rewrites() {
    return [{ source: "/favicon.ico", destination: "/icon.svg" }];
  },
  async headers() {
    // /embed/... is shown inside other websites' frames, so it skips the "never in a frame" and same-origin rules.
    // It keeps "require-corp": a page with that rule (ours included) may only frame pages that also have it.
    const embed = new Set(["X-Frame-Options", "Cross-Origin-Resource-Policy", "Cross-Origin-Opener-Policy"]);
    // Files that rarely change: the browser and any shared cache may keep them a day and show the old copy for a week while it re-checks.
    const day = [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }];
    const hour = [{ key: "Cache-Control", value: "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400" }];
    return [
      { source: "/((?!embed/).*)", headers: securityHeaders },
      // Signed-out page caching headers are set in middleware.ts (a first-time visitor's page may be shared-cached for minutes).
      { source: "/og.png", headers: day },
      { source: "/carousel-:file.png", headers: day },
      { source: "/icon.svg", headers: day },
      { source: "/methodology/:file*", headers: day },
      { source: "/sitemap.xml", headers: hour },
      { source: "/robots.txt", headers: hour },
      { source: "/llms.txt", headers: hour },
      { source: "/embed/:path*", headers: [...securityHeaders.filter((h) => !embed.has(h.key)), { key: "Cross-Origin-Resource-Policy", value: "cross-origin" }] },
    ];
  },
};
export default nextConfig;
