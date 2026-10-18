import { NextResponse } from "next/server";
import { bad, int, notFound, seoAdmin, str } from "@/lib/seo/input";
import { deletePerson, listPeople, markStale, savePerson } from "@/lib/seo/store";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await seoAdmin())) return notFound();
  return NextResponse.json({ people: await listPeople() }, { headers: { "Cache-Control": "no-store" } });
}

/** Author and reviewer profiles. Credentials are typed by the admin; "verified" is the admin's own statement. */
export async function POST(req: Request) {
  if (!(await seoAdmin())) return notFound();
  const b = await req.json().catch(() => ({}));
  const name = str(b?.name, 100);
  const role = str(b?.role, 120);
  if (!name || !role) return bad("Name and role are needed.");
  const person = await savePerson({
    id: int(b?.id, 1, Number.MAX_SAFE_INTEGER),
    name, role,
    bio: str(b?.bio, 1500),
    credentials: str(b?.credentials, 500),
    credentialsVerified: b?.credentialsVerified === true && !!str(b?.credentials, 500),
    isPublic: b?.isPublic !== false,
  });
  await markStale();
  return NextResponse.json({ person });
}

export async function DELETE(req: Request) {
  if (!(await seoAdmin())) return notFound();
  const id = int(new URL(req.url).searchParams.get("id"), 1, Number.MAX_SAFE_INTEGER);
  if (!id) return bad("Missing id.");
  await deletePerson(id);
  await markStale();
  return NextResponse.json({ ok: true });
}
