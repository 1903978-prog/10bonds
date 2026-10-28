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

export function liveCheckMail(summary: string, runUrl: string) {
  const s = summary.replace(/\s+/g, " ").trim().slice(0, 600);
  return {
    subject: "10BONDS nightly live check FAILED",
    text: `The nightly live check of 10bonds.com failed.\n\n${s}\n\nDetails: ${runUrl}`,
    html: `<p>The nightly live check of 10bonds.com failed.</p><p>${esc(s)}</p><p><a href="${esc(runUrl)}">Details</a></p>`,
  };
}

export async function sendLiveCheckAlert(summary: string, runUrl: string) {
  const m = liveCheckMail(summary, runUrl);
  return sendEmail(liveCheckRecipient(), m.subject, m.html, m.text);
}
