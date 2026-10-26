import { accountsSql } from "./accounts";
import { sendEmail, esc } from "./email";
import { BLOCKED_COUNTRIES, FIRST_BATCH, draftFor, type Firm } from "./outreachText";

export type OutreachStatus = "draft" | "sent" | "failed" | "optout";
export type OutreachRow = { id: number; batch: string; country: string; lang: string; firm: string; city: string | null; email: string; sourceUrl: string; subject: string; body: string; status: OutreachStatus; createdAt: string; sentAt: string | null; blocked: boolean };

let ready: Promise<void> | null = null;
async function sql() {
  const s = await accountsSql();
  ready ??= (async () => {
    await s`
      create table if not exists app.outreach (
        id bigserial primary key,
        batch text not null,
        country text not null,
        lang text not null,
        firm text not null,
        city text,
        email text not null,
        source_url text not null,
        subject text not null,
        body text not null,
        status text not null default 'draft' check (status in ('draft','sent','failed','optout')),
        created_at timestamptz not null default now(),
        sent_at timestamptz
      )`;
    await s`create unique index if not exists outreach_email_idx on app.outreach (lower(email))`;
  })().catch((e) => { ready = null; throw e; });
  await ready;
  return s;
}
export const outreachTableReady = () => sql().then(() => undefined);

const toRow = (r: Record<string, unknown>): OutreachRow => ({
  id: Number(r.id), batch: r.batch as string, country: r.country as string, lang: r.lang as string, firm: r.firm as string, city: (r.city as string) ?? null, email: r.email as string,
  sourceUrl: r.source_url as string, subject: r.subject as string, body: r.body as string, status: r.status as OutreachStatus,
  createdAt: new Date(r.created_at as string).toISOString(), sentAt: r.sent_at ? new Date(r.sent_at as string).toISOString() : null, blocked: BLOCKED_COUNTRIES.includes(r.country as string),
});

export async function listOutreach(): Promise<OutreachRow[]> {
  const s = await sql();
  return (await s`select * from app.outreach order by country, firm`).map(toRow);
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Adds firms as drafts (one per e-mail address; repeats are skipped). Nothing is sent. */
export async function addDrafts(firms: Firm[], batch: string): Promise<number> {
  const s = await sql();
  let n = 0;
  for (const f of firms) {
    if (!EMAIL.test(f.email) || !["IT", "FR", "DE"].includes(f.country)) continue;
    const d = draftFor(f);
    const r = await s`
      insert into app.outreach (batch, country, lang, firm, city, email, source_url, subject, body)
      values (${batch}, ${f.country}, ${d.lang}, ${f.firm}, ${f.city}, ${f.email.toLowerCase()}, ${f.sourceUrl}, ${d.subject}, ${d.body})
      on conflict (lower(email)) do nothing`;
    n += r.count;
  }
  return n;
}
export const loadFirstBatch = () => addDrafts(FIRST_BATCH, "2026-10-26 first batch");

export async function setStatus(id: number, status: "optout" | "draft"): Promise<boolean> {
  const s = await sql();
  return (await s`update app.outreach set status = ${status} where id = ${id} and status <> 'sent'`).count > 0;
}

/** Sends one draft. Blocked countries and opted-out firms are refused. Called only from the admin's confirmed Send button. */
export async function sendOne(id: number): Promise<"sent" | "blocked" | "not-draft" | "failed" | "not-configured"> {
  const s = await sql();
  const rows = await s`select * from app.outreach where id = ${id}`;
  if (!rows.length) return "not-draft";
  const r = toRow(rows[0]);
  if (r.status !== "draft" && r.status !== "failed") return "not-draft";
  if (r.blocked) return "blocked";
  // Replies (including "STOP") need a real inbox: set OUTREACH_REPLY_TO on the server first.
  const replyTo = process.env.OUTREACH_REPLY_TO;
  if (!replyTo) return "not-configured";
  const html = `<div style="font:15px/1.5 -apple-system,Segoe UI,sans-serif;white-space:pre-wrap">${esc(r.body)}</div>`;
  const res = await sendEmail(r.email, r.subject, html, r.body, replyTo, { "List-Unsubscribe": `<mailto:${replyTo}?subject=STOP>` });
  if (res === "sent") await s`update app.outreach set status = 'sent', sent_at = now() where id = ${id}`;
  else if (res === "failed") await s`update app.outreach set status = 'failed' where id = ${id}`;
  return res;
}
