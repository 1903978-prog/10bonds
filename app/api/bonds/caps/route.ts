import { NextResponse } from "next/server";
import { loadBonds } from "@/lib/bonds";
import { LIMITS } from "@/lib/limits";
import { ytmCaps } from "@/lib/ranking";

export const dynamic = "force-dynamic";

/** Highest target yield per duration step, so the yield slider can follow the horizon at once. */
export async function GET() {
  try {
    const data = await loadBonds();
    return NextResponse.json({ caps: ytmCaps(data.bonds, LIMITS.duration, LIMITS.ytm) }, { headers: { "Cache-Control": "public, max-age=600" } });
  } catch {
    return NextResponse.json({ caps: null }, { status: 503 });
  }
}
