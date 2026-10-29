// Cookie notice wording. Same four languages as the rest of the site; the language comes from the header menu (tb_lang cookie).
export type CookieLang = "en" | "it" | "fr" | "de";

export type CookieText = {
  notice: string; learn: string; details: string; understand: string; title: string; required: string;
  functional: string; functionalText: string; audience: string; audienceText: string; oppose: string; opposed: string; allowAgain: string;
  visitor: string; visitorText: string; policy: string; label: string;
  short: string; accept: string; reject: string;
};

export const COOKIE_TEXT: Record<CookieLang, CookieText> = {
  en: {
    notice: "We use only functional cookies and anonymous audience measurement (one daily page count, no identifier). These may be used without prior consent, but we inform you. We sell no data and use no advertising cookies.",
    learn: "Learn more and oppose in Details or in the cookie policy.",
    details: "Details", understand: "I understand", title: "Cookie details", required: "Required",
    functional: "Functional cookies", functionalText: "Keep you signed in and remember this choice. The site does not work without them.",
    audience: "Audience measurement (exempt from consent)", audienceText: "One anonymous count per day, page and country. No identifier, nothing stored in your browser.",
    oppose: "Oppose audience measurement", opposed: "You opposed audience measurement: nothing is counted.", allowAgain: "Allow again",
    visitor: "Visitor statistics (needs your OK)", visitorText: "Anonymous visitor number, pages visited, time on each page, clicks and country, to improve the site. Never sold or shared. Signed-in members who allow it get one free week of Premium.",
    policy: "Cookie policy", label: "Cookie notice",
    short: "Functional cookies and an anonymous page count only.", accept: "Accept", reject: "Reject",
  },
  it: {
    notice: "Usiamo solo cookie funzionali e una misurazione anonima del pubblico (un conteggio giornaliero delle pagine, nessun identificativo). Possono essere usati senza consenso preventivo, ma ti informiamo. Non vendiamo dati e non usiamo cookie pubblicitari.",
    learn: "Scopri di più e opponiti nei Dettagli o nella cookie policy.",
    details: "Dettagli", understand: "Ho capito", title: "Dettagli sui cookie", required: "Necessari",
    functional: "Cookie funzionali", functionalText: "Ti mantengono connesso e ricordano questa scelta. Il sito non funziona senza.",
    audience: "Misurazione del pubblico (esente da consenso)", audienceText: "Un conteggio anonimo al giorno, per pagina e paese. Nessun identificativo, nulla salvato nel browser.",
    oppose: "Opponiti alla misurazione del pubblico", opposed: "Ti sei opposto alla misurazione: nulla viene conteggiato.", allowAgain: "Consenti di nuovo",
    visitor: "Statistiche sui visitatori (serve il tuo consenso)", visitorText: "Numero anonimo del visitatore, pagine viste, tempo su ogni pagina, clic e paese, per migliorare il sito. Mai venduti né condivisi. I membri registrati che acconsentono ricevono una settimana Premium gratis.",
    policy: "Cookie policy", label: "Informativa cookie",
    short: "Solo cookie funzionali e un conteggio anonimo delle pagine.", accept: "Accetta", reject: "Rifiuta",
  },
  fr: {
    notice: "Nous utilisons uniquement des cookies fonctionnels et une mesure d'audience anonyme (un comptage quotidien des pages, sans identifiant). Ils peuvent être utilisés sans consentement préalable, mais nous vous informons. Nous ne vendons aucune donnée et n'utilisons aucun cookie publicitaire.",
    learn: "En savoir plus et vous y opposer dans Détails ou dans la politique de cookies.",
    details: "Détails", understand: "J'ai compris", title: "Détails des cookies", required: "Requis",
    functional: "Cookies fonctionnels", functionalText: "Vous gardent connecté et mémorisent ce choix. Le site ne fonctionne pas sans eux.",
    audience: "Mesure d'audience (exemptée de consentement)", audienceText: "Un comptage anonyme par jour, page et pays. Aucun identifiant, rien n'est stocké dans votre navigateur.",
    oppose: "M'opposer à la mesure d'audience", opposed: "Vous vous êtes opposé à la mesure d'audience : rien n'est compté.", allowAgain: "Autoriser à nouveau",
    visitor: "Statistiques visiteur (votre accord est requis)", visitorText: "Numéro de visiteur anonyme, pages vues, temps passé sur chaque page, clics et pays, pour améliorer le site. Jamais vendus ni partagés. Les membres connectés qui acceptent reçoivent une semaine Premium offerte.",
    policy: "Politique de cookies", label: "Avis sur les cookies",
    short: "Cookies fonctionnels et comptage anonyme des pages uniquement.", accept: "Accepter", reject: "Refuser",
  },
  de: {
    notice: "Wir verwenden nur funktionale Cookies und eine anonyme Reichweitenmessung (eine tägliche Seitenzählung, keine Kennung). Diese dürfen ohne vorherige Einwilligung genutzt werden, wir informieren Sie aber. Wir verkaufen keine Daten und nutzen keine Werbe-Cookies.",
    learn: "Mehr erfahren und widersprechen unter Details oder in der Cookie-Richtlinie.",
    details: "Details", understand: "Verstanden", title: "Cookie-Details", required: "Erforderlich",
    functional: "Funktionale Cookies", functionalText: "Halten Sie angemeldet und merken sich diese Auswahl. Ohne sie funktioniert die Website nicht.",
    audience: "Reichweitenmessung (einwilligungsfrei)", audienceText: "Eine anonyme Zählung pro Tag, Seite und Land. Keine Kennung, nichts im Browser gespeichert.",
    oppose: "Der Reichweitenmessung widersprechen", opposed: "Sie haben der Reichweitenmessung widersprochen: nichts wird gezählt.", allowAgain: "Wieder erlauben",
    visitor: "Besucherstatistik (Ihre Zustimmung nötig)", visitorText: "Anonyme Besuchernummer, besuchte Seiten, Zeit pro Seite, Klicks und Land, um die Seite zu verbessern. Nie verkauft oder weitergegeben. Angemeldete Mitglieder, die zustimmen, erhalten eine Woche Premium gratis.",
    policy: "Cookie-Richtlinie", label: "Cookie-Hinweis",
    short: "Nur funktionale Cookies und eine anonyme Seitenzählung.", accept: "Akzeptieren", reject: "Ablehnen",
  },
};

export function cookieLang(): CookieLang {
  let l = "";
  try { l = document.cookie.match(/(?:^|; )tb_lang=(\w+)/)?.[1] ?? navigator.language ?? ""; } catch {}
  const s = l.slice(0, 2).toLowerCase();
  return s === "it" || s === "fr" || s === "de" ? s : "en";
}
