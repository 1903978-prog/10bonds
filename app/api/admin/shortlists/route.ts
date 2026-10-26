import { NextResponse } from "next/server";
import { currentUser } from "@/lib/currentUser";
import { cleanBids, createShortlist, deleteShortlist, loadShortlists, parseIsins, updateShortlist } from "@/lib/shortlistDb";
import { shortlistDetail } from "@/lib/shortlistData";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store" };
const notFound = () => NextResponse.json({ error: "Not found." }, { status: 404 });

/** Admin only: every shortlist with its rows and averages (the Shortlist page), or with `?brief=1` just the name and averages (the dots on the Multi-year chart and the Heat map). */
export async function GET(req: Request) {
  if (!(await currentUser())?.isAdmin) return notFound();
  try {
    const lists = await Promise.all((await loadShortlists()).map(shortlistDetail));
    if (new URL(req.url).searchParams.get("brief") === "1") {
      return NextResponse.json({ lists: lists.map((l) => ({ id: l.id, name: l.name, requested: l.isins.length, ...l.summary })) }, { headers: NO_STORE });
    }
    return NextResponse.json({ lists }, { headers: NO_STORE });
  } catch {
    return NextResponse.json({ error: "Shortlists are not available right now." }, { status: 503 });
  }
}

/** Admin only: { id?, name, isins (text) } creates a shortlist, or replaces the one with that id. */
export async function POST(req: Request) {
  if (!(await currentUser())?.isAdmin) return notFound();
  const body = (await req.json().catch(() => null)) as { id?: number; name?: unknown; isins?: unknown; bids?: unknown } | null;
  const name = typeof body?.name === "string" ? body.name.trim().slice(0, 60) : "";
  const { isins, bad } = parseIsins(typeof body?.isins === "string" ? body.isins : Array.isArray(body?.isins) ? body.isins.join(" ") : "");
  if (!name) return NextResponse.json({ error: "Give the shortlist a name." }, { status: 400 });
  if (bad.length) return NextResponse.json({ error: `Not an ISIN: ${bad.slice(0, 5).join(", ")}` }, { status: 400 });
  if (!isins.length) return NextResponse.json({ error: "Add at least one ISIN." }, { status: 400 });
  if (isins.length > 200) return NextResponse.json({ error: "At most 200 ISINs." }, { status: 400 });
  try {
    const r = typeof body?.id === "number" ? await updateShortlist(body.id, name, isins, body.bids === undefined ? undefined : cleanBids(body.bids, isins)) : await createShortlist(name, isins);
    if (r === "exists") return NextResponse.json({ error: "A shortlist with that name exists." }, { status: 409 });
    if (!r) return notFound();
    return NextResponse.json({ list: await shortlistDetail(r) }, { headers: NO_STORE });
  } catch {
    return NextResponse.json({ error: "Could not save. Try again." }, { status: 503 });
  }
}

/** Admin only: ?id=… deletes a shortlist. */
export async function DELETE(req: Request) {
  if (!(await currentUser())?.isAdmin) return notFound();
  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!Number.isInteger(id)) return NextResponse.json({ error: "Bad id." }, { status: 400 });
  try {
    return (await deleteShortlist(id)) ? NextResponse.json({ ok: true }) : notFound();
  } catch {
    return NextResponse.json({ error: "Could not delete. Try again." }, { status: 503 });
  }
}
