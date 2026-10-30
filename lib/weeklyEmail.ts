import { COMPANY } from "./legal";
import { esc, siteUrl } from "./email";
import { FOOTER_NOTE } from "./footerNote";
import { pathOf } from "./seo/locales";
import { welcomeLang, type WelcomeLang } from "./welcomeEmail";

// The weekly e-mail to newsletter subscribers (the owner, 24/10/2026: sign-up promises weekly bond picks).
// One top 10 from the standard ranking, the same list the finder gives for these inputs. Customer wording rules:
// "Return (per year)", never YTM; risk on the 10BONDS 1-10 scale, never agency names; the site's one disclaimer.
export const WEEKLY_INPUTS = { duration: 5, ytm: 4, risk: 6 } as const;

export type WeeklyRow = { issuer: string; maturity: string | null; ret: number; risk: number | null };
export type WeeklyPicks = { asOf: string | null; scanned: number; rows: WeeklyRow[] };

type Text = {
  subject: (date: string) => string;
  title: string;
  intro: (years: number, scanned: string) => string;
  cols: [string, string, string, string];
  avg: (ret: string, risk: string) => string;
  cta: string;
  ctaHint: string;
  why: string;
  unsubscribe: string;
  sentBy: string;
  locale: string;
};

const TEXT: Record<WelcomeLang, Text> = {
  en: {
    subject: (d) => `Your weekly top 10 bonds · ${d}`,
    title: "This week's top 10",
    intro: (y, n) => `10 bonds for a ${y}-year horizon, one per issuer, selected by our standard method from ${n} bonds. The same list goes to every reader and is not tailored to you.`,
    cols: ["Issuer", "Matures", "Return (per year)", "Risk"],
    avg: (r, k) => `Average return ${r}% per year · average risk ${k} of 10`,
    cta: "Build your own top 10",
    ctaHint: "Choose your own horizon, return and risk, and see the ISINs, on 10bonds.com.",
    why: "You get this e-mail because you asked for the weekly 10BONDS e-mail.",
    unsubscribe: "Unsubscribe",
    sentBy: "Sent by",
    locale: "en-GB",
  },
  it: {
    subject: (d) => `La tua top 10 settimanale di obbligazioni · ${d}`,
    title: "La top 10 della settimana",
    intro: (y, n) => `10 obbligazioni per un orizzonte di ${y} anni, una per emittente, selezionate con il nostro metodo standard tra ${n} obbligazioni. La stessa lista va a tutti i lettori e non è personalizzata per te.`,
    cols: ["Emittente", "Scadenza", "Rendimento (annuo)", "Rischio"],
    avg: (r, k) => `Rendimento medio ${r}% annuo · rischio medio ${k} su 10`,
    cta: "Crea la tua top 10",
    ctaHint: "Scegli orizzonte, rendimento e rischio e vedi gli ISIN su 10bonds.com.",
    why: "Ricevi questa e-mail perché hai chiesto l'e-mail settimanale di 10BONDS.",
    unsubscribe: "Annulla l'iscrizione",
    sentBy: "Inviata da",
    locale: "it-IT",
  },
  fr: {
    subject: (d) => `Votre top 10 obligations de la semaine · ${d}`,
    title: "Le top 10 de la semaine",
    intro: (y, n) => `10 obligations pour un horizon de ${y} ans, une par émetteur, sélectionnées par notre méthode standard parmi ${n} obligations. La même liste est envoyée à tous les lecteurs et n'est pas adaptée à votre situation.`,
    cols: ["Émetteur", "Échéance", "Rendement (par an)", "Risque"],
    avg: (r, k) => `Rendement moyen ${r} % par an · risque moyen ${k} sur 10`,
    cta: "Créez votre top 10",
    ctaHint: "Choisissez votre horizon, rendement et risque, et voyez les ISIN, sur 10bonds.com.",
    why: "Vous recevez cet e-mail car vous avez demandé l'e-mail hebdomadaire de 10BONDS.",
    unsubscribe: "Se désinscrire",
    sentBy: "Envoyé par",
    locale: "fr-FR",
  },
  de: {
    subject: (d) => `Ihre wöchentlichen Top 10 Anleihen · ${d}`,
    title: "Die Top 10 der Woche",
    intro: (y, n) => `10 Anleihen für einen Horizont von ${y} Jahren, eine pro Emittent, mit unserer Standardmethode aus ${n} Anleihen ausgewählt. Dieselbe Liste geht an alle Leser und ist nicht auf Sie zugeschnitten.`,
    cols: ["Emittent", "Fällig", "Rendite (pro Jahr)", "Risiko"],
    avg: (r, k) => `Durchschnittliche Rendite ${r} % pro Jahr · durchschnittliches Risiko ${k} von 10`,
    cta: "Eigene Top 10 erstellen",
    ctaHint: "Wählen Sie Horizont, Rendite und Risiko und sehen Sie die ISIN auf 10bonds.com.",
    why: "Sie erhalten diese E-Mail, weil Sie die wöchentliche 10BONDS-E-Mail angefordert haben.",
    unsubscribe: "Abmelden",
    sentBy: "Gesendet von",
    locale: "de-DE",
  },
};

