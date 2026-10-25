import { getSetting, setSetting } from "../accounts";

// Per-criterion tracking saved by the admin on /admin/legal-risk (app settings, key legal_risk_reviews).
// "Legal review completed" is only ever set by a person naming the reviewer; no test or code path sets it.

export type Tracking = "not_started" | "in_progress" | "done";
export type Review = {
  tracking?: Tracking;
  reviewer?: string;
  reviewedAt?: string;
  reviewNote?: string;
  /** Last time someone pressed "Reassess after changes" for this criterion. */
  reassessedAt?: string;
};
export type Reviews = Record<string, Review>;

const KEY = "legal_risk_reviews";

export function cleanReview(v: unknown): Review | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const r: Review = {};
  if (o.tracking === "not_started" || o.tracking === "in_progress" || o.tracking === "done") r.tracking = o.tracking;
  if (typeof o.reviewer === "string" && o.reviewer.trim()) r.reviewer = o.reviewer.trim().slice(0, 80);
  if (typeof o.reviewedAt === "string" && /^\d{4}-\d{2}-\d{2}$/.test(o.reviewedAt)) r.reviewedAt = o.reviewedAt;
  if (typeof o.reviewNote === "string") r.reviewNote = o.reviewNote.slice(0, 500);
  if (typeof o.reassessedAt === "string" && /^\d{4}-\d{2}-\d{2}/.test(o.reassessedAt)) r.reassessedAt = o.reassessedAt.slice(0, 10);
  // A review needs both a reviewer and a date, otherwise it does not count.
  if (!r.reviewer || !r.reviewedAt) { delete r.reviewer; delete r.reviewedAt; delete r.reviewNote; }
  return r;
}

export const isReviewed = (r: Review | undefined) => !!(r?.reviewer && r.reviewedAt);

export async function getReviews(): Promise<Reviews> {
  const raw = await getSetting(KEY).catch(() => null);
  if (!raw) return {};
  try {
    const j = JSON.parse(raw) as Record<string, unknown>;
    const out: Reviews = {};
    for (const [k, v] of Object.entries(j)) { const r = /^\d+$/.test(k) ? cleanReview(v) : null; if (r) out[k] = r; }
    return out;
  } catch {
    return {};
  }
}

export async function saveReview(id: number, patch: unknown): Promise<Reviews> {
  const all = await getReviews();
  const cur = all[String(id)] ?? {};
  const next = cleanReview({ ...cur, ...(patch as object) });
  all[String(id)] = next ?? cur;
  await setSetting(KEY, JSON.stringify(all));
  return all;
}
