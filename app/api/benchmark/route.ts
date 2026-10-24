import { NextResponse } from "next/server";
import { currentUser } from "@/lib/currentUser";
import { getEtf, parseEtf, setEtf } from "@/lib/etfBenchmark";

export const dynamic = "force-dynamic";

/** The ETF comparison figure for the results box. Public; the admin saves a new one with POST. */
export async function GET() {
  return NextResponse.json(await getEtf(), { headers: { "Cache-Control": "public, max-age=300" } });
}

export async function POST(req: Request) {
  const u = await currentUser();
  if (!u?.isAdmin) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const b = parseEtf(await req.json().catch(() => null));
  if (!b) return NextResponse.json({ error: "Check the numbers and the date (YYYY-MM-DD)." }, { status: 400 });
  await setEtf(b);
  return NextResponse.json(b);
}
