import { NextResponse } from "next/server";
import { currentUser } from "@/lib/currentUser";
import { loadBonds, loadBondsByIsin, loadBondsFor } from "@/lib/bonds";
import { parseFilter } from "@/lib/bondFilter";
import { frontierFor } from "@/lib/frontierCache";
import { bundCurve } from "@/lib/riskPremium/benchmark";
import { loadShortlists } from "@/lib/shortlistDb";
import { differences, figuresOf, verdictText } from "@/lib/shortlistCompare";
import { rowOf } from "@/lib/shortlist";

export const dynamic = "force-dynamic";

/**
 * Admin only: a shortlist against the live efficient list of one horizon (the Multi-year chart's curve) at a desired
 * return: ?id=&years=4&target=4.22&currency=EUR&size=100k. Both measured with the same expected-loss method and loss
 * given default by debt rank.
 */
export async function GET(req: Request) {
  if (!(await currentUser())?.isAdmin) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const q = new URL(req.url).searchParams;
  const years = Math.min(10, Math.max(2, Math.round(Number(q.get("years")) || 4)));
  const target = Math.min(9, Math.max(1, Number(q.get("target")) || 4.22));
  try {
    const list = (await loadShortlists()).find((l) => l.id === Number(q.get("id")));
    if (!list) return NextResponse.json({ error: "Not found." }, { status: 404 });
    const filter = parseFilter(q);
    const [src, all, found] = await Promise.all([loadBondsFor(filter), loadBonds(), loadBondsByIsin(list.isins)]);
    const bund = bundCurve(all.bonds, all.asOf).points.map((p) => ({ years: p.years, ytm: p.ytm }));
    const pt = frontierFor(src, filter, years).at(target);
    if (!pt) return NextResponse.json({ error: `No ${years}-year list reaches ${target.toFixed(2)}%.` }, { status: 404 });
    const by = new Map(found.map((f) => [f.bond.isin.trim().toUpperCase(), f.bond]));
    const mine = figuresOf(list.isins.flatMap((i) => (by.get(i) ? [by.get(i)!] : [])), bund);
    const other = figuresOf(pt.rows, bund);
    const inList = new Set(list.isins);
    const rows = pt.rows.map((b) => ({ ...rowOf(b.isin, { bond: b, why: null }), overlap: inList.has(b.isin) }));
    return NextResponse.json({
      name: list.name, years, target, mine, other, diff: differences(mine, other),
      verdict: verdictText(list.name, mine, `the ${years}-year list`, other),
      rows, overlap: rows.filter((r) => r.overlap).map((r) => r.isin), bundAsOf: all.asOf,
      source: { asOf: src.asOf, bonds: src.bonds.length },
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Comparison is not available right now." }, { status: 503 });
  }
}
