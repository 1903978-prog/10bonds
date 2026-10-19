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
 * and for targets below it the list's average must reach the target (the target is a minimum). Unrated bonds must be absent.
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
        for (const target of [cap, cap - 0.3, cap - 0.8]) {
          if (target < LIMITS.ytm.min) continue;
          const { results } = rankBonds(data.bonds, d, Math.round(target * 100) / 100, undefined, risk);
          if (!results.length) continue;
          const avg = results.reduce((s, r) => s + r.grossYtm!, 0) / results.length;
          checked++;
          // At the maximum the list is the top 10 and the maximum is their average rounded down to 0.01.
          // Below it the list may yield more than the target, never less.
          const gap = target === cap ? Math.abs(avg - target) : Math.max(0, target - avg);
          const limit = target === cap ? 0.011 : 0.005;
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
