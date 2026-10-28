import { NextResponse } from "next/server";
import { allow, clientIp } from "@/lib/rateLimit";
import { currentUser } from "@/lib/currentUser";
import { activeSnapshot, holdingsOf } from "@/lib/sliderSnapshot";
import { publicPositions } from "@/lib/riskBandsServe";

export const dynamic = "force-dynamic";

/**
 * All 90 slider positions (30 per term) of the published snapshot in one read-only answer: no solver, no bond table, no calculation.
 * Visitors get figures only (no ISINs); the admin gets the ISINs too. 404 when no complete snapshot is published (the page then uses /api/bonds/slider).
 * The ETag is the snapshot id, so an open page re-asks cheaply and gets 304 until a new snapshot is published.
 */
export async function GET(req: Request) {
  if (!allow(`snap:${clientIp(req)}`, 300, 60_000)) return NextResponse.json({ error: "Too many requests." }, { status: 429, headers: { "Retry-After": "5" } });
  const url = new URL(req.url);
  const currency = url.searchParams.get("currency") === "USD" ? "USD" : "EUR";
  const size = url.searchParams.get("size") === "1k" ? "1k" : "100k";
  const snap = await activeSnapshot({ currency, size });
  if (!snap) return NextResponse.json({ none: true }, { status: 404, headers: { "Cache-Control": "no-store" } });
  const user = await currentUser().catch(() => null);
  const etag = `"snap-${snap.id}${user?.isAdmin ? "-a" : ""}"`;
  if (req.headers.get("if-none-match") === etag) return new NextResponse(null, { status: 304, headers: { ETag: etag, "Cache-Control": "private, max-age=0, must-revalidate" } });
  let horizons = snap.horizons;
  if (user?.isAdmin) {
    const h = await holdingsOf(snap.id).catch(() => null);
    if (h) {
      const withIsins = (name: string, key: "short" | "mid" | "long") => snap.horizons[key].map((p) => ({ ...p, isins: h.get(`${name}:${p.position}`) ?? [] }));
      horizons = { short: withIsins("SHORT", "short"), mid: withIsins("MEDIUM", "mid"), long: withIsins("LONG", "long") };
    }
  }
  // Everyone but the admin gets the valid positions only, renumbered 1..n per term (the admin sees all 30 with their status).
  if (!user?.isAdmin) horizons = { short: publicPositions(horizons.short), mid: publicPositions(horizons.mid), long: publicPositions(horizons.long) };
  return NextResponse.json({ id: snap.id, dataAsOf: snap.dataAsOf, publishedAt: snap.publishedAt, horizons }, { headers: { ETag: etag, "Cache-Control": "private, max-age=0, must-revalidate" } });
}
