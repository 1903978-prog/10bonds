import { NextResponse } from "next/server";
import { allow, clientIp } from "@/lib/rateLimit";
import { parseFilter } from "@/lib/bondFilter";
import { currentUser } from "@/lib/currentUser";
import { TERMS } from "@/lib/limits";
import { sliderFor } from "@/lib/sliderCache";

export const dynamic = "force-dynamic";

/**
 * The 30 positions of the "Return & risk" slider for a horizon and bond filter: what each one searches.
 * Everyone gets the risk limit and target to search; the admin also gets the figures and ISINs (the check table).
 * 202 while the positions are still being worked out.
 */
export async function GET(req: Request) {
  if (!allow(`slider:${clientIp(req)}`, 60, 60_000))
    return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
  const url = new URL(req.url);
  const duration = Number(url.searchParams.get("duration"));
  if (!TERMS.some((t) => t.duration === duration)) return NextResponse.json({ error: "Unknown horizon." }, { status: 400 });
  let out;
  try {
    out = await sliderFor(parseFilter(url.searchParams), duration);
  } catch {
    return NextResponse.json({ error: "Bond data is not available right now. Please try again later." }, { status: 503 });
  }
  if (!out.positions) return NextResponse.json({ pending: true }, { status: 202, headers: { "Cache-Control": "no-store" } });
  const user = await currentUser().catch(() => null);
  const positions = user?.isAdmin
    ? out.positions
    : out.positions.map((p) => ({ position: p.position, query: p.query, sameAs: p.sameAs, unavailable: p.unavailable }));
  return NextResponse.json({ positions }, { headers: { "Cache-Control": "private, max-age=300" } });
}
