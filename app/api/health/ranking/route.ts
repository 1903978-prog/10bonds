import { NextResponse } from "next/server";
import { loadBonds } from "@/lib/bonds";
import { bestTable, durationSteps } from "@/lib/bestTable";
import { rankBonds } from "@/lib/ranking";
import { bondNotch } from "@/lib/ratings";
import { LIMITS } from "@/lib/limits";

export const dynamic = "force-dynamic";

/**
 * Self-check on the data the site is serving (numbers only, no bond details):
 * for every horizon and rating level, the list at the slider maximum and at two targets below it must reach the target
 * (the target is a minimum). Unrated bonds must be absent.
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
          // Let other requests in between: the 540 lists below take about 18 s of CPU, and the site must keep answering meanwhile (a release check runs this).
          await new Promise((r) => setImmediate(r));
          const { results } = rankBonds(data.bonds, d, Math.round(target * 100) / 100, undefined, risk);
          if (!results.length) continue;
          const avg = results.reduce((s, r) => s + r.grossYtm!, 0) / results.length;
          checked++;
          // A list never yields less than its target (the target is a minimum). It may yield more, and at the
          // maximum it may be below the top 10's average when the duration rule holds the list back.
          const gap = Math.max(0, target - avg);
          if (target === cap) atMaxGapWorst = Math.max(atMaxGapWorst, gap);
          else belowGapWorst = Math.max(belowGapWorst, gap);
          if (gap > 0.005 && failures.length < 20) failures.push({ duration: d, risk, target: Math.round(target * 100) / 100, average: Math.round(avg * 100) / 100 });
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
