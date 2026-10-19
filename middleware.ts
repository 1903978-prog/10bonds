import { NextResponse, type NextRequest } from "next/server";
import { buildCsp, newNonce } from "@/lib/csp";

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
  const res = NextResponse.next({ request: { headers } });
  res.headers.set("Content-Security-Policy", csp);
  return res;
}

export const config = { matcher: ["/((?!_next/|favicon.ico).*)"] };
