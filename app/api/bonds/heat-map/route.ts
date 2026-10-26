import { NextResponse } from "next/server";
import { loadBondsFor } from "@/lib/bonds";
import { parseFilter } from "@/lib/bondFilter";
import { currentUser } from "@/lib/currentUser";
import { featuresFor } from "@/lib/planFeatures";
import { exclusionsOrNone, excludedBy } from "@/lib/blacklist";
import { FRONTIER_BY_METHOD, heatMapFor, parseMethod } from "@/lib/heatMap";

export const dynamic = "force-dynamic";

/** Admin and plans with "heat_map": the risk heat map (lib/heatMap.ts) for the chosen currency, minimum order and methodology; { unavailable: true } for a methodology not built yet; { pending: true } while it is built in the background. */
export async function GET(req: Request) {
  const user = await currentUser();
  // The admin, and plans with the "heat_map" feature (/admin/features); the others are shown a blurred decoy by the page.
  if (!user?.isAdmin && !(user && (await featuresFor(user)).includes("heat_map"))) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const params = new URL(req.url).searchParams;
  const filter = parseFilter(params);
  const method = user.isAdmin ? parseMethod(params.get("method")) : "m1"; // other methodologies are the owner's only
  if (!FRONTIER_BY_METHOD[method]) return NextResponse.json({ unavailable: true }, { headers: { "Cache-Control": "private, no-store" } });
  let src;
  try {
    src = await loadBondsFor(filter);
  } catch {
    return NextResponse.json({ error: "Bond data is not available right now. Please try again later." }, { status: 503 });
  }
  // bl=1: the same map without the bonds and issuers on the admin's own blacklist (its own cache entry).
  const list = user.isAdmin && params.get("bl") === "1" ? await exclusionsOrNone(user.id) : [];
  const skip = excludedBy(list);
  const without = skip ? { key: list.map((e) => `${e.kind}:${e.value}`).sort().join(","), skip } : null;
  const map = heatMapFor(src, filter, method, without);
  return NextResponse.json(map ?? { pending: true }, { headers: { "Cache-Control": "private, no-store" } });
}
