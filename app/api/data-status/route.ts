import { NextResponse } from "next/server";
import { priceFreshnessReport } from "@/lib/bonds";

export const dynamic = "force-dynamic";

/** Public: when the bond prices were last updated (the newest push of the nightly copy). Counts and times only, nothing about bonds. */
export async function GET() {
  const report = await priceFreshnessReport().catch(() => null);
  const times = (report?.rows ?? []).map((r) => r.lastPush).filter((x): x is string => !!x).sort();
  return NextResponse.json({ lastUpdate: times.length ? times[times.length - 1] : null }, { headers: { "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=3600" } });
}
