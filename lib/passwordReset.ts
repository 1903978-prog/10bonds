import { createHash } from "node:crypto";
import { esc, sendEmail, siteUrl } from "./email";
import { readToken, signToken } from "./session";

import { resetLang, type ResetLang } from "./passwordResetText";

export { resetLang, type ResetLang };
export const RESET_TTL_MS = 60 * 60_000;

// The link carries a short hash of the current password hash: once the password changes, the same link stops working (one use).
const tag = (passwordHash: string) => createHash("sha256").update(passwordHash).digest("hex").slice(0, 16);
export const passwordTag = tag;

export function resetLink(userId: number, passwordHash: string, lang: ResetLang, now = Date.now()): string | null {
  const t = signToken("reset", `${userId}-${tag(passwordHash)}`, RESET_TTL_MS, now);
  return t ? `${siteUrl()}/reset-password?t=${encodeURIComponent(t)}&lang=${lang}` : null;
}

export function readReset(token: string | null | undefined, now = Date.now()): { userId: number; tag: string } | null {
  const p = readToken("reset", token, now);
  const m = p?.match(/^(\d+)-([0-9a-f]{16})$/);
  return m ? { userId: Number(m[1]), tag: m[2] } : null;
}

const MAIL: Record<ResetLang, { subject: string; hi: string; body: string; button: string; note: string; ignore: string; info: string }> = {
  en: { subject: "Reset your 10BONDS password", hi: "Hi", body: "Someone asked to reset the password of your 10BONDS account. To choose a new password, open this link:", button: "Choose a new password", note: "The link works for 1 hour and only once.", ignore: "If you did not ask for this, ignore this e-mail: your password stays the same.", info: "10BONDS is an information service and does not give investment advice." },
  it: { subject: "Reimposta la password di 10BONDS", hi: "Ciao", body: "È stata chiesta la reimpostazione della password del tuo account 10BONDS. Per scegliere una nuova password apri questo link:", button: "Scegli una nuova password", note: "Il link funziona per 1 ora e una sola volta.", ignore: "Se non l'hai chiesto tu, ignora questa e-mail: la tua password non cambia.", info: "10BONDS è un servizio di informazione e non fornisce consulenza in materia di investimenti." },
  fr: { subject: "Réinitialisez votre mot de passe 10BONDS", hi: "Bonjour", body: "Une réinitialisation du mot de passe de votre compte 10BONDS a été demandée. Pour choisir un nouveau mot de passe, ouvrez ce lien :", button: "Choisir un nouveau mot de passe", note: "Le lien fonctionne pendant 1 heure et une seule fois.", ignore: "Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail : votre mot de passe reste le même.", info: "10BONDS est un service d'information et ne fournit pas de conseil en investissement." },
  de: { subject: "Setzen Sie Ihr 10BONDS-Passwort zurück", hi: "Hallo", body: "Für Ihr 10BONDS-Konto wurde das Zurücksetzen des Passworts angefordert. Um ein neues Passwort zu wählen, öffnen Sie diesen Link:", button: "Neues Passwort wählen", note: "Der Link gilt 1 Stunde und nur einmal.", ignore: "Wenn Sie das nicht angefordert haben, ignorieren Sie diese E-Mail: Ihr Passwort bleibt gleich.", info: "10BONDS ist ein Informationsdienst und bietet keine Anlageberatung." },
};

export function resetEmail(lang: ResetLang, name: string, link: string) {
  const m = MAIL[lang];
  const text = `${m.hi} ${name},\n\n${m.body}\n${link}\n\n${m.note} ${m.ignore}\n\n${m.info}`;
  const html = `<!doctype html><html lang="${lang}"><body style="margin:0;background:#f5f5f7;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1d1d1f">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border-radius:20px;padding:32px">
<tr><td style="font-size:20px;font-weight:700">10BONDS</td></tr>
<tr><td style="padding-top:20px;font-size:16px;line-height:1.5">${esc(m.hi)} ${esc(name)},<br><br>${esc(m.body)}</td></tr>
<tr><td style="padding:28px 0"><a href="${esc(link)}" style="display:inline-block;background:#0071e3;color:#fff;text-decoration:none;font-weight:600;font-size:16px;padding:14px 28px;border-radius:999px">${esc(m.button)}</a></td></tr>
<tr><td style="font-size:13px;line-height:1.5;color:#6e6e73">${esc(m.note)}<br><span style="word-break:break-all">${esc(link)}</span><br><br>${esc(m.ignore)}<br><br>${esc(m.info)}</td></tr>
</table></td></tr></table></body></html>`;
  return { subject: m.subject, html, text };
}

export async function sendReset(userId: number, email: string, name: string, passwordHash: string, lang: ResetLang) {
  const link = resetLink(userId, passwordHash, lang);
  if (!link) return "failed" as const;
  const m = resetEmail(lang, name, link);
  return sendEmail(email, m.subject, m.html, m.text);
}

