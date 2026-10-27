import { NextResponse } from "next/server";
import { currentUser } from "@/lib/currentUser";
import { loadBonds, loadBondsByIsin, loadBondsFor } from "@/lib/bonds";
import { DEFAULT_FILTER } from "@/lib/bondFilter";
import { bundCurve } from "@/lib/riskPremium/benchmark";
import { loadShortlists } from "@/lib/shortlistDb";
import { differences, figuresOf, verdictText } from "@/lib/shortlistCompare";
import { rowOf, summarize } from "@/lib/shortlist";
import { altFor } from "@/lib/shortlistAlt";
import { ALT } from "@/lib/shortlistOptimize";
import { bondRisk } from "@/lib/ratings";
import { issuerKey } from "@/lib/ranking";

export const dynamic = "force-dynamic";

const MIX = ["AAA", "AA", "A", "BBB+"];

/** Admin only: ?id= asks for the model-selected alternative set of a shortlist (EUR, 4-year horizon). { pending: true } while it is built in the background; ask again a few seconds later. */
export async function GET(req: Request) {
  if (!(await currentUser())?.isAdmin) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const id = Number(new URL(req.url).searchParams.get("id"));
  try {
    const list = (await loadShortlists()).find((l) => l.id === id);
    if (!list) return NextResponse.json({ error: "Not found." }, { status: 404 });
    const [src, all, found] = await Promise.all([loadBondsFor(DEFAULT_FILTER), loadBonds(), loadBondsByIsin(list.isins)]);
    const mineBonds = list.isins.flatMap((i) => found.filter((f) => f.bond.isin.trim().toUpperCase() === i).map((f) => f.bond));
    const sm = summarize(mineBonds);
    if (sm.lifeLoss == null) return NextResponse.json({ error: "The shortlist has no bond with figures." }, { status: 400 });
    const r = altFor(`${src.asOf}|${list.isins.join(",")}|${sm.lifeLoss.toFixed(5)}`, src.bonds, sm.lifeLoss);
    const headers = { "Cache-Control": "private, no-store" };
    if ("pending" in r) return NextResponse.json({ pending: true }, { headers });
    if ("error" in r) return NextResponse.json({ error: r.error }, { status: 500, headers });
    const bund = bundCurve(all.bonds, all.asOf).points.map((p) => ({ years: p.years, ytm: p.ytm }));
    const { core } = r;
    const cand = core.best.status === "infeasible" ? [] : core.best.bonds;
    const mine = figuresOf(mineBonds, bund);
    const other = figuresOf(cand, bund);
    const mix = Object.fromEntries(MIX.map((m, i) => [m, cand.filter((b) => bondRisk(b) === i + 1).length]));
    const mineIssuers = new Set(mineBonds.map(issuerKey));
    return NextResponse.json({
      name: list.name, horizon: ALT.horizon, core,
      mine, other, diff: differences(mine, other),
      verdict: cand.length ? verdictText(list.name, mine, "the alternative set", other) : null,
      rows: cand.map((b) => rowOf(b.isin, { bond: b, why: null })),
      mix,
      overlapIsins: cand.filter((b) => list.isins.includes(b.isin)).map((b) => b.isin),
      overlapIssuers: cand.filter((b) => mineIssuers.has(issuerKey(b))).map((b) => b.issuer ?? b.name),
      source: { asOf: src.asOf, bonds: src.bonds.length },
    }, { headers });
  } catch {
    return NextResponse.json({ error: "Not available right now." }, { status: 503 });
  }
}
