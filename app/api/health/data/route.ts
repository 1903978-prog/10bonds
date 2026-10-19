import { NextResponse } from "next/server";
import { bondDataHealth } from "@/lib/bonds";

export const dynamic = "force-dynamic";

/** Is the bond copy fresh and complete? 200 when it is, 500 with the problems in words when not. Counts only. */
export async function GET() {
  try {
    const h = await bondDataHealth();
    return NextResponse.json(h, { status: h.ok ? 200 : 500, headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ ok: false, problems: [`Bond data could not be read: ${(e as Error).message}`] }, { status: 503 });
  }
}
