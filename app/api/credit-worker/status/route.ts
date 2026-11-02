import { NextResponse } from "next/server";
import { workerStatus } from "@/lib/creditResearchDb";

export const dynamic = "force-dynamic";

/** Public, no secrets: is a research worker connected, which version, how many jobs finished. Used to check the Lenovo without a login. */
export async function GET() {
  try {
    return NextResponse.json(await workerStatus(), { headers: { "cache-control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}
