import { NextResponse } from "next/server";
import { currentOutlierSd, loadBondsFor } from "@/lib/bonds";
import { capsFor } from "@/lib/bestTable";
import { parseFilter } from "@/lib/bondFilter";
import { pickRanking } from "@/lib/pickRanking";
import { exampleOf, introDots, INTRO_HORIZONS, INTRO_RISK, type IntroData } from "@/lib/intro";

export const dynamic = "force-dynamic";

// One answer per copy of the bonds: the examples run three real searches.
let memo: { key: string; at: number; body: IntroData } | null = null;

/** The first-visit intro: every bond as a dot, the frontier per horizon and three example top 10s (the top-yield list at risk 5). No search is counted. */
export async function GET(req: Request) {
  try {
    const f = parseFilter(new URL(req.url).searchParams);
    const [all, ranked, caps] = await Promise.all([loadBondsFor({ currency: f.currency, size: "100k" }), loadBondsFor(f, await currentOutlierSd()), capsFor(f)]);
    const key = `${f.currency}|${all.asOf}|${all.bonds.length}|${ranked.bonds.length}`;
    if (!memo || memo.key !== key || Date.now() - memo.at > 600_000) {
      const { dots, fronts, at } = introDots(all.bonds);
      const examples = [];
      for (const h of INTRO_HORIZONS) {
        const cap = caps?.[String(INTRO_RISK)]?.[String(h.example)];
        if (cap == null) continue;
        const { results } = await pickRanking(ranked.bonds, ranked.asOf, h.example, cap, INTRO_RISK);
        if (results.length) examples.push(exampleOf(results, h.example, at));
      }
      memo = { key, at: Date.now(), body: { dots, fronts, examples } };
    }
    return NextResponse.json(memo.body, { headers: { "Cache-Control": "public, max-age=600" } });
  } catch {
    return NextResponse.json({ dots: [], fronts: [], examples: [] }, { status: 503 });
  }
}
