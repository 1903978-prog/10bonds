import { NextResponse } from "next/server";
import { currentUser } from "@/lib/currentUser";
import { loadBonds, loadOutliers } from "@/lib/bonds";
import { OUTLIER_SD } from "@/lib/outliers";
import { signatureOf } from "@/lib/bestTable";
import { LIMITS } from "@/lib/limits";
import { curveProblems, CURVE_RATINGS, V1_CURVE, type CurveRating } from "@/lib/riskPremium/curve";
import { draftFrom, type DraftInput } from "@/lib/riskPremium/versions";
import { compareScenario, contextFor, DEFAULT_SCENARIO, sensitivity, universeReport } from "@/lib/riskPremium/shadow";
import {
  activateVersion, addReview, createDraft, deactivateActive, deleteDraft, getWeight, latestReviews, MAX_WEIGHT, listAudit, listRuns, listVersions, recordRun, setOutlierSd, setWeight, updateDraft,
} from "@/lib/riskPremium/store";

export const dynamic = "force-dynamic";

async function admin() {
  const u = await currentUser();
  return u?.isAdmin ? u : null;
}
const notFound = () => NextResponse.json({ error: "Not found" }, { status: 404 });
const bad = (error: string, problems?: string[]) => NextResponse.json({ error, problems }, { status: 400 });
const num = (v: string | null, d: number, lo: number, hi: number) => {
  const n = v === null ? NaN : Number(v);
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d;
};

