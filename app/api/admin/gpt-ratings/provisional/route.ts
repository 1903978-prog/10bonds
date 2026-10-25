import { NextResponse } from "next/server";
import { currentUser } from "@/lib/currentUser";
import { bondsMaturingOn } from "@/lib/bonds";
import { saveScenarioRatings } from "@/lib/gptRatingsDb";
import { SCENARIOS, matchScenarios, scenarioRow } from "@/lib/provisionalScenarios";

export const dynamic = "force-dynamic";

async function admin() {
  const u = await currentUser();
  return u?.isAdmin && u.adminState === "ok" ? u : null;
}

async function match() {
  const cands = await bondsMaturingOn([...new Set(SCENARIOS.map((s) => s.maturity))]);
  return matchScenarios(cands).map((m) => ({ key: m.scenario.key, label: m.scenario.label, isin: m.isin, problem: m.problem, candidates: m.candidates.slice(0, 5).map((c) => `${c.isin} ${c.issuer ?? c.name ?? ""}`) }));
}

/** Admin only: which ISIN each of the 10 provisional-scenario bonds matches (nothing is saved). */
export async function GET() {
  if (!(await admin())) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ matches: await match() }, { headers: { "Cache-Control": "no-store" } });
}

/** Admin only: saves the provisional IR / BR / Risk Pay values for every uniquely matched bond; the others are reported, never guessed. */
export async function POST() {
  if (!(await admin())) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const matches = await match();
  const rows = matches.flatMap((m) => {
    const s = SCENARIOS.find((x) => x.key === m.key)!;
    return m.isin ? [{ isin: m.isin, ...scenarioRow(s) }] : [];
  });
  const saved = await saveScenarioRatings(rows);
  return NextResponse.json({ saved, matches });
}
