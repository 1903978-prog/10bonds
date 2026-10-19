import { NextResponse, type NextRequest } from "next/server";

// Once the own domain answers, the deploy sets CANONICAL_HOST=10bonds.com and every page asked for on
// 10bonds.fly.dev or www.10bonds.com moves there permanently (one address for visitors and search engines). The API stays
// reachable on both, so health checks and the Stripe webhook keep working during the move.
export function middleware(req: NextRequest) {
  const canonical = process.env.CANONICAL_HOST;
  const host = (req.headers.get("host") ?? "").toLowerCase().split(":")[0];
  if (!canonical || host === canonical || !(host.endsWith(".fly.dev") || host === `www.${canonical}`)) return NextResponse.next();
  if (req.nextUrl.pathname.startsWith("/api/") || (req.method !== "GET" && req.method !== "HEAD")) return NextResponse.next();
  return NextResponse.redirect(`https://${canonical}${req.nextUrl.pathname}${req.nextUrl.search}`, 308);
}

export const config = { matcher: ["/((?!_next/|favicon.ico).*)"] };
