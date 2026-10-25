import { getEtf } from "../etfBenchmark";
import { SOURCE_CHECKS, benchmarkCheck, contentChecks, type CheckResult } from "./checks";
import { DATA_SOURCES, FACTS } from "./facts";
import { MODEL_VERSIONS } from "./modelVersions";
import { CRITERIA, ASSESSED_AT, GROUPS, initialRisk, residualRisk, summarise } from "./register";
import { getReviews, isReviewed, type Reviews } from "./reviews";

/** Everything the dashboard shows, built on the server so the register never ships in a client bundle. */
export async function dashboardData() {
  const [reviews, etf] = await Promise.all([getReviews(), getEtf().catch(() => null)]);
  const checks: CheckResult[] = [...contentChecks()];
  if (etf) checks.push(benchmarkCheck(etf));
  return buildDashboard(reviews, checks);
}

export function buildDashboard(reviews: Reviews, checks: CheckResult[]) {
  const s = summarise();
  return {
    assessedAt: ASSESSED_AT,
    groups: GROUPS,
    criteria: CRITERIA.map((c) => ({ ...c, initial: initialRisk(c), residual: residualRisk(c), review: reviews[String(c.id)] ?? null, reviewed: isReviewed(reviews[String(c.id)]) })),
    summary: { initialAverage: s.initialAverage, residualAverage: s.residualAverage, criticalIds: s.critical.map((c) => c.id), topIds: s.ranked.slice(0, 10).map((c) => c.id) },
    checks,
    sourceChecks: SOURCE_CHECKS,
    dataSources: DATA_SOURCES,
    modelVersions: MODEL_VERSIONS,
    facts: FACTS,
  };
}
export type Dashboard = ReturnType<typeof buildDashboard>;
