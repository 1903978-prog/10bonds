import { NextResponse } from "next/server";
import { loadBonds } from "@/lib/bonds";
import { currentUser } from "@/lib/currentUser";
import { parsePortfolio } from "@/lib/portfolioCsv";
import { proAccess } from "@/lib/pro";
import { allow } from "@/lib/rateLimit";
import { cleanSettings, runEngine } from "@/lib/replacement";

export const dynamic = "force-dynamic";

// The uploaded portfolio is used for this one answer only: it is never stored or logged.
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  const access = await proAccess(user);
  if (access !== "active") return NextResponse.json({ error: access === "needs-plan" ? "Your professional access is approved. Subscribe to the Pro plan to use the tool." : "This tool is for approved professional accounts only." }, { status: 403 });
  if (!allow(`pro-replace:${user.id}`, 60, 60 * 60_000)) return NextResponse.json({ error: "Too many runs this hour. Please try again later." }, { status: 429 });

  const body = (await req.json().catch(() => null)) as { portfolio?: unknown; settings?: unknown } | null;
  const text = typeof body?.portfolio === "string" ? body.portfolio.slice(0, 200_000) : "";
  const { holdings, skipped } = parsePortfolio(text);
  if (holdings.length === 0) return NextResponse.json({ error: "We could not find any ISIN with an amount. Use one line per bond: ISIN and amount.", skipped }, { status: 400 });

  let data;
  try {
    data = await loadBonds();
  } catch {
    return NextResponse.json({ error: "Bond data is not available right now. Please try again later." }, { status: 503 });
  }
  const result = runEngine(holdings, data.bonds, cleanSettings(body?.settings));
  return NextResponse.json({ ...result, skipped, source: data.source, asOf: data.asOf }, { headers: { "Cache-Control": "no-store" } });
}
