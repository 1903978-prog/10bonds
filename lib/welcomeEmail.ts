import { loadFreeLimits } from "./searchLimits";
import { COMPANY } from "./legal";
import { esc, sendEmail, siteUrl } from "./email";
import { CALCULATORS } from "./seo/calculators";
import { isLocale, LANG_COOKIE, LOCALE, localeFromAcceptLanguage, pathOf, type Locale } from "./seo/locales";

export type WelcomeLang = "en" | Locale;
export const WELCOME_LANGS: WelcomeLang[] = ["en", "it", "fr", "de"];
export const welcomeLang = (raw: unknown): WelcomeLang => (isLocale(raw) ? raw : "en");

/** The site language of this request: the last language site the browser opened (cookie), else the one it asks for, else English. */
export function requestLang(req: Request): WelcomeLang {
  const cookie = req.headers.get("cookie")?.match(new RegExp(`(?:^|;\\s*)${LANG_COOKIE}=([a-z]{2})`))?.[1];
  return cookie ? welcomeLang(cookie) : welcomeLang(localeFromAcceptLanguage(req.headers.get("accept-language")));
}

/** Where each link in the e-mail goes, in the reader's language (paths only; the site address is added on send). */
export function welcomePaths(lang: WelcomeLang) {
  if (lang === "en") return { finder: "/", knowledge: "/knowledge", calculator: "/knowledge/bond-yield-calculator", pricing: "/pricing", account: "/account" };
  return {
    finder: pathOf(lang),
    knowledge: pathOf(lang, "knowledge"),
    calculator: pathOf(lang, "tools", CALCULATORS[lang].slug),
    pricing: "/pricing",
    account: "/account",
  };
}

type Text = {
  subject: string;
  hi: string;
  confirmed: string;
  trial: (days: number) => string;
  noTrial: string;
  whatTitle: string;
  links: { finder: [string, string]; knowledge: [string, string]; calculator: [string, string] };
  plansTitle: string;
  plans: [string, string][];
  pricing: string;
  question: string;
  bye: string;
  disclaimer: string;
  sentBy: string;
  manage: string;
  manageLink: string;
};

