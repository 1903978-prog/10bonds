import { NextResponse } from "next/server";
import { searchTable } from "@/lib/searchData";
import { parseFilters } from "@/lib/filters";

export const dynamic = "force-dynamic";

/** Highest target yield per risk level and duration step, read from the precomputed best-bonds table. */
export async function GET(req: Request) {
  try {
    const table = await searchTable(parseFilters(new URL(req.url).searchParams));
    return NextResponse.json({ caps: table.caps }, { headers: { "Cache-Control": "public, max-age=600" } });
  } catch {
    return NextResponse.json({ caps: null }, { status: 503 });
  }
}
