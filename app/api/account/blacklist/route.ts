import { NextResponse } from "next/server";
import { currentUser } from "@/lib/currentUser";
import { featuresFor } from "@/lib/planFeatures";
import { addExclusion, cleanExclusion, listExclusions, MAX_EXCLUSIONS, removeExclusion } from "@/lib/blacklist";

export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

/** The signed-in customer, and whether their plan has "blacklist" (the admin's feature table). */
async function who() {
  const user = await currentUser();
  if (!user || user.confirmBlocked) return null;
  return { user, allowed: (await featuresFor(user)).includes("blacklist") };
}

/** The customer's excluded bonds and issuers. Kept when the plan changes; used only while the plan has the feature. */
export async function GET() {
  const w = await who();
  if (!w) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  return NextResponse.json({ allowed: w.allowed, items: await listExclusions(w.user.id) }, { headers: noStore });
}

export async function POST(req: Request) {
  const w = await who();
  if (!w) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  if (!w.allowed) return NextResponse.json({ error: "Paid plans only.", upgrade: true }, { status: 402 });
  const e = cleanExclusion(await req.json().catch(() => null));
  if (!e) return NextResponse.json({ error: "Please try again." }, { status: 400 });
  if (!(await addExclusion(w.user.id, e))) return NextResponse.json({ error: `At most ${MAX_EXCLUSIONS} exclusions.` }, { status: 409 });
  return NextResponse.json({ ok: true }, { headers: noStore });
}

export async function DELETE(req: Request) {
  const w = await who();
  if (!w) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  const e = cleanExclusion(await req.json().catch(() => null));
  if (!e) return NextResponse.json({ error: "Please try again." }, { status: 400 });
  await removeExclusion(w.user.id, e.kind, e.value);
  return NextResponse.json({ ok: true }, { headers: noStore });
}