const TEXT: Record<WelcomeLang, Text> = {
  en: {
    subject: "Welcome to 10BONDS",
    hi: "Hi",
    confirmed: "Your e-mail is confirmed and your 10BONDS account is ready.",
    trial: (n) => `Thanks to your code, you have ${n} days of full access, free. Use them to try everything: the full top 10 with ISINs, the portfolio view and unlimited searches across thousands of bonds.`,
    noTrial: "Your free account already shows the full top 10 across thousands of bonds. When you want ISINs and unlimited searches, a paid plan unlocks them.",
    whatTitle: "Three places to start",
    links: {
      finder: ["Bond finder", "Pick a duration, a target yield and the lowest rating you accept: you get the 10 best-matching bonds, one per issuer."],
      knowledge: ["Knowledge guides", "Plain-language guides on yield, duration, ratings and how to buy bonds."],
      calculator: ["Yield calculator", "Gross yield of any bond, before you buy."],
    },
    plansTitle: "The plans",
    plans: [
      ["Free", "{s} one-bond and {p} portfolio searches a week, without ISINs."],
      ["Plus · €9/month", "ISINs and unlimited searches."],
      ["Premium · €19/month", "Everything in Plus, plus e-mail alerts and more features."],
      ["Pro · €89/month", "For professionals only: portfolio analysis and similar bonds to compare."],
    ],
    pricing: "Compare the plans",
    question: "Questions or ideas? Just reply to this e-mail: we read every message.",
    bye: "The 10BONDS team",
    disclaimer: "10BONDS is an information service. It does not give investment advice or personal recommendations, and past performance is not a reliable indicator of future results. Do not use our data as the only basis for an investment decision.",
    sentBy: "Sent by",
    manage: "This is a one-time e-mail about your new account: we do not add you to any newsletter. To change your plan, your settings or to delete your account, open",
    manageLink: "your account page",
  },
  it: {
    subject: "Benvenuto su 10BONDS",
    hi: "Ciao",
    confirmed: "La tua e-mail è confermata e il tuo account 10BONDS è pronto.",
    trial: (n) => `Grazie al tuo codice hai ${n} giorni di accesso completo gratis. Usali per provare tutto: la top 10 completa con gli ISIN, la vista Portafoglio e ricerche illimitate tra migliaia di obbligazioni.`,
    noTrial: "Il tuo account gratuito mostra già la top 10 completa tra migliaia di obbligazioni. Quando vuoi gli ISIN e ricerche illimitate, un piano a pagamento li sblocca.",
    whatTitle: "Tre punti da cui partire",
    links: {
      finder: ["Cerca obbligazioni", "Scegli una durata, un rendimento obiettivo e il rating minimo che accetti: ottieni le 10 obbligazioni più adatte, una per emittente."],
      knowledge: ["Guide Sapere", "Guide semplici su rendimento, duration, rating e su come comprare obbligazioni."],
      calculator: ["Calcolatore di rendimento", "Rendimento lordo e netto di qualsiasi obbligazione, prima di comprarla."],
    },
    plansTitle: "I piani",
    plans: [
      ["Free", "{s} ricerche di singole obbligazioni e {p} di portafoglio a settimana, senza ISIN."],
      ["Plus · 9 €/mese", "ISIN e ricerche illimitate."],
      ["Premium · 19 €/mese", "Tutto di Plus, più avvisi via e-mail e altre funzioni."],
      ["Pro · 89 €/mese", "Solo per professionisti: analisi del portafoglio e obbligazioni simili da confrontare."],
    ],
    pricing: "Confronta i piani",
    question: "Domande o idee? Rispondi a questa e-mail: leggiamo ogni messaggio.",
    bye: "Il team di 10BONDS",
    disclaimer: "10BONDS è un servizio di informazione. Non fornisce consulenza in materia di investimenti né raccomandazioni personalizzate, e i rendimenti passati non sono indicativi di quelli futuri. Non usare i nostri dati come unica base per una decisione di investimento.",
    sentBy: "Inviata da",
    manage: "Questa è un'e-mail una tantum sul tuo nuovo account: non ti iscriviamo a nessuna newsletter. Per cambiare piano o impostazioni, o per eliminare l'account, apri",
    manageLink: "la pagina del tuo account",
  },
  fr: {
    subject: "Bienvenue sur 10BONDS",
    hi: "Bonjour",
    confirmed: "Votre e-mail est confirmé et votre compte 10BONDS est prêt.",
    trial: (n) => `Grâce à votre code, vous avez ${n} jours d'accès complet offerts. Profitez-en pour tout essayer : le top 10 complet avec les ISIN, la vue Portefeuille et des recherches illimitées parmi des milliers d'obligations.`,
    noTrial: "Votre compte gratuit affiche déjà le top 10 complet parmi des milliers d'obligations. Pour les ISIN et des recherches illimitées, une offre payante les débloque.",
    whatTitle: "Trois points de départ",
    links: {
      finder: ["Recherche d'obligations", "Choisissez une durée, un rendement cible et la note minimale acceptée : vous obtenez les 10 obligations les plus adaptées, une par émetteur."],
      knowledge: ["Guides Savoir", "Des guides simples sur le rendement, la duration, les notations et l'achat d'obligations."],
      calculator: ["Calculateur de rendement", "Rendement brut et net de n'importe quelle obligation, avant d'acheter."],
    },
    plansTitle: "Les offres",
    plans: [
      ["Free", "{s} recherches d'une obligation et {p} de portefeuille par semaine, sans ISIN."],
      ["Plus · 9 €/mois", "ISIN et recherches illimitées."],
      ["Premium · 19 €/mois", "Tout Plus, avec les alertes par e-mail et d'autres fonctions."],
      ["Pro · 89 €/mois", "Réservé aux professionnels : analyse de portefeuille et obligations similaires à comparer."],
    ],
    pricing: "Comparer les offres",
    question: "Des questions ou des idées ? Répondez simplement à cet e-mail : nous lisons chaque message.",
    bye: "L'équipe 10BONDS",
    disclaimer: "10BONDS est un service d'information. Il ne fournit ni conseil en investissement ni recommandation personnalisée, et les performances passées ne préjugent pas des performances futures. N'utilisez pas nos données comme seule base d'une décision d'investissement.",
    sentBy: "Envoyé par",
    manage: "Cet e-mail est envoyé une seule fois au sujet de votre nouveau compte : nous ne vous inscrivons à aucune newsletter. Pour changer d'offre ou de réglages, ou supprimer votre compte, ouvrez",
    manageLink: "la page de votre compte",
  },
  de: {
    subject: "Willkommen bei 10BONDS",
    hi: "Hallo",
    confirmed: "Ihre E-Mail-Adresse ist bestätigt und Ihr 10BONDS-Konto ist bereit.",
    trial: (n) => `Dank Ihres Codes haben Sie ${n} Tage vollen Zugang kostenlos. Probieren Sie alles aus: die vollständigen Top 10 mit ISIN, die Portfolio-Ansicht und unbegrenzte Suchen unter Tausenden von Anleihen.`,
    noTrial: "Ihr kostenloses Konto zeigt bereits die vollständigen Top 10 unter Tausenden von Anleihen. Für ISIN und unbegrenzte Suchen schaltet ein bezahlter Plan sie frei.",
    whatTitle: "Drei Einstiegspunkte",
    links: {
      finder: ["Anleihen-Finder", "Wählen Sie Laufzeit, Zielrendite und das niedrigste akzeptierte Rating: Sie erhalten die 10 passendsten Anleihen, eine pro Emittent."],
      knowledge: ["Wissen-Ratgeber", "Verständliche Ratgeber zu Rendite, Duration, Ratings und zum Kauf von Anleihen."],
      calculator: ["Renditerechner", "Brutto- und Nettorendite jeder Anleihe, bevor Sie kaufen."],
    },
    plansTitle: "Die Pläne",
    plans: [
      ["Free", "{s} Einzelanleihen- und {p} Portfolio-Suchen pro Woche, ohne ISIN."],
      ["Plus · 9 €/Monat", "ISIN und unbegrenzte Suchen."],
      ["Premium · 19 €/Monat", "Alles aus Plus, dazu E-Mail-Alerts und weitere Funktionen."],
      ["Pro · 89 €/Monat", "Nur für Profis: Portfolio-Analyse und ähnliche Anleihen zum Vergleich."],
    ],
    pricing: "Pläne vergleichen",
    question: "Fragen oder Ideen? Antworten Sie einfach auf diese E-Mail: Wir lesen jede Nachricht.",
    bye: "Ihr 10BONDS-Team",
    disclaimer: "10BONDS ist ein Informationsdienst. Er bietet keine Anlageberatung und keine persönlichen Empfehlungen, und vergangene Wertentwicklungen sind kein verlässlicher Indikator für künftige Ergebnisse. Nutzen Sie unsere Daten nicht als alleinige Grundlage für eine Anlageentscheidung.",
    sentBy: "Gesendet von",
    manage: "Dies ist eine einmalige E-Mail zu Ihrem neuen Konto: Wir tragen Sie in keinen Newsletter ein. Um Ihren Plan oder Ihre Einstellungen zu ändern oder Ihr Konto zu löschen, öffnen Sie",
    manageLink: "Ihre Kontoseite",
  },
};

