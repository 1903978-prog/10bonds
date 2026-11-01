import { NextResponse } from "next/server";
import { loadGptRatings } from "@/lib/gptRatingsDb";

export const dynamic = "force-dynamic";

const ISIN = /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/;
let cache: { at: number; map: Awaited<ReturnType<typeof loadGptRatings>> } | null = null;

/** Public: only the stored IR and BR text for the ISINs asked for (never the basis, model or answer). Read from the same table the admin fills; cached for a minute. */
export async function GET(req: Request) {
  const isins = (new URL(req.url).searchParams.get("isins") ?? "").split(",").map((s) => s.trim()).filter((s) => ISIN.test(s)).slice(0, 60);
  if (!isins.length) return NextResponse.json({ ratings: {} });
  try {
    if (!cache || Date.now() - cache.at > 60_000) cache = { at: Date.now(), map: await loadGptRatings() };
  } catch {
    return NextResponse.json({ ratings: {} });
  }
  const ratings: Record<string, { ir: string | null; br: string | null }> = {};
  for (const i of isins) {
    const g = cache.map[i];
    if (g && (g.issuerRating || g.rating)) ratings[i] = { ir: g.issuerRating?.trim() || null, br: g.rating?.trim() || null };
  }
  return NextResponse.json({ ratings }, { headers: { "Cache-Control": "public, max-age=30" } });
}
