import { randomUUID } from "node:crypto";
import type { RankedBond } from "./types";

/**
 * Data quality check sent to secval (the owner's monitoring tool) each time a new daily bond copy is loaded.
 * Two datasets: the bond copy itself (public.public_bonds) and the ranking cache rebuilt from it (app.best_bonds).
 * Secval scores them with fixed rules (anti-hacker server/quality/datasets/tenbonds.ts) and shows the result in the
 * Database column of its Health dashboard. Only the columns below are sent: bond facts, no personal data.
 * Off unless the Fly secret SECVAL_QUALITY_TOKEN is set. Never throws: the site must not depend on it.
 */

export const SECVAL_DEFAULT_URL = "https://secval.onrender.com";

type Row = Record<string, unknown>;
type Env = Record<string, string | undefined>;

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
};
const iso = (v: unknown): string | null => {
  if (v === null || v === undefined || v === "") return null;
  const d = v instanceof Date ? v : new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};
const str = (v: unknown): string | null => (typeof v === "string" ? v : v === null || v === undefined ? null : String(v));

/** One record per row of the copy, exactly as stored (no trimming: a bad value must show up as bad). */
export function copyRecords(raw: Row[], fetchedAt: string, now = Date.parse(fetchedAt)): Row[] {
  return raw.map((r) => {
    const maturity = iso(r.maturity);
    return {
      isin: str(r.isin),
      name: str(r.name),
      issuer: str(r.issuer),
      currency: str(r.currency),
      coupon: num(r.coupon),
      maturity,
      gross_ytm: num(r.gross_ytm),
      modified_duration: num(r.modified_duration),
      ytm_as_of: iso(r.ytm_as_of),
      years_to_maturity: maturity ? Math.round(((Date.parse(maturity) - now) / (365.25 * 86_400_000)) * 1e4) / 1e4 : null,
      source: "lm-op-model",
      fetched_at: fetchedAt,
    };
  });
}

/** One record per stored best-bonds row (duration step, risk step, bond). */
export function rankingRecords(stored: { duration: unknown; level: unknown; bond: unknown }[], asOf: string | null): Row[] {
  return stored.map((s) => {
    const b = (typeof s.bond === "string" ? JSON.parse(s.bond) : s.bond) as RankedBond;
    return {
      duration: num(s.duration),
      level: num(s.level),
      rank: num(b.rank),
      isin: str(b.isin),
      gross_ytm: num(b.grossYtm),
      modified_duration: num(b.modifiedDuration),
      loss_adjusted_yield: num(b.score),
      as_of: iso(asOf),
      source: "public.public_bonds",
    };
  });
}

const rankKey = (r: Row) => `${r.duration}|${r.level}|${r.isin}`;

/** The yield and duration the copy holds for each ranked bond: what the stored ranking must match. */
export function rankingTruth(records: Row[], copy: { isin: string; grossYtm: number | null; modifiedDuration: number | null }[]): Record<string, Row> {
  const byIsin = new Map(copy.map((b) => [b.isin, b]));
  const out: Record<string, Row> = {};
  for (const r of records) {
    const b = byIsin.get(String(r.isin));
    if (b) out[rankKey(r)] = { gross_ytm: b.grossYtm, modified_duration: b.modifiedDuration };
  }
  return out;
}

type Common = { startedAt: string; finishedAt: string; signature: string };

export function copySubmission(records: Row[], c: Common) {
  return {
    jobId: `10bonds-copy-${c.finishedAt}-${randomUUID().slice(0, 8)}`,
    app: "10bonds",
    module: "Bond data",
    page: "All bond pages",
    dataset: "10bonds.public_bonds",
    datasetCode: c.signature.slice(0, 100),
    table: "public.public_bonds",
    sourceSystem: "lm-op-model daily copy (Neon public.public_bonds)",
    initiator: "10bonds server (new daily copy detected)",
    kind: "sync" as const,
    startedAt: c.startedAt,
    finishedAt: c.finishedAt,
    operationCompleted: true,
    sourceReached: true,
    records,
    access: { initiatorAuthorized: true, violations: [] as string[] },
  };
}

export function rankingSubmission(records: Row[], copyIsins: string[], truth: Record<string, Row>, c: Common) {
  return {
    jobId: `10bonds-best-${c.finishedAt}-${randomUUID().slice(0, 8)}`,
    app: "10bonds",
    module: "Rankings",
    page: "One-bond chart and slider limits",
    dataset: "10bonds.best_bonds",
    datasetCode: c.signature.slice(0, 100),
    table: "app.best_bonds",
    sourceSystem: "10bonds ranking, rebuilt from public.public_bonds",
    initiator: "10bonds server (new daily copy detected)",
    kind: "recompute" as const,
    startedAt: c.startedAt,
    finishedAt: c.finishedAt,
    operationCompleted: true,
    sourceReached: true,
    records,
    references: { public_bonds: copyIsins },
    authoritative: truth,
    access: { initiatorAuthorized: true, violations: [] as string[] },
  };
}

export function secvalConfigured(env: Env = process.env): boolean {
  return Boolean(env.SECVAL_QUALITY_TOKEN);
}

/** Posts one submission; returns secval's score line, or the reason it failed. */
export async function sendToSecval(body: unknown, env: Env = process.env, fetcher: typeof fetch = fetch): Promise<string> {
  const url = `${(env.SECVAL_URL || SECVAL_DEFAULT_URL).replace(/\/+$/, "")}/api/quality/validate`;
  try {
    const res = await fetcher(url, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${env.SECVAL_QUALITY_TOKEN}` },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60_000),
    });
    const j = (await res.json().catch(() => ({}))) as { dataset?: string; outcome?: string; score?: number | null; error?: string };
    return res.ok ? `${j.dataset}: ${j.outcome} ${j.score ?? "no score"}` : `HTTP ${res.status} ${j.error ?? ""}`.trim();
  } catch (e) {
    return `not sent: ${(e as Error).message}`;
  }
}

/**
 * Reads what was just stored and sends both checks. Called once per new copy (lib/bestTable.ts), in the background.
 * `copy` is the bond list the ranking was built from.
 */
export async function reportNewCopy(
  copy: { bonds: { isin: string; grossYtm: number | null; modifiedDuration: number | null }[]; asOf: string | null },
  signature: string,
  startedAt: string,
  deps: {
    rawCopy: () => Promise<Row[] | null>;
    storedRanking: () => Promise<{ duration: unknown; level: unknown; bond: unknown }[]>;
    send?: (body: unknown) => Promise<string>;
    env?: Env;
  },
): Promise<string[]> {
  const env = deps.env ?? process.env;
  if (!secvalConfigured(env)) return [];
  const send = deps.send ?? ((b: unknown) => sendToSecval(b, env));
  const out: string[] = [];
  try {
    const raw = await deps.rawCopy();
    if (!raw) return [];
    const finishedAt = new Date().toISOString();
    const c = { startedAt, finishedAt, signature };
    const copyRecs = copyRecords(raw, finishedAt);
    out.push(await send(copySubmission(copyRecs, c)));
    const ranking = rankingRecords(await deps.storedRanking(), copy.asOf);
    // The site matches ISINs trimmed and in capitals (as lib/bonds.ts does), so links are checked the same way.
    const isins = [...new Set(copyRecs.map((r) => String(r.isin ?? "").trim().toUpperCase()).filter(Boolean))];
    out.push(await send(rankingSubmission(ranking, isins, rankingTruth(ranking, copy.bonds), c)));
  } catch (e) {
    out.push(`not sent: ${(e as Error).message}`);
  }
  console.log("[secval] data quality:", out.join(" | "));
  return out;
}
