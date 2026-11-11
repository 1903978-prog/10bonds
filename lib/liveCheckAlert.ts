import { createHmac, timingSafeEqual } from "node:crypto";
import { esc, sendEmail } from "@/lib/email";

/** The key the nightly live check signs its request with (same pattern as the weekly e-mail). */
export function liveCheckToken(key: string): string {
  return createHmac("sha256", key).update("live-check-alert").digest("hex");
}

export function liveCheckTokenOk(key: string | undefined, given: string): boolean {
  if (!key || !given) return false;
  const want = liveCheckToken(key);
  return given.length === want.length && timingSafeEqual(Buffer.from(given), Buffer.from(want));
}

/** Where the notice goes: the site owner, the first admin address. */
export function liveCheckRecipient(env: string | undefined = process.env.ADMIN_EMAILS): string {
  return (env ?? "1903978@gmail.com").split(",")[0].trim().toLowerCase();
}

export type AlertKind = "live-check" | "backup";

/** Backup alerts: at most one e-mail per UTC day (a retry or a manual run the same day stays quiet). */
export function backupAlertDue(lastSentDay: string | null, now: Date = new Date()): boolean {
  return lastSentDay !== now.toISOString().slice(0, 10);
}

export function liveCheckMail(summary: string, runUrl: string, kind: AlertKind = "live-check") {
  const s = summary.replace(/\s+/g, " ").trim().slice(0, 600);
  const what = kind === "backup" ? "The nightly database backup (or its restore test)" : "The nightly live check of 10bonds.com";
  return {
    subject: kind === "backup" ? "10BONDS nightly BACKUP FAILED" : "10BONDS nightly live check FAILED",
    text: `${what} failed.\n\n${s}\n\nDetails: ${runUrl}`,
    html: `<p>${what} failed.</p><p>${esc(s)}</p><p><a href="${esc(runUrl)}">Details</a></p>`,
  };
}

export async function sendLiveCheckAlert(summary: string, runUrl: string, kind: AlertKind = "live-check") {
  const m = liveCheckMail(summary, runUrl, kind);
  return sendEmail(liveCheckRecipient(), m.subject, m.html, m.text);
}
