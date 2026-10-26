import { NextResponse } from "next/server";
import { currentUser } from "@/lib/currentUser";
import { cleanProRequest, requestPro } from "@/lib/pro";
import { allow } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  if (!allow(`pro-request:${user.id}`, 5)) return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  const body = cleanProRequest(await req.json().catch(() => null));
  if (!body) return NextResponse.json({ error: "Please fill in the required fields and tick both boxes." }, { status: 400 });
  await requestPro(user.id, body);
  return NextResponse.json({ status: "pending" });
}
