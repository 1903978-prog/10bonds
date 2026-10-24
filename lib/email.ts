/**
 * Sends e-mail through Resend's HTTP API when RESEND_API_KEY and EMAIL_FROM are set on the server.
 * Without them nothing is sent and the caller is told, so sign-up still works.
 */
export function siteUrl(): string {
  return (process.env.SITE_URL ?? "https://10bonds.fly.dev").replace(/\/$/, "");
}

// E-mails count as "on" only once Resend says the sending domain is verified: until then a confirmation
// e-mail would never arrive and new accounts (and the admin) would wait for a link that cannot come.
let domainVerified = false;
let checkedAt = 0;
let checking: Promise<void> | null = null;
let lastRefusedAt = 0;

/** The domain part of EMAIL_FROM ("10BONDS <noreply@10bonds.com>" -> "10bonds.com"). */
export function fromDomain(from = process.env.EMAIL_FROM ?? ""): string | null {
  const m = from.match(/@([a-z0-9.-]+)>?\s*$/i);
  return m ? m[1].toLowerCase() : null;
}

export function markEmailDomainVerified(v: boolean) {
  domainVerified = v;
  checkedAt = Date.now();
}

async function refreshDomain() {
  const domain = fromDomain();
  if (!domain || !process.env.RESEND_API_KEY) return;
  if (domain === "resend.dev") return markEmailDomainVerified(true);
  try {
    const r = await fetch("https://api.resend.com/domains", { headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` }, signal: AbortSignal.timeout(8000) });
    // A "sending only" key may not list domains (401): then the only proof is a send, so try and learn from the answer.
    if (r.status === 401) return markEmailDomainVerified(Date.now() - lastRefusedAt > 1_800_000);
    if (!r.ok) return;
    const b = (await r.json()) as { data?: { name: string; status: string }[] };
    markEmailDomainVerified(Boolean(b.data?.some((d) => d.name === domain && d.status === "verified")));
  } catch {
    /* keep the last answer */
  }
}

export function emailConfigured(): boolean {
  if (!(process.env.RESEND_API_KEY && process.env.EMAIL_FROM)) return false;
  if (Date.now() - checkedAt > (domainVerified ? 3_600_000 : 300_000) && !checking) {
    checking = refreshDomain().finally(() => { checking = null; });
  }
  return domainVerified;
}

/** Like emailConfigured, but waits for Resend's answer when it has not been asked yet (just after a restart). */
export async function emailReady(): Promise<boolean> {
  if (!(process.env.RESEND_API_KEY && process.env.EMAIL_FROM)) return false;
  if (emailConfigured()) return true;
  if (!checking) checking = refreshDomain().finally(() => { checking = null; });
  await checking;
  return domainVerified;
}

/** What the server knows about e-mail, without secrets (for the deploy check and the admin page). */
export async function emailStatus() {
  const keySet = Boolean(process.env.RESEND_API_KEY);
  const domain = fromDomain();
  return { keySet, fromSet: Boolean(process.env.EMAIL_FROM), domain, domainVerified: keySet ? await emailReady() : false };
}

export async function sendEmail(to: string, subject: string, html: string, text: string, replyTo?: string, headers?: Record<string, string>): Promise<"sent" | "not-configured" | "failed"> {
  // Sending needs only the key and the sender; the domain check never blocks a send (a sending-only key cannot read domains).
  if (!(process.env.RESEND_API_KEY && process.env.EMAIL_FROM)) return "not-configured";
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.EMAIL_FROM, to, subject, html, text, ...(replyTo ? { reply_to: replyTo } : {}), ...(headers ? { headers } : {}) }),
      signal: AbortSignal.timeout(10_000),
    });
    const body = res.ok ? "" : (await res.text().catch(() => "")).slice(0, 300);
    if (!res.ok) console.error("[email] send failed: HTTP", res.status, body);
    // Resend refuses a domain that is not verified yet (403): stop claiming e-mail works until a later send succeeds.
    if (!res.ok && res.status === 403 && /verif|domain/i.test(body)) {
      lastRefusedAt = Date.now();
      markEmailDomainVerified(false);
    }
    if (res.ok) markEmailDomainVerified(true);
    return res.ok ? "sent" : "failed";
  } catch (e) {
    console.error("[email] send failed:", (e as Error).name);
    return "failed";
  }
}

export const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export function confirmationEmail(username: string, link: string) {
  const subject = "Confirm your 10BONDS account";
  const text = `Hi ${username},\n\nPlease confirm your e-mail address to finish opening your 10BONDS account:\n${link}\n\nThe link works for 3 days. If you did not sign up, ignore this e-mail.\n\n10BONDS is an information service and does not give investment advice.`;
  const html = `<!doctype html><html><body style="margin:0;background:#f5f5f7;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1d1d1f">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border-radius:20px;padding:32px">
<tr><td style="font-size:20px;font-weight:700">10BONDS</td></tr>
<tr><td style="padding-top:20px;font-size:16px;line-height:1.5">Hi ${esc(username)},<br><br>Please confirm your e-mail address to finish opening your account.</td></tr>
<tr><td style="padding:28px 0"><a href="${esc(link)}" style="display:inline-block;background:#0071e3;color:#fff;text-decoration:none;font-weight:600;font-size:16px;padding:14px 28px;border-radius:999px">Confirm my account</a></td></tr>
<tr><td style="font-size:13px;line-height:1.5;color:#6e6e73">The button works for 3 days. If it does not open, copy this link into your browser:<br><span style="word-break:break-all">${esc(link)}</span><br><br>If you did not sign up, ignore this e-mail.<br><br>10BONDS is an information service and does not give investment advice.</td></tr>
</table></td></tr></table></body></html>`;
  return { subject, html, text };
}