const num = (v: number, lang: WelcomeLang, digits: number) => v.toLocaleString(TEXT[lang].locale, { minimumFractionDigits: digits, maximumFractionDigits: digits });

/** The weekly e-mail. unsubscribe: the reader's one-click link (null in the admin preview). */
export function weeklyEmail(rawLang: unknown, picks: WeeklyPicks, unsubscribe: string | null, base = siteUrl(), now = new Date()) {
  const lang = welcomeLang(rawLang);
  const t = TEXT[lang];
  const date = now.toLocaleDateString(t.locale, { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Rome" });
  const rows = picks.rows.slice(0, 10);
  const avgRet = rows.length ? rows.reduce((s, r) => s + r.ret, 0) / rows.length : 0;
  const risks = rows.map((r) => r.risk).filter((r): r is number => r !== null);
  const avgRisk = risks.length ? risks.reduce((s, r) => s + r, 0) / risks.length : 0;
  const intro = t.intro(WEEKLY_INPUTS.duration, num(picks.scanned, lang, 0));
  const avg = t.avg(num(avgRet, lang, 2), num(avgRisk, lang, 1));
  const finder = `${base}${lang === "en" ? "/" : pathOf(lang)}`;
  const seller = [COMPANY.legalName, COMPANY.address].filter(Boolean).join(", ");
  const year = (m: string | null) => (m ? m.slice(0, 4) : "–");
  const cell = (r: WeeklyRow) => [r.issuer, year(r.maturity), `${num(r.ret, lang, 2)}%`, r.risk === null ? "–" : String(r.risk)];

  const text = [
    t.title,
    "",
    intro,
    "",
    ...rows.map((r, i) => `${i + 1}. ${cell(r)[0]} · ${t.cols[1]} ${cell(r)[1]} · ${t.cols[2]} ${cell(r)[2]} · ${t.cols[3]} ${cell(r)[3]}`),
    "",
    avg,
    "",
    `${t.cta}: ${finder}`,
    t.ctaHint,
    "",
    "--",
    FOOTER_NOTE[lang],
    `${t.sentBy} ${seller}.`,
    t.why,
    ...(unsubscribe ? [`${t.unsubscribe}: ${unsubscribe}`] : []),
  ].join("\n");

  const muted = "font-size:12px;line-height:1.5;color:#86868b";
  const th = "padding:8px 6px;font-size:12px;font-weight:600;color:#6e6e73;text-align:left;border-bottom:1px solid #e8e8ed";
  const td = "padding:9px 6px;font-size:14px;border-bottom:1px solid #f0f0f3";
  const html = `<!doctype html><html lang="${lang}"><body style="margin:0;background:#f5f5f7;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1d1d1f">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:20px;padding:32px">
<tr><td style="font-size:20px;font-weight:700">10BONDS</td></tr>
<tr><td style="padding-top:20px;font-size:22px;font-weight:600">${esc(t.title)}</td></tr>
<tr><td style="padding-top:8px;font-size:15px;line-height:1.5;color:#424245">${esc(intro)}</td></tr>
<tr><td style="padding-top:16px"><table width="100%" cellpadding="0" cellspacing="0" data-testid="weekly-rows">
<tr><th style="${th}">#</th><th style="${th}">${esc(t.cols[0])}</th><th style="${th}">${esc(t.cols[1])}</th><th style="${th};text-align:right">${esc(t.cols[2])}</th><th style="${th};text-align:right">${esc(t.cols[3])}</th></tr>
${rows
  .map((r, i) => {
    const c = cell(r);
    return `<tr><td style="${td};color:#86868b">${i + 1}</td><td style="${td};font-weight:600">${esc(c[0])}</td><td style="${td}">${esc(c[1])}</td><td style="${td};text-align:right">${esc(c[2])}</td><td style="${td};text-align:right">${esc(c[3])}</td></tr>`;
  })
  .join("\n")}
</table></td></tr>
<tr><td style="padding-top:12px;font-size:14px;color:#424245">${esc(avg)}</td></tr>
<tr><td style="padding:24px 0 4px"><a href="${esc(finder)}" style="display:inline-block;background:#0071e3;color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 24px;border-radius:999px">${esc(t.cta)}</a></td></tr>
<tr><td style="padding-top:6px;font-size:13px;color:#6e6e73">${esc(t.ctaHint)}</td></tr>
<tr><td style="padding-top:28px;border-bottom:1px solid #e8e8ed"></td></tr>
<tr><td style="padding-top:16px;${muted}">${esc(FOOTER_NOTE[lang])}<br><br>${esc(t.sentBy)} ${esc(seller)}.<br>${esc(t.why)}${unsubscribe ? ` <a href="${esc(unsubscribe)}" style="color:#86868b">${esc(t.unsubscribe)}</a>.` : ""}</td></tr>
</table></td></tr></table></body></html>`;

  return { subject: t.subject(date), html, text };
}
