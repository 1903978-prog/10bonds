import { NextResponse } from "next/server";
import { allow, clientIp } from "@/lib/rateLimit";
import { parseFilter } from "@/lib/bondFilter";
import { currentUser } from "@/lib/currentUser";
import { TERMS } from "@/lib/limits";
import { sliderFor } from "@/lib/sliderCache";
import { parseMethod } from "@/lib/frontierCache";

export const dynamic = "force-dynamic";

/**
 * The positions of the "Return & risk" slider (up to 30 frontier points) for a horizon and bond filter: what each one searches.
 * Everyone gets the risk limit and target to search; plans with the chart ("loss_chart") also get each position's return
 * and expected loss (the dots of the chart); the admin also gets the other figures and ISINs (the check table).
 * 202 while the positions are still being worked out.
 */
export async function GET(req: Request) {
  if (!allow(`slider:${clientIp(req)}`, 60, 60_000))
    return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
  const url = new URL(req.url);
  const duration = Number(url.searchParams.get("duration"));
  if (!TERMS.some((t) => t.duration === duration)) return NextResponse.json({ error: "Unknown horizon." }, { status: 400 });
  const user = await currentUser().catch(() => null);
  // Everyone gets the Methodology with spread rules; the admin can add m=m1 to compare with Methodology 1.
  const method = parseMethod(url.searchParams.get("m"), user?.isAdmin === true);
  let out;
  try {
    out = await sliderFor(parseFilter(url.searchParams), duration, method);
  } catch {
    return NextResponse.json({ error: "Bond data is not available right now. Please try again later." }, { status: 503 });
  }
  if (!out.positions) return NextResponse.json({ pending: true }, { status: 202, headers: { "Cache-Control": "no-store" } });
  // Return and loss per position also feed the two boxes under the slider, which every plan and visitors see.
  const chart = !user?.isAdmin;
  const positions = user?.isAdmin
    ? out.positions
    : out.positions.map((p) => ({ position: p.position, query: p.query, sameAs: p.sameAs, unavailable: p.unavailable, worstRisk: p.worstRisk, ...(chart ? { ytm: p.ytm, expectedLoss: p.expectedLoss } : {}) }));
  return NextResponse.json({ positions, ...(user?.isAdmin && out.cert ? { cert: out.cert } : {}) }, { headers: { "Cache-Control": "private, max-age=300" } });
}
