import { readToken, signToken } from "./session";

export { NEWSLETTER_TEXT, newsletterLang, type NewsletterLang } from "./newsletterText";

// Unsubscribe links must keep working for as long as old e-mails sit in inboxes.
const TTL = 10 * 365 * 86400_000;

export function unsubscribeToken(userId: number): string | null {
  return signToken("unsubscribe", String(userId), TTL);
}

export function readUnsubscribeToken(token: string | null | undefined): number | null {
  const p = readToken("unsubscribe", token);
  return p && /^\d+$/.test(p) ? Number(p) : null;
}

/** Link to put in every newsletter e-mail (and in the List-Unsubscribe header). */
export function unsubscribeUrl(siteUrl: string, userId: number): string | null {
  const t = unsubscribeToken(userId);
  return t ? `${siteUrl.replace(/\/$/, "")}/api/newsletter/unsubscribe?t=${encodeURIComponent(t)}` : null;
}
