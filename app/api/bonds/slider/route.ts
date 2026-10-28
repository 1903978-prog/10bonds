import { NextResponse } from "next/server";
import { allow, clientIp } from "@/lib/rateLimit";
import { parseFilter } from "@/lib/bondFilter";
import { currentUser } from "@/lib/currentUser";
import { isExactYear, isTermHorizon } from "@/lib/limits";
import { canExactYear } from "@/lib/planFeatures";
import { sliderFor } from "@/lib/sliderCache";
import { bandTableOf, engineOf, methodologyFor, usesBands } from "@/lib/methodologyChoice";
import { bareBandPositions, positionsOfBands, servedBands } from "@/lib/riskBandsServe";

export const dynamic = "force-dynamic";

/**
 * The positions of the "Return & risk" slider (up to 30 frontier points) for a horizon and bond filter: what each one searches.
 * Everyone gets the risk limit and target to search; plans with the chart ("loss_chart") also get each position's return
 * and expected loss (the dots of the chart); the admin also gets the other figures and ISINs (the check table).
 * 202 while the positions are still being worked out.
 */
export async function GET(req: Request) {
  if (!allow(`slider:${clientIp(req)}`, 300, 60_000))
    return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429, headers: { "Retry-After": "5" } });
  const url = new URL(req.url);
  const duration = Number(url.searchParams.get("duration"));
  const exactYear = !isTermHorizon(duration) && isExactYear(duration);
  if (!isTermHorizon(duration) && !exactYear) return NextResponse.json({ error: "Unknown horizon." }, { status: 400 });
  const user = await currentUser().catch(() => null);
  if (exactYear && !(await canExactYear(user).catch(() => false)))
    return NextResponse.json({ error: "Picking an exact year is included in Plus.", upgrade: true }, { status: 403, headers: { "Cache-Control": "no-store" } });
  // Everyone gets the methodology chosen at /admin/methodology; the admin can add m=1..5 to compare.
  const meth = await methodologyFor(url.searchParams.get("m"), user?.isAdmin === true);
  const method = engineOf(meth);
  const tag = user?.isAdmin ? { methodology: meth } : {};
  let out;
  try {
    const filter = parseFilter(url.searchParams);
    // Everyone: the 30 risk-band positions (lib/riskBands.ts), read from storage. A cold start without a stored set gets the bands without figures.
    if (usesBands(meth)) {
      const bandCfg = await bandTableOf(meth);
      const sv = await servedBands(filter, duration, bandCfg);
      // An exact year not stored yet (precompute running): the finder waits and asks again.
      if (exactYear && !sv) return NextResponse.json({ pending: true }, { status: 202, headers: { "Cache-Control": "no-store" } });
      const cfg = sv?.cfg ?? bandCfg;
      const all = sv ? positionsOfBands(sv) : bareBandPositions(cfg);
      // The bonds themselves come with the list (tier-shaped); the positions carry figures only, so no ISIN reaches a visitor here.
      const positions = user?.isAdmin ? all : all.map(({ isins: _isins, ...p }) => ({ ...p, isins: [] as string[] }));
      return NextResponse.json({ positions, ...tag, ...(sv?.stale ? { stale: true } : {}), ...(sv && user?.isAdmin ? { flags: { nonMonotonic: sv.stored.nonMonotonic, candidates: sv.stored.candidates } } : {}) }, { headers: { "Cache-Control": "private, max-age=60" } });
    }
    out = await sliderFor(filter, duration, method);
  } catch {
    return NextResponse.json({ error: "Bond data is not available right now. Please try again later." }, { status: 503 });
  }
  if (!out.positions) return NextResponse.json({ pending: true }, { status: 202, headers: { "Cache-Control": "no-store" } });
  // Return and loss per position also feed the two boxes under the slider, which every plan and visitors see.
  const chart = !user?.isAdmin;
  const positions = user?.isAdmin
    ? out.positions
    : out.positions.map((p) => ({ position: p.position, query: p.query, sameAs: p.sameAs, unavailable: p.unavailable, worstRisk: p.worstRisk, ...(chart ? { ytm: p.ytm, expectedLoss: p.expectedLoss } : {}) }));
  return NextResponse.json({ positions, ...tag, ...(user?.isAdmin && out.cert ? { cert: out.cert } : {}) }, { headers: { "Cache-Control": "private, max-age=300" } });
}
