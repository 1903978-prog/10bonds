import { NextResponse } from "next/server";
import { bondByIsin } from "@/components/seo/BondIsinPage";
import { currentUser } from "@/lib/currentUser";
import { featuresFor } from "@/lib/planFeatures";
import { isIsin } from "@/lib/seo/bondPages";
import { alternativesOf, cardOf } from "@/lib/bondCard";

export const dynamic = "force-dynamic";

/**
 * Bond Card data for one ISIN, same plans as the ISIN search (the "isin_search" tick in /admin/features). Only bonds the
 * site shows can be found (no unrated or dormant ones). `alts=1` adds the same-risk, higher-return bonds. Stored data only.
 */
export async function GET(req: Request) {
  const headers = { "Cache-Control": "no-store" };
  if (!(await featuresFor(await currentUser())).includes("isin_search")) return NextResponse.json({ status: "locked" }, { status: 403, headers });
  const q = new URL(req.url).searchParams;
  const isin = (q.get("isin") ?? "").replace(/\s+/g, "").toUpperCase();
  if (!isIsin(isin)) return NextResponse.json({ status: "invalid" }, { headers });
  const hit = await bondByIsin(isin).catch(() => null);
  if (!hit) return NextResponse.json({ status: "not_found" }, { headers });
  const card = cardOf(hit.bond, hit.all, hit.asOf);
  return NextResponse.json({ status: "found", card, ...(q.get("alts") === "1" ? { alternatives: alternativesOf(hit.bond, hit.all) } : {}) }, { headers });
}
