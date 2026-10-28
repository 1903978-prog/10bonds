import { NextResponse } from "next/server";
import { priceFreshnessByCurrency } from "@/lib/bonds";
import { currentUser } from "@/lib/currentUser";

export const dynamic = "force-dynamic";

export async function GET() {
  const u = await currentUser();
  if (!u?.isAdmin) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const data = await priceFreshnessByCurrency().catch(() => null);
  return NextResponse.json({ data }, { headers: { "Cache-Control": "no-store" } });
}