/** Everything the Risk Premium Model page shows. ?duration=&ytm=&risk= set the comparison; ?draft=<id> compares a draft too. */
export async function GET(req: Request) {
  if (!(await admin())) return notFound();
  const url = new URL(req.url);
  const sc = {
    duration: num(url.searchParams.get("duration"), DEFAULT_SCENARIO.duration, LIMITS.duration.min, LIMITS.duration.max),
    ytm: num(url.searchParams.get("ytm"), DEFAULT_SCENARIO.ytm, LIMITS.ytm.min, LIMITS.ytm.max),
    risk: Math.round(num(url.searchParams.get("risk"), DEFAULT_SCENARIO.risk, LIMITS.risk.min, LIMITS.risk.max)),
  };
  const [versions, weight, reviews, audit, data, outliers] = await Promise.all([listVersions(), getWeight(), latestReviews(), listAudit(60), loadBonds(), loadOutliers()]);
  const active = versions.find((v) => v.status === "active") ?? null;
  const reviewMap = new Map(reviews.map((r) => [r.isin, r.decision]));
  const curve = active ?? V1_CURVE;
  const ctx = contextFor(data.bonds, data.asOf, curve, reviewMap);
  const u = universeReport(data.bonds, ctx);
  // Every calculation is recorded once per curve version and bond copy, so it can be reproduced later.
  const runId = active ? await recordRun(active.id, signatureOf(data), data.asOf, u.evaluations, { counts: u.counts }).catch(() => null) : null;
  const draftId = Number(url.searchParams.get("draft"));
  const draft = versions.find((v) => v.id === draftId && v.status === "draft");
  return NextResponse.json(
    {
      weight, versions, active: active?.id ?? null, reviews, audit, runs: await listRuns(8), runId,
      source: data.source, asOf: data.asOf, bund: ctx.bund.points.map((p) => ({ years: Math.round(p.years * 100) / 100, ytm: p.ytm })),
      compare: compareScenario(data.bonds, ctx, sc, outliers),
      draftCompare: draft ? { id: draft.id, version: draft.version, ...compareScenario(data.bonds, contextFor(data.bonds, data.asOf, draft, reviewMap, ctx.bund), sc) } : null,
      universe: { counts: u.counts, reasons: u.reasons, belowHurdle: u.belowHurdle.slice(0, 200), exceptional: u.exceptional, eligible: u.eligible.length },
      sensitivity: sensitivity(data.bonds, ctx),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

function draftInput(b: Record<string, unknown>): DraftInput {
  const premiums: Partial<Record<CurveRating, number>> = {};
  const p = (b.premiums ?? {}) as Record<string, unknown>;
  for (const r of CURVE_RATINGS) if (p[r] !== undefined && p[r] !== "") premiums[r] = Number(p[r]);
  const n = (v: unknown) => (v === undefined || v === "" || v === null ? undefined : Number(v));
  return {
    version: typeof b.version === "string" ? b.version.trim() : undefined,
    premiums,
    minMaturity: n(b.minMaturity),
    maxMaturity: n(b.maxMaturity),
    floor: typeof b.floor === "string" ? (b.floor as CurveRating) : undefined,
    exceptionalBp: n(b.exceptionalBp),
  };
}

export async function POST(req: Request) {
  const user = await admin();
  if (!user) return notFound();
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!b || typeof b !== "object") return bad("Bad request");
  const by = user.email;
  const why = typeof b.justification === "string" ? b.justification.trim().slice(0, 2000) : "";
  if (why.length < 5) return bad("Please write a short justification (at least 5 characters).");
  const notes = typeof b.notes === "string" ? b.notes.slice(0, 2000) : null;
  const versions = await listVersions();
  switch (b.action) {
    case "draft":
    case "restore_defaults": {
      const from = b.action === "restore_defaults" ? V1_CURVE : versions.find((v) => v.id === Number(b.fromId)) ?? versions.find((v) => v.status === "active") ?? V1_CURVE;
      const c = draftFrom(from, b.action === "restore_defaults" ? { version: typeof b.version === "string" ? b.version.trim() : undefined } : draftInput(b));
      const problems = curveProblems(c);
      if (versions.some((v) => v.version === c.version)) problems.push(`Version ${c.version} already exists`);
      if (problems.length) return bad("The curve has problems", problems);
      return NextResponse.json({ ok: true, id: await createDraft(c, notes, why, by) });
    }
    case "update_draft": {
      const v = versions.find((x) => x.id === Number(b.id));
      if (!v || v.status !== "draft") return bad("Only drafts can be changed");
      const c = draftFrom(v, draftInput(b));
      const problems = curveProblems(c);
      if (versions.some((o) => o.id !== v.id && o.version === c.version)) problems.push(`Version ${c.version} already exists`);
      if (problems.length) return bad("The curve has problems", problems);
      return (await updateDraft(v.id, c, notes ?? v.notes, why, by)) ? NextResponse.json({ ok: true }) : bad("Only drafts can be changed");
    }
    case "delete_draft":
      return (await deleteDraft(Number(b.id), why, by)) ? NextResponse.json({ ok: true }) : bad("Only drafts can be deleted");
    case "activate": {
      const problems = await activateVersion(Number(b.id), why, by);
      return problems.length ? bad("This version cannot be activated", problems) : NextResponse.json({ ok: true });
    }
    case "deactivate": {
      if ((await getWeight()) > 0) return bad("Set the risk premium weight to 0 first (search page, yellow slider).");
      return (await deactivateActive(why, by)) ? NextResponse.json({ ok: true }) : bad("No active version");
    }
    case "review": {
      if (typeof b.isin !== "string" || !/^[A-Z0-9]{6,20}$/.test(b.isin)) return bad("Unknown ISIN");
      if (b.decision !== "approved" && b.decision !== "rejected") return bad("Approve or reject");
      const active = versions.find((v) => v.status === "active");
      await addReview(b.isin, b.decision, why, active?.id ?? null, by);
      return NextResponse.json({ ok: true });
    }
    case "weight": {
      // The weight every user gets (yellow slider on the search page). 0 = the current ranking.
      const w = Number(b.weight);
      if (!Number.isFinite(w) || w < 0 || w > MAX_WEIGHT) return bad(`Weight must be between 0 and ${MAX_WEIGHT}`);
      if (w > 0 && !versions.some((v) => v.status === "active")) return bad("Activate a curve version first.");
      await setWeight(w, why, by);
      return NextResponse.json({ ok: true });
    }
    case "outlier_sd": {
      // Outlier rule for every user (yellow slider on the search page): k standard deviations above the cohort average.
      const k = Number(b.sd);
      if (!Number.isFinite(k) || k < OUTLIER_SD.min || k > OUTLIER_SD.max) return bad(`Must be between ${OUTLIER_SD.min} and ${OUTLIER_SD.max}`);
      await setOutlierSd(k, why, by);
      return NextResponse.json({ ok: true });
    }
    default:
      return bad("Unknown action");
  }
}
