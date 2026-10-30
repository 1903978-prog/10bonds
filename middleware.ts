import { NextResponse, type NextRequest } from "next/server";
import { buildCsp, newNonce } from "@/lib/csp";

// Pages that look the same for every visitor without a cookie.
const PUBLIC_PAGE = /^\/(?:(?:it|fr|de)(?:\/.*)?|pricing|about|how-we-calculate|disclaimer|selection-methodology|ranking-methodology|knowledge(?:\/.*)?|bonds\/[A-Za-z0-9]{12}|terms|privacy|cookies)?$/;

// Once the own domain answers, the deploy sets CANONICAL_HOST=10bonds.com and every page asked for on
// 10bonds.fly.dev or www.10bonds.com moves there permanently (one address for visitors and search engines). The API stays
// reachable on both, so health checks and the Stripe webhook keep working during the move.
export function middleware(req: NextRequest) {
  const canonical = process.env.CANONICAL_HOST;
  const host = (req.headers.get("host") ?? "").toLowerCase().split(":")[0];
  const moves = canonical && host !== canonical && (host.endsWith(".fly.dev") || host === `www.${canonical}`)
    && !req.nextUrl.pathname.startsWith("/api/") && (req.method === "GET" || req.method === "HEAD");
  if (moves) return NextResponse.redirect(`https://${canonical}${req.nextUrl.pathname}${req.nextUrl.search}`, 308);
  return withCsp(req);
}

// Next.js reads the policy from the request and stamps its nonce on every script it writes into the page.
function withCsp(req: NextRequest) {
  const csp = buildCsp(newNonce(), undefined, req.nextUrl.pathname.startsWith("/embed/"));
  const headers = new Headers(req.headers);
  headers.set("content-security-policy", csp);
  // The root layout reads the path to write the page language in <html lang>, so /it, /fr and /de are declared as such.
  headers.set("x-pathname", req.nextUrl.pathname);
  // currentUser() reads the real method from here: the read-only test admin may only read (GET/HEAD). Set by us, never taken from the caller.
  headers.set("x-method", req.method);
  const res = NextResponse.next({ request: { headers } });
  res.headers.set("Content-Security-Policy", csp);
  // A first-time visitor (no cookie at all) gets the same page as everyone else, so a shared cache may keep it for a few minutes and show the
  // last copy while it fetches a new one (the owner, 30/10/2026). Anyone with a cookie (signed in, language chosen) is never cached. The copy and its
  // nonce stay together, so the page still passes its own content rules.
  const path = req.nextUrl.pathname;
  const signedOutPage = !req.cookies.has("tb_session") && !/^\/(?:api\/|admin|account|login|signup|forgot-password|reset-password|redeem|pro|embed\/|_next\/|og\.png|sitemap\.xml|robots\.txt|llms\.txt)/.test(path) && !/\.[a-z0-9]{2,5}$/i.test(path);
  // A signed-out visitor's page may sit in the browser's back/forward memory; "no-cache" still makes the browser ask the server before reusing it over the network.
  if (signedOutPage) res.headers.set("Cache-Control", "private, no-cache, max-age=0");
  if (req.method === "GET" && !req.headers.get("cookie") && !req.headers.get("referer") && !req.nextUrl.search && PUBLIC_PAGE.test(req.nextUrl.pathname)) {
    res.headers.set("Cache-Control", "public, max-age=0, s-maxage=300, stale-while-revalidate=600");
    res.headers.set("Vary", "Cookie, Referer, Accept-Encoding");
  }
  return res;
}

export const config = { matcher: ["/((?!_next/|favicon.ico).*)"] };
