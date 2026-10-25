import { NOT_VERIFIED, type Fig, type Report } from "../bondReport";

// Evidence gate for issuer reports. A figure that claims to be verified or provisional must carry a date when it is an
// observed value from the data copy or from research; a model figure must say it is a model. Anything that does not
// is shown as "Not verified" instead of as a fact. Reversible: remove the call in app/report/[isin]/page.tsx.

const MARKET = /exchange|broker|quote|indicative/i;

/** Why a figure is not acceptable as published, or null when it is. */
export function figProblem(f: Fig): string | null {
  if (f.status === "not_verified") return null;
  // Market data (a yield, a quote) goes stale, so it needs its date; fixed contract terms (maturity, ISIN) do not.
  if (f.kind === "observed" && MARKET.test(f.source ?? "") && !f.asOf) return "market value without a date";
  if (f.kind === "model" && !f.source) return "model value without a stated basis";
  return null;
}

function walk(o: unknown, path: string, out: { path: string; problem: string }[], fix: boolean): void {
  if (!o || typeof o !== "object") return;
  const rec = o as Record<string, unknown>;
  if ("status" in rec && "text" in rec && typeof rec.text === "string") {
    const p = figProblem(rec as unknown as Fig);
    if (p) {
      out.push({ path, problem: p });
      if (fix) { for (const k of Object.keys(rec)) delete rec[k]; Object.assign(rec, NOT_VERIFIED); }
    }
    return;
  }
  for (const [k, v] of Object.entries(rec)) walk(v, path ? `${path}.${k}` : k, out, fix);
}

/** Every figure in the report that lacks mandatory evidence. */
export function evidenceProblems(r: Report): { path: string; problem: string }[] {
  const out: { path: string; problem: string }[] = [];
  walk(r, "", out, false);
  return out;
}

/** A copy of the report in which every figure without mandatory evidence is replaced by "Not verified". */
export function enforceEvidence(r: Report): Report {
  const copy = JSON.parse(JSON.stringify(r)) as Report;
  walk(copy, "", [], true);
  return copy;
}
