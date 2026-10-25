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
  outputFileTracingIncludes: { "/api/**/*": ["./node_modules/highs/build/**"] },
  poweredByHeader: false,
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
      .concat({ source: "/plans", destination: "/pricing", permanent: false });
  },
  async headers() {
    // /embed/... is shown inside other websites' frames, so it skips the "never in a frame" and same-origin rules.
    // It keeps "require-corp": a page with that rule (ours included) may only frame pages that also have it.
    const embed = new Set(["X-Frame-Options", "Cross-Origin-Resource-Policy", "Cross-Origin-Opener-Policy"]);
    return [
      { source: "/((?!embed/).*)", headers: securityHeaders },
      { source: "/embed/:path*", headers: [...securityHeaders.filter((h) => !embed.has(h.key)), { key: "Cross-Origin-Resource-Policy", value: "cross-origin" }] },
    ];
  },
};
export default nextConfig;
