import { accountsSql, getSetting, setSetting } from "./accounts";
import { loadBonds } from "./bonds";
import { sendEmail, siteUrl } from "./email";
import { unsubscribeUrl } from "./newsletter";
import { pickRanking } from "./pickRanking";
import { bondRisk } from "./ratings";
import { WEEKLY_INPUTS, weeklyEmail, type WeeklyPicks } from "./weeklyEmail";

// Sending the weekly e-mail. Real subscribers get it only once the admin has sent a test to themselves and switched
// sending on at /admin/weekly-email. Each account gets at most one e-mail per week, even if the job runs twice.
export const WEEKLY_ON_KEY = "weekly_email_on";
export const WEEKLY_TESTED_KEY = "weekly_email_tested_at";
// Resend allows a few sends per second.
const GAP_MS = 600;

let ready: Promise<void> | null = null;
async function db() {
  const sql = await accountsSql();
  ready ??= (async () => {
    await sql`
      create table if not exists app.weekly_email_sends (
        week text not null,
        user_id bigint not null,
        status text not null,
        at timestamptz not null default now(),
        primary key (week, user_id)
      )`;
  })().catch((e) => {
    ready = null;
    throw e;
  });
  await ready;
  return sql;
}

/** This week's top 10 from today's bonds; null while only sample data is loaded. */
export async function weeklyPicks(allowSample = false): Promise<WeeklyPicks | null> {
  const data = await loadBonds();
  if (data.source !== "live" && !allowSample) return null;
  const { results } = await pickRanking(data.bonds, data.asOf, WEEKLY_INPUTS.duration, WEEKLY_INPUTS.ytm, WEEKLY_INPUTS.risk);
  if (results.length < 10) return null;
  return {
    asOf: data.asOf,
    scanned: data.bonds.length,
    rows: results.slice(0, 10).map((b) => ({ issuer: b.issuer ?? b.name, maturity: b.maturity, ret: b.grossYtm!, risk: bondRisk(b) })),
  };
}

/** ISO week, e.g. "2026-W44": one e-mail per account per week. */
export function weekKey(d = new Date()): string {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const start = Date.UTC(t.getUTCFullYear(), 0, 1);
  return `${t.getUTCFullYear()}-W${String(Math.ceil(((t.getTime() - start) / 86400_000 + 1) / 7)).padStart(2, "0")}`;
}

export async function weeklyStatus() {
  const sql = await db();
  const [on, tested] = await Promise.all([getSetting(WEEKLY_ON_KEY), getSetting(WEEKLY_TESTED_KEY)]);
  const [{ n }] = await sql<{ n: number }[]>`select count(*)::int as n from app.users where newsletter_opt_in and email_verified_at is not null`;
  const last = await sql<{ week: string; sent: number; failed: number }[]>`
    select week, count(*) filter (where status = 'sent')::int as sent, count(*) filter (where status <> 'sent')::int as failed
    from app.weekly_email_sends group by week order by week desc limit 1`;
  return { on: on === "1", testedAt: tested, subscribers: n, last: last[0] ?? null, week: weekKey() };
}

export async function setWeeklyOn(on: boolean): Promise<boolean> {
  if (on && !(await getSetting(WEEKLY_TESTED_KEY))) return false;
  await setSetting(WEEKLY_ON_KEY, on ? "1" : "0");
  return true;
}

/** Sends this week's e-mail to the admin only (marks the test as done when it goes out). */
export async function sendWeeklyTest(userId: number, email: string, lang: string) {
  const picks = await weeklyPicks(true);
  if (!picks) return "no-data" as const;
  const unsub = unsubscribeUrl(siteUrl(), userId);
  const m = weeklyEmail(lang, picks, unsub);
  const r = await sendEmail(email, `[Test] ${m.subject}`, m.html, m.text, process.env.EMAIL_REPLY_TO || undefined, listHeaders(unsub));
  if (r === "sent") await setSetting(WEEKLY_TESTED_KEY, new Date().toISOString());
  return r;
}

const listHeaders = (unsub: string | null): Record<string, string> | undefined =>
  unsub ? { "List-Unsubscribe": `<${unsub}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } : undefined;

/** The weekly run (called by the scheduled job). Does nothing while sending is switched off. */
export async function sendWeekly(): Promise<{ status: "off" | "no-data" | "done"; sent: number; failed: number; skipped: number }> {
  if ((await getSetting(WEEKLY_ON_KEY)) !== "1") return { status: "off", sent: 0, failed: 0, skipped: 0 };
  const picks = await weeklyPicks();
  if (!picks) return { status: "no-data", sent: 0, failed: 0, skipped: 0 };
  const sql = await db();
  const week = weekKey();
  const users = await sql<{ id: string; email: string; email_lang: string | null }[]>`
    select id, email, email_lang from app.users where newsletter_opt_in and email_verified_at is not null order by id`;
  let sent = 0, failed = 0, skipped = 0;
  for (const u of users) {
    const id = Number(u.id);
    // Claim the row first: a second run in the same week skips everyone already done.
    const claimed = await sql`insert into app.weekly_email_sends (week, user_id, status) values (${week}, ${id}, 'sending') on conflict do nothing returning user_id`;
    if (!claimed.length) { skipped++; continue; }
    const unsub = unsubscribeUrl(siteUrl(), id);
    const m = weeklyEmail(u.email_lang, picks, unsub);
    const r = await sendEmail(u.email, m.subject, m.html, m.text, process.env.EMAIL_REPLY_TO || undefined, listHeaders(unsub));
    await sql`update app.weekly_email_sends set status = ${r}, at = now() where week = ${week} and user_id = ${id}`;
    if (r === "sent") sent++;
    else failed++;
    await new Promise((res) => setTimeout(res, GAP_MS));
  }
  console.log(`[weekly-email] ${week}: sent ${sent}, failed ${failed}, skipped ${skipped}`);
  return { status: "done", sent, failed, skipped };
}
