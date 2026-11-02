import { NextResponse } from "next/server";
import { publicRatings } from "@/lib/creditResearchDb";

export const dynamic = "force-dynamic";

const ISIN = /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/;

/** Public: IR and BR text only for ratings whose server-side publication gate passed (or a person validated). Never the basis, model or answer.
 *  Pasted or unverified values are never returned here (owner, 2/11/2026). */
export async function GET(req: Request) {
  const isins = (new URL(req.url).searchParams.get("isins") ?? "").split(",").map((s) => s.trim()).filter((s) => ISIN.test(s)).slice(0, 60);
  if (!isins.length) return NextResponse.json({ ratings: {} });
  try {
    const { ratings } = await publicRatings(isins);
    const out: Record<string, { ir: string | null; br: string | null }> = {};
    for (const [i, r] of Object.entries(ratings)) if (r.ir || r.br) out[i] = { ir: r.ir, br: r.br };
    return NextResponse.json({ ratings: out }, { headers: { "Cache-Control": "public, max-age=30" } });
  } catch {
    return NextResponse.json({ ratings: {} });
  }
}
