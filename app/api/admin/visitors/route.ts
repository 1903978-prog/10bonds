import { NextResponse } from "next/server";
import { listVisitors, visitorPages } from "@/lib/accounts";
import { currentUser } from "@/lib/currentUser";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const u = await currentUser();
  if (!u?.isAdmin) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const code = new URL(req.url).searchParams.get("code");
  const noStore = { "Cache-Control": "no-store" };
  if (code) {
    const m = /^user(\d{3,})$/.exec(code);
    if (!m) return NextResponse.json({ error: "Bad code" }, { status: 400 });
    return NextResponse.json({ pages: await visitorPages(Number(m[1])) }, { headers: noStore });
  }
  return NextResponse.json({ visitors: await listVisitors() }, { headers: noStore });
}
