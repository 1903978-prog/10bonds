import { NextResponse } from "next/server";
import { currentUser } from "@/lib/currentUser";
import { activeMethodology, parseMethodology, setActiveMethodology } from "@/lib/methodologyChoice";

export const dynamic = "force-dynamic";

async function admin() {
  const u = await currentUser();
  return u?.isAdmin && u.adminState === "ok" ? u : null;
}

/** Which methodology (1 to 5) the public site uses. Admin only. */
export async function GET() {
  if (!(await admin())) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ active: await activeMethodology() }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  if (!(await admin())) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const b = (await req.json().catch(() => null)) as { active?: unknown } | null;
  const n = parseMethodology(String(b?.active ?? ""));
  if (!n) return NextResponse.json({ error: "Pick Methodology 1, 2, 3, 4 or 5." }, { status: 400 });
  await setActiveMethodology(n);
  return NextResponse.json({ ok: true, active: n });
}
