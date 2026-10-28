import { NextResponse } from "next/server";
import { besPublic } from "@/lib/bes/store";

export const dynamic = "force-dynamic";

/**
 * Read API for the bond card: GET /api/bonds/efficiency?code=EUR00001 (or ?isin=). Returns only the Bond Efficiency Score (0-100), its plain label,
 * the status and the peer count; spreads and default figures stay admin only. The score is a relative ranking among comparable bonds, not advice.
 */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const key = (q.get("code") ?? q.get("isin") ?? "").trim().toUpperCase();
  if (!/^[A-Z0-9]{8,12}$/.test(key)) return NextResponse.json({ error: "code or isin required" }, { status: 400 });
  try {
    const r = await besPublic(key);
    return NextResponse.json(r ?? { score: null, status: "unavailable", label: null, peers: 0 }, { headers: { "Cache-Control": "public, max-age=300" } });
  } catch {
    return NextResponse.json({ score: null, status: "unavailable", label: null, peers: 0 }, { status: 200 });
  }
}
