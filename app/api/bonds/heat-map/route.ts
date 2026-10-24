import { NextResponse } from "next/server";
import { loadBondsFor } from "@/lib/bonds";
import { parseFilter } from "@/lib/bondFilter";
import { currentUser } from "@/lib/currentUser";
import { FRONTIER_BY_METHOD, heatMapFor, parseMethod } from "@/lib/heatMap";

export const dynamic = "force-dynamic";

/** Admin only: the risk heat map (lib/heatMap.ts) for the chosen currency, minimum order and methodology; { unavailable: true } for a methodology not built yet; { pending: true } while it is built in the background. */
export async function GET(req: Request) {
  const user = await currentUser();
  if (!user?.isAdmin) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const params = new URL(req.url).searchParams;
  const filter = parseFilter(params);
  const method = parseMethod(params.get("method"));
  if (!FRONTIER_BY_METHOD[method]) return NextResponse.json({ unavailable: true }, { headers: { "Cache-Control": "private, no-store" } });
  let src;
  try {
    src = await loadBondsFor(filter);
  } catch {
    return NextResponse.json({ error: "Bond data is not available right now. Please try again later." }, { status: 503 });
  }
  const map = heatMapFor(src, filter, method);
  return NextResponse.json(map ?? { pending: true }, { headers: { "Cache-Control": "private, no-store" } });
}
