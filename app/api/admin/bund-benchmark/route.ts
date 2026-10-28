import { NextResponse } from "next/server";
import { currentUser } from "@/lib/currentUser";
import { bundStatus, ingest } from "@/lib/bundCurve/store";
import { parseBundesbankCsv } from "@/lib/bundCurve/core";
import { fetchOfficial } from "@/lib/bundCurve/fetch";

export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "no-store" };
async function admin() { const u = await currentUser(); return u?.isAdmin && u.adminState === "ok" ? u : null; }

/** Admin only: status, the saved 1-30 year curves and the import log. */
export async function GET() {
  if (!(await admin())) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(await bundStatus(), { headers: NO_STORE });
}

/** Admin only. {action:"refresh"} downloads from the Bundesbank now; {action:"csv", text} imports an official CSV by hand. Both use the same validation. */
export async function POST(req: Request) {
  const u = await admin();
  if (!u) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = (await req.json().catch(() => ({}))) as { action?: string; text?: string };
  try {
    if (body.action === "refresh") return NextResponse.json(await ingest(await fetchOfficial(), `refresh-now:${u.email}`), { headers: NO_STORE });
    if (body.action === "csv" && typeof body.text === "string" && body.text.length < 2_000_000) return NextResponse.json(await ingest(parseBundesbankCsv(body.text), `csv:${u.email}`), { headers: NO_STORE });
    return NextResponse.json({ ok: false, message: "Unknown action." }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ ok: false, message: `Not imported, saved curve kept: ${e instanceof Error ? e.message : String(e)}` }, { status: 200, headers: NO_STORE });
  }
}
