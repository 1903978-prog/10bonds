import { NextResponse } from "next/server";
import { exportUserData } from "@/lib/accounts";
import { currentUser } from "@/lib/currentUser";

export const dynamic = "force-dynamic";

/** A copy of everything stored about the signed-in account, as a JSON file (GDPR art. 15 and 20). */
export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  const data = await exportUserData(user.id);
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="10bonds-my-data.json"`, "Cache-Control": "no-store" },
  });
}
