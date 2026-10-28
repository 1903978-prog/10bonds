import { NextResponse } from "next/server";
import { bondByIsin } from "@/components/seo/BondIsinPage";
import { currentUser } from "@/lib/currentUser";
import { loadBondsByIsin } from "@/lib/bonds";
import { isIsinValid } from "@/lib/isinCheck";
import { INFLATION_LINKED, alternativesOf, benchmarkFor, cardOf, notShownReason } from "@/lib/bondCard";
import { getBundBenchmarkPoints } from "@/lib/bundCurve/store";
import { getUsBenchmarkPoints } from "@/lib/usTreasury/store";
import { besPublic } from "@/lib/bes/store";
import type { PublicBond } from "@/lib/types";

export const dynamic = "force-dynamic";

const BUDGET_MS = 2500; // the card always answers within about 3 seconds, whatever is slow behind it
const within = <T,>(ms: number, p: Promise<T>): Promise<T | null> => Promise.race([p.catch(() => null), new Promise<null>((r) => setTimeout(() => r(null), ms))]);

/** The Bond Efficiency Score (lib/bes) for one ISIN; null (shown as "–") until the background run has published it or when it is unavailable. */
const besOf = (isin: string): Promise<number | null> => besPublic(isin).then((r) => (r && r.status !== "unavailable" ? r.score : null)).catch(() => null);
/** Net spread in bp (gross spread over the government benchmark minus delta risk), same calculation as the score; null when unavailable. */
const netBpOf = (isin: string): Promise<number | null> => besPublic(isin).then((r) => r?.netSpreadBp ?? null).catch(() => null);

/**
 * Bond Card data for one ISIN. Admin only until the page is stable (the owner, 28/10/2026). Always answers within the budget:
 * the full card, "not in our database" with the date checked, or a timeout the page shows with a Retry button.
 * A bond in the data but kept off the site still gets its card (every figure we hold) plus the reason it is excluded.
 * `alts=1` adds the same-risk, higher-return bonds. Stored data only.
 */
export async function GET(req: Request) {
  const headers = { "Cache-Control": "no-store" };
  if (!(await currentUser())?.isAdmin) return NextResponse.json({ error: "Not found" }, { status: 404, headers });
  const q = new URL(req.url).searchParams;
  const isin = (q.get("isin") ?? "").replace(/\s+/g, "").toUpperCase();
  if (!isIsinValid(isin)) return NextResponse.json({ status: "invalid" }, { headers });
  const checkedAt = new Date().toISOString();
  const started = Date.now();
  const left = () => Math.max(300, BUDGET_MS - (Date.now() - started));

  // One indexed read of the whole data copy for this ISIN (fast, no site filters), and the site's cached list in parallel.
  const [raw, shown] = await Promise.all([within(BUDGET_MS, loadBondsByIsin([isin])), within(BUDGET_MS, bondByIsin(isin))]);
  if (raw === null && shown === null) return NextResponse.json({ status: "timeout" }, { headers });
  const row = raw?.[0] ?? null;
  const bond: PublicBond | null = shown?.bond ?? row?.bond ?? null;
  if (!bond) return NextResponse.json({ status: "not_found", reason: "not_listed", checkedAt }, { headers });

  const excluded = INFLATION_LINKED.has(isin) ? "structure" : shown ? null : notShownReason(true, row?.why ?? null);
  const all = shown?.all ?? [];
  const asOf = shown?.asOf ?? bond.ytmAsOf ?? null;
  const [bund, us] = await Promise.all([
    bond.currency === "EUR" ? within(left(), getBundBenchmarkPoints()) : null,
    bond.currency === "USD" ? within(left(), getUsBenchmarkPoints()) : null,
  ]);
  const curve = benchmarkFor(bond.currency, all, asOf, { bund: bund?.points ?? null, us: us?.points ?? null });
  const efficiency = excluded ? null : await within(left(), besOf(isin));
  const netSpreadBp = excluded ? null : await within(left(), netBpOf(isin));
  const card = { ...cardOf(bond, all, curve), efficiency, netSpreadBp };
  const withBes = q.get("alts") === "1" && !excluded ? await within(left(), Promise.all(alternativesOf(bond, all).map(async (a) => ({ ...a, efficiency: await besOf(a.isin), netSpreadBp: await netBpOf(a.isin) })))) : null;
  // Most efficient first by the Bond Efficiency Score; bonds without one keep their order after the scored ones.
  const alternatives = withBes?.map((a, i) => ({ a, i })).sort((x, y) => (y.a.efficiency ?? -1) - (x.a.efficiency ?? -1) || x.i - y.i).map(({ a }) => a);
  return NextResponse.json({ status: "found", card, excluded, checkedAt, ...(alternatives ? { alternatives } : {}) }, { headers });
}
