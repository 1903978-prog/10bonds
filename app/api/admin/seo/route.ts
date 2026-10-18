import { NextResponse } from "next/server";
import { accountsConfigured } from "@/lib/accounts";
import { runAssessment } from "@/lib/seo/assess";
import { marketOf, notFound, seoAdmin } from "@/lib/seo/input";
import { LOCALES } from "@/lib/seo/locales";
import { overallScore, recommendations, round2 } from "@/lib/seo/rubric";
import { actionStatuses, assessmentHistory, latestAssessments, staleSince } from "@/lib/seo/store";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const RANGES: Record<string, number | null> = { "30": 30, "90": 90, "365": 365, all: null };
const DAY = 86_400_000;

/**
 * Dashboard data for one market (?market=it|fr|de): its last two assessments, history for the chosen range and its
 * roadmap, plus the latest score of every market and their plain average (an internal metric).
 */
export async function GET(req: Request) {
  if (!(await seoAdmin())) return notFound();
  if (!accountsConfigured()) return NextResponse.json({ error: "The accounts database is not connected, so SEO data cannot be stored." }, { status: 503 });
  const q = new URL(req.url).searchParams;
  const market = marketOf(q.get("market"));
  const range = q.get("range") ?? "90";
  const days = range in RANGES ? RANGES[range] : 90;
  const [lastByMarket, history, actions, stale] = await Promise.all([
    Promise.all(LOCALES.map((m) => latestAssessments(m, m === market ? 2 : 1))),
    assessmentHistory(days),
    actionStatuses(),
    staleSince(),
  ]);
  const [cur, prev] = lastByMarket[LOCALES.indexOf(market)];
  const roadmap = cur
    ? recommendations(cur.results).map((r) => ({ ...r, key: `${market}:${r.key}`, status: actions[`${market}:${r.key}`]?.status ?? "not_started" }))
    : [];
  const markets = LOCALES.map((m, i) => {
    const a = lastByMarket[i][0];
    return { market: m, overall: a?.row.overall ?? null, at: a?.row.at ?? null, assessed: a?.row.assessed ?? 0, criteria: a?.row.criteria ?? 0 };
  });
  const scored = markets.filter((m) => m.overall !== null);
  const latestAt = markets.map((m) => m.at).filter((a): a is string => !!a).sort()[0] ?? null;
  return NextResponse.json(
    {
      market,
      markets,
      global: scored.length === LOCALES.length ? round2(scored.reduce((s, m) => s + (m.overall ?? 0), 0) / scored.length) : null,
      current: cur ? { ...cur.row, score: overallScore(cur.results), results: cur.results } : null,
      previous: prev ? { ...prev.row, score: overallScore(prev.results) } : null,
      history,
      roadmap,
      completedActions: Object.entries(actions).filter(([k, a]) => k.startsWith(`${market}:`) && a.status === "completed").length,
      issues: cur ? cur.results.filter((r) => (r.points ?? 0) < 2).length : null,
      // Reassess when data changed since the last run, or once a day.
      needsRun: !latestAt || stale !== null || Date.now() - Date.parse(latestAt) > DAY,
      staleSince: stale,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/** Run an assessment of every market now. {psi: true} also re-runs PageSpeed Insights (slow). */
export async function POST(req: Request) {
  const u = await seoAdmin();
  if (!u) return notFound();
  const b = await req.json().catch(() => ({}));
  const trigger = b?.trigger === "auto" ? "auto" : "manual";
  return NextResponse.json(await runAssessment(u.email, trigger, { psi: b?.psi === true }));
}
