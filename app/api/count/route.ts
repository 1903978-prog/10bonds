import { countAnonymous, accountsConfigured } from "@/lib/accounts";
import { geoOf } from "@/lib/geo";
import { allow, clientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

/**
 * Cookieless page counts for visitors who did not allow statistics: a number per day, page and country.
 * No identifier is read, set or stored, and the IP address is used only for the rate limit in memory.
 */
export async function POST(req: Request) {
  const done = new Response(null, { status: 204 });
  if (!accountsConfigured() || !allow(`count:${clientIp(req)}`, 120, 60_000)) return done;
  try {
    const b = await req.json();
    const path = typeof b?.path === "string" && b.path.startsWith("/") ? b.path.split(/[?#]/)[0].slice(0, 120) : null;
    const kind = b?.kind === "click" ? "click" : "page_view";
    if (!path || path.startsWith("/admin") || path.startsWith("/api")) return done;
    await countAnonymous(kind, path, geoOf(req.headers, b?.tz).country ?? "??");
  } catch {
    // Counting never breaks the site.
  }
  return done;
}
