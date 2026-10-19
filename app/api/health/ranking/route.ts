import { NextResponse } from "next/server";
import { loadBonds } from "@/lib/bonds";
import { bestTable, durationSteps } from "@/lib/bestTable";
import { rankBonds } from "@/lib/ranking";
import { bondNotch } from "@/lib/ratings";
import { LIMITS } from "@/lib/limits";

export const dynamic = "force-dynamic";

/**
 * Self-check on the data the site is serving (numbers only, no bond details):
 * for every horizon and rating level, the list at the slider maximum must average the maximum,
 * and for targets below it the list's average must sit close to the target. Unrated bonds must be absent.
 */
export async function GET() {
  try {
    const [data, table] = await Promise.all([loadBonds(), bestTable()]);
    const unrated = data.bonds.filter((b) => bondNotch(b) === null).length;
    let checked = 0;
    let atMaxGapWorst = 0;
    let belowGapWorst = 0;
    const failures: { duration: number; risk: number; target: number; average: number }[] = [];
    for (let risk = LIMITS.risk.min; risk <= LIMITS.risk.max; risk++) {
      for (const d of durationSteps()) {
        const cap = table.caps[String(risk)]?.[String(d)];
        if (cap === null || cap === undefined) continue;
        // The lowest average the list can reach here (the 10 lowest-yield issuers); targets below it are unreachable.
        const low = rankBonds(data.bonds, d, LIMITS.ytm.min, undefined, risk).results;
        const floor = low.length ? low.reduce((s, r) => s + r.grossYtm!, 0) / low.length : Infinity;
        for (const target of [cap, cap - 0.3, cap - 0.8]) {
          if (target < LIMITS.ytm.min) continue;
          if (target !== cap && target < floor + 0.05) continue;
          const { results } = rankBonds(data.bonds, d, Math.round(target * 100) / 100, undefined, risk);
          if (!results.length) continue;
          const avg = results.reduce((s, r) => s + r.grossYtm!, 0) / results.length;
          const gap = Math.abs(avg - target);
          checked++;
          // At the maximum the list is the top 10 and the maximum is their average rounded down to 0.01.
          // Below it the list should land close to the target: 0.05 points, or 1.5% of the target in thin high-yield pools.
          const limit = target === cap ? 0.011 : Math.max(0.05, target * 0.015);
          if (target === cap) atMaxGapWorst = Math.max(atMaxGapWorst, gap);
          else belowGapWorst = Math.max(belowGapWorst, gap);
          if (gap > limit && failures.length < 20) failures.push({ duration: d, risk, target: Math.round(target * 100) / 100, average: Math.round(avg * 100) / 100 });
        }
      }
    }
    const ok = unrated === 0 && failures.length === 0;
    return NextResponse.json(
      { ok, source: data.source, bonds: data.bonds.length, unrated, checked, atMaxGapWorst: +atMaxGapWorst.toFixed(3), belowGapWorst: +belowGapWorst.toFixed(3), failures },
      { status: ok ? 200 : 500, headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 503 });
  }
}
