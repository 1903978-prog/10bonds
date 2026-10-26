import { NextResponse } from "next/server";
import { allow, clientIp } from "@/lib/rateLimit";
import { DEFAULT_FILTER } from "@/lib/bondFilter";
import { TERMS } from "@/lib/limits";
import { sliderFor } from "@/lib/sliderCache";

export const dynamic = "force-dynamic";

/** The landing's Yield vs. Expected Loss slide: the finder's own slider points for the default search (medium term, EUR), return and expected loss only. 202 while they are still being worked out. */
export async function GET(req: Request) {
  if (!allow(`landing-frontier:${clientIp(req)}`, 60, 60_000))
    return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
  const term = TERMS[1];
  let out;
  try {
    out = await sliderFor(DEFAULT_FILTER, term.duration);
  } catch {
    return NextResponse.json({ error: "Bond data is not available right now." }, { status: 503 });
  }
  if (!out.positions) return NextResponse.json({ pending: true }, { status: 202, headers: { "Cache-Control": "no-store" } });
  const points = out.positions
    .filter((p) => !p.unavailable && p.ytm !== null && p.expectedLoss !== null)
    .map((p) => ({ position: p.position, ytm: p.ytm as number, expectedLoss: p.expectedLoss as number }));
  return NextResponse.json({ years: term.duration, currency: DEFAULT_FILTER.currency, points }, { headers: { "Cache-Control": "public, max-age=300" } });
}
