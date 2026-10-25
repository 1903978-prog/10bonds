import { accountsSql, getSetting, setSetting } from "./accounts";
import type { FocusCompany } from "./companiesInFocus";

import { MODEL_VERSION } from "./assessmentModel";

const KEY = "show_verdicts";

/** BUY / WATCH / AVOID labels and the "Our view" text: off for customers until the compliance review is done (admin always sees them). */
export async function verdictsOn(): Promise<boolean> {
  return (await getSetting(KEY).catch(() => null)) === "1";
}
export async function setVerdictsOn(on: boolean) {
  await setSetting(KEY, on ? "1" : "0");
}

/** Keeps the evidence of one published assessment: what was shown, its date, the model version and the figures behind it. Best effort, once per version and date. */
export async function recordAssessment(c: FocusCompany): Promise<void> {
  try {
    const sql = await accountsSql();
    const calculation = { score: c.score, scorecard: c.scorecard, outlook: c.outlook, risk: c.risk, financials: c.financials, capital: c.capital, quotes: c.quotes };
    await sql`insert into app.assessment_evidence (isin, model_version, as_of, source, calculation)
      values (${c.isin}, ${MODEL_VERSION}, ${c.updated}, ${"10bonds research from public information and licensed data"}, ${sql.json(calculation as never)})
      on conflict (isin, model_version, as_of) do nothing`;
  } catch {
    /* the page must still open */
  }
}

export type Evidence = { id: number; isin: string; modelVersion: string; asOf: string; source: string; publishedAt: string; calculation: unknown };
export async function listEvidence(): Promise<Evidence[]> {
  const sql = await accountsSql();
  const rows = await sql<{ id: string; isin: string; model_version: string; as_of: string; source: string; published_at: Date; calculation: unknown }[]>`
    select id, isin, model_version, as_of, source, published_at, calculation from app.assessment_evidence order by published_at desc limit 200`;
  return rows.map((r) => ({ id: Number(r.id), isin: r.isin, modelVersion: r.model_version, asOf: r.as_of, source: r.source, publishedAt: r.published_at.toISOString(), calculation: r.calculation }));
}

export type Correction = { id: number; isin: string | null; name: string; email: string; message: string; requestedAt: string; status: string };

/** Validates and stores an issuer's request to correct a factual error. Returns null when the input is not usable. */
export async function addCorrection(i: { isin?: unknown; name?: unknown; email?: unknown; message?: unknown }): Promise<true | null> {
  const name = String(i.name ?? "").trim().slice(0, 120);
  const email = String(i.email ?? "").trim().slice(0, 200);
  const message = String(i.message ?? "").trim().slice(0, 3000);
  const isin = /^[A-Z]{2}[A-Z0-9]{9}\d$/.test(String(i.isin ?? "")) ? String(i.isin) : null;
  if (!name || message.length < 10 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  const sql = await accountsSql();
  await sql`insert into app.correction_requests (isin, name, email, message) values (${isin}, ${name}, ${email}, ${message})`;
  return true;
}

export async function listCorrections(): Promise<Correction[]> {
  const sql = await accountsSql();
  const rows = await sql<{ id: string; isin: string | null; name: string; email: string; message: string; requested_at: Date; status: string }[]>`
    select id, isin, name, email, message, requested_at, status from app.correction_requests order by requested_at desc limit 200`;
  return rows.map((r) => ({ id: Number(r.id), isin: r.isin, name: r.name, email: r.email, message: r.message, requestedAt: r.requested_at.toISOString(), status: r.status }));
}

export async function setCorrectionStatus(id: number, status: string): Promise<boolean> {
  if (!["open", "done", "rejected"].includes(status)) return false;
  const sql = await accountsSql();
  await sql`update app.correction_requests set status = ${status} where id = ${id}`;
  return true;
}
