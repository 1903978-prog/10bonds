import { CURVE_RATINGS, curveProblems, V1_CURVE, type CurveConfig, type CurveRating } from "./curve";

// Version rules, kept free of the database so they can be tested: only drafts can change, activating a draft
// archives the version that was active, and an active or archived version is never edited or deleted.

export type VersionStatus = "draft" | "active" | "archived";
export type CurveVersion = CurveConfig & {
  status: VersionStatus;
  notes: string | null;
  justification: string | null;
  createdAt: string;
  createdBy: string | null;
  activatedAt: string | null;
  activatedBy: string | null;
};

export type DraftInput = Partial<Pick<CurveConfig, "version" | "minMaturity" | "maxMaturity" | "floor" | "exceptionalBp">> & {
  premiums?: Partial<Record<CurveRating, number>>;
  notes?: string | null;
};

/** A new draft based on `from` (or the Version 1.0 defaults) with the given changes. */
export function draftFrom(from: CurveConfig | null, input: DraftInput): CurveConfig {
  const base = from ?? V1_CURVE;
  const premiums = { ...base.premiums };
  for (const r of CURVE_RATINGS) {
    const v = input.premiums?.[r];
    if (v !== undefined) premiums[r] = Number(v);
  }
  return {
    ...base,
    id: 0,
    version: input.version ?? base.version,
    minMaturity: input.minMaturity ?? base.minMaturity,
    maxMaturity: input.maxMaturity ?? base.maxMaturity,
    floor: input.floor ?? base.floor,
    exceptionalBp: input.exceptionalBp ?? base.exceptionalBp,
    premiums,
  };
}

/** Why a draft cannot be activated (empty = it can). */
export function activationProblems(v: CurveVersion | undefined, all: CurveVersion[]): string[] {
  if (!v) return ["Version not found"];
  if (v.status !== "draft") return ["Only a draft can be activated"];
  const p = curveProblems(v);
  if (all.some((o) => o.id !== v.id && o.version === v.version)) p.push(`Version ${v.version} already exists`);
  return p;
}

/** The versions after activating draft `id`: it becomes active, the previous active one is archived. Inputs are not changed. */
export function activate(all: CurveVersion[], id: number, by: string, at: string): CurveVersion[] {
  const problems = activationProblems(all.find((v) => v.id === id), all);
  if (problems.length) throw new Error(problems.join("; "));
  return all.map((v) =>
    v.id === id ? { ...v, status: "active", activatedAt: at, activatedBy: by } : v.status === "active" ? { ...v, status: "archived" } : v,
  );
}

export const activeOf = (all: CurveVersion[]) => all.find((v) => v.status === "active") ?? null;
