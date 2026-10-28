import { NextResponse } from "next/server";
import { bondByIsin } from "@/components/seo/BondIsinPage";
import { currentUser } from "@/lib/currentUser";
import { loadBondsByIsin } from "@/lib/bonds";
import { isIsin } from "@/lib/seo/bondPages";
import { alternativesOf, benchmarkFor, cardOf, notShownReason } from "@/lib/bondCard";
import { getBundBenchmarkPoints } from "@/lib/bundCurve/store";
import { getUsBenchmarkPoints } from "@/lib/usTreasury/store";
import { besPublic } from "@/lib/bes/store";

/** The Bond Efficiency Score (lib/bes) for one ISIN; null (shown as "–") until the background run has published it or when it is unavailable. */
const besOf = (isin: string): Promise<number | null> => besPublic(isin).then((r) => (r && r.status !== "unavailable" ? r.score : null)).catch(() => null);

export const dynamic = "force-dynamic";

/**
 * Bond Card data for one ISIN, same plans as the ISIN search (the "isin_search" tick in /admin/features). Only bonds the
 * site shows can be found (no unrated or dormant ones). `alts=1` adds the same-risk, higher-return bonds. Stored data only.
 */
export async function GET(req: Request) {
  const headers = { "Cache-Control": "no-store" };
  // Admin only until the page is stable (the owner, 28/10/2026): 404 for everyone else.
  if (!(await currentUser())?.isAdmin) return NextResponse.json({ error: "Not found" }, { status: 404, headers });
  const q = new URL(req.url).searchParams;
  const isin = (q.get("isin") ?? "").replace(/\s+/g, "").toUpperCase();
  if (!isIsin(isin)) return NextResponse.json({ status: "invalid" }, { headers });
  const hit = await bondByIsin(isin).catch(() => null);
  if (!hit) {
    // Say why: absent from the data, or in the data but kept off the site (no rating, no yield, matured, dormant, ...).
    const raw = await loadBondsByIsin([isin]).catch(() => []);
    const reason = notShownReason(raw.length > 0, raw[0]?.why ?? null);
    return NextResponse.json({ status: "not_found", reason }, { headers });
  }
  const b = hit.bond;
  const [bund, us] = await Promise.all([
    b.currency === "EUR" ? getBundBenchmarkPoints().catch(() => null) : null,
    b.currency === "USD" ? getUsBenchmarkPoints().catch(() => null) : null,
  ]);
  const curve = benchmarkFor(b.currency, hit.all, hit.asOf, { bund: bund?.points ?? null, us: us?.points ?? null });
  const card = { ...cardOf(b, hit.all, curve), efficiency: await besOf(isin) };
  const withBes = q.get("alts") === "1" ? await Promise.all(alternativesOf(hit.bond, hit.all).map(async (a) => ({ ...a, efficiency: await besOf(a.isin) }))) : undefined;
  // Most efficient first by the Bond Efficiency Score; bonds without one keep their order after the scored ones.
  const alternatives = withBes?.map((a, i) => ({ a, i })).sort((x, y) => (y.a.efficiency ?? -1) - (x.a.efficiency ?? -1) || x.i - y.i).map(({ a }) => a);
  return NextResponse.json({ status: "found", card, ...(alternatives ? { alternatives } : {}) }, { headers });
}
