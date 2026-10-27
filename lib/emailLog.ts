import { accountsConfigured, accountsSql } from "./accounts";

export type EmailLogRow = { at: string; kind: string; to: string; outcome: string; detail: string };

/** Records every send attempt (address masked) so /admin shows why an e-mail did not go out. Never throws. */
export async function logEmail(kind: string, to: string, outcome: string, detail: string) {
  if (!accountsConfigured()) return;
  try {
    const sql = await accountsSql();
    await sql`create table if not exists app.email_log (id bigserial primary key, at timestamptz not null default now(), kind text, to_masked text, outcome text, detail text)`;
    const masked = to.replace(/^(.).*@(.).*(\.[a-z]+)$/i, "$1***@$2***$3");
    await sql`insert into app.email_log (kind, to_masked, outcome, detail) values (${kind}, ${masked}, ${outcome}, ${detail.slice(0, 300)})`;
  } catch {
    /* logging must never break sending */
  }
}

export async function recentEmailLog(): Promise<EmailLogRow[]> {
  if (!accountsConfigured()) return [];
  const sql = await accountsSql();
  await sql`create table if not exists app.email_log (id bigserial primary key, at timestamptz not null default now(), kind text, to_masked text, outcome text, detail text)`;
  const rows = await sql<{ at: Date; kind: string; to_masked: string; outcome: string; detail: string }[]>`select at, kind, to_masked, outcome, detail from app.email_log order by id desc limit 30`;
  return rows.map((r) => ({ at: r.at.toISOString(), kind: r.kind, to: r.to_masked, outcome: r.outcome, detail: r.detail }));
}
