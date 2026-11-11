import { NextResponse } from "next/server";
import { accountsHealth } from "@/lib/accounts";

export const dynamic = "force-dynamic";

export async function GET() {
  const h = await accountsHealth();
  // Public: only the stage. The error code and the shape of the connection address stay in the server log.
  if (h.stage !== "ok") console.error("[health/accounts]", h.stage, h.code ?? "", JSON.stringify(h.shape ?? {}));
  return NextResponse.json({ configured: h.configured, stage: h.stage }, { status: h.stage === "ok" ? 200 : 503 });
}