/** Days of free full access left from a promo code (null = none), rounded up. */
export function accessDaysLeft(premiumUntil: string | null | undefined, now = Date.now()): number | null {
  const ms = premiumUntil ? Date.parse(premiumUntil) - now : 0;
  return ms > 0 ? Math.ceil(ms / 86400_000) : null;
}

/** trialDays: days of free full access from a promo code; null for everyone else (no trial is promised). */
export function welcomeEmail(lang: WelcomeLang, username: string, trialDays: number | null, base = siteUrl(), free: { single: number; portfolio: number } = { single: 10, portfolio: 10 }) {
  const t = { ...TEXT[lang], plans: TEXT[lang].plans.map(([n, w]) => [n, w.replace("{s}", String(free.single)).replace("{p}", String(free.portfolio))] as [string, string]) };
  const intro = trialDays ? t.trial(trialDays) : t.noTrial;
  const p = welcomePaths(lang);
  const u = (path: string) => `${base}${path}`;
  const linkKeys = ["finder", "knowledge", "calculator"] as const;
  const seller = `${COMPANY.legalName}, ${COMPANY.address}`;

  const text = [
    `${t.hi} ${username},`,
    "",
    t.confirmed,
    "",
    intro,
    "",
    `${t.whatTitle}:`,
    ...linkKeys.map((k) => `- ${t.links[k][0]}: ${t.links[k][1]} ${u(p[k])}`),
    "",
    `${t.plansTitle}:`,
    ...t.plans.map(([name, what]) => `- ${name}: ${what}`),
    `${t.pricing}: ${u(p.pricing)}`,
    "",
    t.question,
    "",
    t.bye,
    "",
    "--",
    t.disclaimer,
    `${t.sentBy} ${seller}.`,
    `${t.manage}: ${u(p.account)}`,
  ].join("\n");

  const muted = "font-size:12px;line-height:1.5;color:#86868b";
  const html = `<!doctype html><html lang="${lang}"><body style="margin:0;background:#f5f5f7;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1d1d1f">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:20px;padding:32px">
<tr><td style="font-size:20px;font-weight:700">10BONDS</td></tr>
<tr><td style="padding-top:20px;font-size:16px;line-height:1.5">${esc(t.hi)} ${esc(username)},<br><br>${esc(t.confirmed)}</td></tr>
<tr><td style="padding-top:16px"><div style="background:#f0f6ff;border-radius:14px;padding:16px 18px;font-size:15px;line-height:1.5">${esc(intro)}</div></td></tr>
<tr><td style="padding-top:28px;font-size:17px;font-weight:600">${esc(t.whatTitle)}</td></tr>
${linkKeys
  .map(
    (k) => `<tr><td style="padding-top:12px;font-size:15px;line-height:1.5"><a href="${esc(u(p[k]))}" style="color:#0071e3;text-decoration:none;font-weight:600">${esc(t.links[k][0])} →</a><br><span style="color:#6e6e73">${esc(t.links[k][1])}</span></td></tr>`,
  )
  .join("\n")}
<tr><td style="padding-top:28px;font-size:17px;font-weight:600">${esc(t.plansTitle)}</td></tr>
<tr><td style="padding-top:8px"><table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;line-height:1.45">
${t.plans.map(([name, what]) => `<tr><td style="padding:8px 0;border-top:1px solid #e8e8ed;font-weight:600;white-space:nowrap;vertical-align:top;padding-right:14px">${esc(name)}</td><td style="padding:8px 0;border-top:1px solid #e8e8ed;color:#424245">${esc(what)}</td></tr>`).join("\n")}
</table></td></tr>
<tr><td style="padding:24px 0 4px"><a href="${esc(u(p.pricing))}" style="display:inline-block;background:#0071e3;color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 24px;border-radius:999px">${esc(t.pricing)}</a></td></tr>
<tr><td style="padding-top:20px;font-size:15px;line-height:1.5">${esc(t.question)}<br><br>${esc(t.bye)}</td></tr>
<tr><td style="padding-top:28px;border-bottom:1px solid #e8e8ed"></td></tr>
<tr><td style="padding-top:16px;${muted}">${esc(t.disclaimer)}<br><br>${esc(t.sentBy)} ${esc(seller)}.<br><br>${esc(t.manage)} <a href="${esc(u(p.account))}" style="color:#86868b">${esc(t.manageLink)}</a>.</td></tr>
</table></td></tr></table></body></html>`;

  return { subject: t.subject, html, text };
}

export const LANG_NAMES: Record<WelcomeLang, string> = { en: "English", it: LOCALE.it.name, fr: LOCALE.fr.name, de: LOCALE.de.name };

/** Sent once, right after the address is confirmed. Replies go to EMAIL_REPLY_TO when it is set. */
export async function sendWelcome(email: string, username: string, lang: WelcomeLang, trialDays: number | null) {
  const m = welcomeEmail(lang, username, trialDays, undefined, await loadFreeLimits());
  return sendEmail(email, m.subject, m.html, m.text, process.env.EMAIL_REPLY_TO || undefined);
}
