import { NextResponse } from "next/server";
import { setNewsletter } from "@/lib/accounts";
import { currentUser } from "@/lib/currentUser";

export const dynamic = "force-dynamic";

/** Switch the newsletter on or off from the profile page. */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  const on = (await req.json().catch(() => ({})))?.on;
  if (typeof on !== "boolean") return NextResponse.json({ error: "Please try again." }, { status: 400 });
  await setNewsletter(user.id, on, "profile");
  return NextResponse.json({ ok: true, on });
}
