import { NextResponse } from "next/server";
import { bestTable } from "@/lib/bestTable";

export const dynamic = "force-dynamic";

/** Highest target yield per risk level and duration step, read from the precomputed best-bonds table. */
export async function GET() {
  try {
    const table = await bestTable();
    return NextResponse.json({ caps: table.caps }, { headers: { "Cache-Control": "public, max-age=600" } });
  } catch {
    return NextResponse.json({ caps: null }, { status: 503 });
  }
}
