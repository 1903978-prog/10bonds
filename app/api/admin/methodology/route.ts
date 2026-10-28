import { NextResponse } from "next/server";
import { currentUser } from "@/lib/currentUser";
import { activeMethodology } from "@/lib/methodologyChoice";

export const dynamic = "force-dynamic";

async function admin() {
  const u = await currentUser();
  return u?.isAdmin && u.adminState === "ok" ? u : null;
}

/** The methodology the public site runs: always 4 (the unified portfolio spec). Admin only; there is no switch. */
export async function GET() {
  if (!(await admin())) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ active: await activeMethodology() }, { headers: { "Cache-Control": "no-store" } });
}
