import { NextResponse } from "next/server";
import { bondByIsin } from "@/components/seo/BondIsinPage";
import { currentUser } from "@/lib/currentUser";
import { featuresFor } from "@/lib/planFeatures";
import { bondRisk } from "@/lib/ratings";
import { isIsin, issuerOf } from "@/lib/seo/bondPages";

export const dynamic = "force-dynamic";

/**
 * Search one bond by ISIN, for the plans ticked "isin_search" in /admin/features. Only bonds the site shows can be found
 * (no unrated bonds, no dormant ones), so "not found" also covers bonds we keep out on purpose.
 */
export async function GET(req: Request) {
  const headers = { "Cache-Control": "no-store" };
  const user = await currentUser();
  if (!(await featuresFor(user)).includes("isin_search")) return NextResponse.json({ status: "locked" }, { status: 403, headers });
  const isin = (new URL(req.url).searchParams.get("isin") ?? "").replace(/\s+/g, "").toUpperCase();
  if (!isIsin(isin)) return NextResponse.json({ status: "invalid" }, { headers });
  const hit = await bondByIsin(isin).catch(() => null);
  if (!hit) return NextResponse.json({ status: "not_found" }, { headers });
  const b = hit.bond;
  return NextResponse.json(
    {
      status: "found",
      bond: {
        isin: b.isin, issuer: issuerOf(b), currency: b.currency, coupon: b.coupon, maturity: b.maturity,
        risk: bondRisk(b), ret: b.grossYtm, duration: b.modifiedDuration,
      },
    },
    { headers },
  );
}
