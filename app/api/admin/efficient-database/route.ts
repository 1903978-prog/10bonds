import { NextResponse } from "next/server";
import { currentUser } from "@/lib/currentUser";
import { ALL_FILTERS, applyBes, buildSnapshot, filterKey, jobHistory, rowDetail, snapshotList, snapshotReport, snapshotRows } from "@/lib/sliderSnapshot";

export const dynamic = "force-dynamic";

async function admin() {
  const u = await currentUser();
  return u?.isAdmin && u.adminState === "ok" ? u : null;
}

/** Admin only. ?id=n&row=r = one position in detail; ?id=n = its 90 rows and report; no id = snapshot history and job log (default: the newest snapshot's rows). */
export async function GET(req: Request) {
  if (!(await admin())) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const q = new URL(req.url).searchParams;
  const key = ALL_FILTERS.map(filterKey).includes(q.get("key") ?? "") ? q.get("key")! : filterKey(ALL_FILTERS[0]);
  const list = (await snapshotList(120)).filter((x) => x.filter_key === key).slice(0, 30);
  const id = Number(q.get("id") ?? (list.find((x) => x.status === "published") ?? list[0])?.id);
  const row = Number(q.get("row"));
  if (Number.isInteger(id) && Number.isInteger(row) && row >= 1 && row <= 90) return NextResponse.json(await rowDetail(id, row), { headers: { "Cache-Control": "no-store" } });
  const [rows, report, jobs] = await Promise.all([Number.isInteger(id) ? snapshotRows(id) : [], Number.isInteger(id) ? snapshotReport(id) : null, jobHistory(40)]);
  return NextResponse.json({ id: Number.isInteger(id) ? id : null, snapshots: list, rows, report, jobs }, { headers: { "Cache-Control": "no-store" } });
}

/** Rebuilds from the stored lists of the latest price batch. Cheap (no solver), never duplicates a batch, never touches the published snapshot unless all 90 pass. */
export async function POST(req: Request) {
  if (!(await admin())) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const f = ALL_FILTERS.find((x) => filterKey(x) === new URL(req.url).searchParams.get("key")) ?? ALL_FILTERS[0];
  const r = await buildSnapshot("admin", f, true);
  const bes = await applyBes().catch((e) => ({ error: (e as Error).message }));
  return NextResponse.json({ ...r, bes }, { headers: { "Cache-Control": "no-store" } });
}
