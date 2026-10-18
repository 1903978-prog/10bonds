import { NextResponse } from "next/server";
import { bondDataStats } from "@/lib/bonds";
import { listRefreshRequests, requestRefresh } from "@/lib/accounts";
import { currentUser } from "@/lib/currentUser";

export const dynamic = "force-dynamic";

export async function GET() {
  const u = await currentUser();
  if (!u?.isAdmin) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const [bonds, requests] = await Promise.all([
    bondDataStats().catch((e) => ({ error: (e as Error).message })),
    listRefreshRequests().catch(() => []),
  ]);
  return NextResponse.json({ bonds, requests }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST() {
  const u = await currentUser();
  if (!u?.isAdmin) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(await requestRefresh(u.email));
}
