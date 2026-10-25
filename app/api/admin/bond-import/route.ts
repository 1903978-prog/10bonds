import { NextResponse } from "next/server";
import { currentUser } from "@/lib/currentUser";
import { parseBondFile } from "@/lib/bondImportParse";
import { commitImport, importOverview, previewImport, setSeniorityFill, seniorityFillOn } from "@/lib/bondImportDb";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function admin() {
  const u = await currentUser();
  return u?.isAdmin && u.adminState === "ok" ? u : null;
}

/** Admin only: import history and the current imported rows. */
export async function GET() {
  if (!(await admin())) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ...(await importOverview()), seniorityFill: await seniorityFillOn() }, { headers: { "Cache-Control": "no-store" } });
}

/** Admin only: form with `file` and `mode` = preview (nothing saved) | commit | seniority-on | seniority-off. */
export async function POST(req: Request) {
  if (!(await admin())) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const form = await req.formData().catch(() => null);
  const mode = String(form?.get("mode") ?? "preview");
  if (mode === "seniority-on" || mode === "seniority-off") {
    await setSeniorityFill(mode === "seniority-on");
    return NextResponse.json({ ok: true, seniorityFill: mode === "seniority-on" });
  }
  const file = form?.get("file");
  if (!(file instanceof File) || file.size === 0 || file.size > 8_000_000) return NextResponse.json({ error: "Choose an xls, xlsx or csv file (up to 8 MB)." }, { status: 400 });
  try {
    const parsed = parseBondFile(Buffer.from(await file.arrayBuffer()), file.name);
    if (mode === "commit") {
      const r = await commitImport(parsed);
      return NextResponse.json(r === "already" ? { error: "This exact file was already imported." } : { ok: true, ...r }, { status: r === "already" ? 409 : 200 });
    }
    return NextResponse.json({ preview: await previewImport(parsed) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not read the file." }, { status: 400 });
  }
}
