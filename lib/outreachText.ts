// Drafts of the first B2B e-mail to a wealth manager, one per firm, in the firm's language. Firm-level contact address only;
// no personal data is used. The wording is neutral information: no promises about returns, no "best", no advice.

export type OutreachLang = "it" | "fr" | "de";
export type Firm = { firm: string; city: string | null; country: "IT" | "FR" | "DE"; email: string; sourceUrl: string };

export const LANG_OF: Record<Firm["country"], OutreachLang> = { IT: "it", FR: "fr", DE: "de" };
const LINK = "https://10bonds.com/pro";
const SENDER = "SQUARE ONE OÜ, Männimäe/1, Pudisoo küla, Kuusalu vald, 74626 Harju maakond, Estonia";

const T = {
  it: {
    subject: (f: string) => `Per ${f}: verifica di un portafoglio obbligazionario con regole fisse`,
    body: (f: string, host: string) => `Buongiorno,

scrivo al recapito generale che ${f} pubblica sul proprio sito (${host}).

10BONDS è uno strumento di screening obbligazionario. Il suo modulo per professionisti, il Bond Replacement Engine, prende il portafoglio obbligazionario di un cliente (ISIN e importi) e, per ogni titolo, cerca alternative con duration simile, rating uguale o superiore, e un rendimento netto più alto dopo i costi di transazione. Le regole sono fisse e mostrate a schermo; il risultato è un'informazione di screening, non una raccomandazione personalizzata, e la valutazione di adeguatezza resta al professionista.

Per i professionisti verificati (nome della società, autorità di vigilanza e numero di iscrizione) c'è una prova gratuita di 14 giorni, senza carta e senza rinnovo automatico. C'è una demo su un portafoglio di esempio: ${LINK}

Se preferisce non ricevere altre email da noi, basta rispondere con "STOP" e non scriveremo più.

Cordiali saluti
10BONDS
${SENDER}`,
  },
  fr: {
    subject: (f: string) => `Pour ${f} : contrôle d'un portefeuille obligataire selon des règles fixes`,
    body: (f: string, host: string) => `Bonjour,

je vous écris à l'adresse de contact générale que ${f} publie sur son site (${host}).

10BONDS est un outil de screening obligataire. Son module pour professionnels, le Bond Replacement Engine, prend le portefeuille obligataire d'un client (ISIN et montants) et cherche, pour chaque ligne, des alternatives de duration proche, de notation identique ou meilleure, avec un rendement net plus élevé après frais de transaction. Les règles sont fixes et affichées à l'écran ; le résultat est une information de screening, pas une recommandation personnalisée, et l'adéquation reste de la responsabilité du professionnel.

Les professionnels vérifiés (nom de la société, autorité de contrôle et numéro d'immatriculation) bénéficient de 14 jours d'essai gratuit, sans carte et sans renouvellement automatique. Une démonstration sur un portefeuille fictif est disponible : ${LINK}

Si vous ne souhaitez plus recevoir d'e-mails de notre part, il suffit de répondre « STOP » et nous ne vous écrirons plus.

Cordialement
10BONDS
${SENDER}`,
  },
  de: {
    subject: (f: string) => `Für ${f}: Prüfung eines Anleihenportfolios nach festen Regeln`,
    body: (f: string, host: string) => `Guten Tag,

ich schreibe an die allgemeine Kontaktadresse, die ${f} auf der eigenen Website (${host}) veröffentlicht.

10BONDS ist ein Screening-Werkzeug für Anleihen. Das Modul für Profis, die Bond Replacement Engine, nimmt das Anleihenportfolio eines Kunden (ISIN und Beträge) und sucht je Position Alternativen mit ähnlicher Duration, gleichem oder besserem Rating und höherer Nettorendite nach Handelskosten. Die Regeln sind fest und werden auf dem Bildschirm angezeigt; das Ergebnis ist eine Screening-Information, keine persönliche Empfehlung, und die Geeignetheitsprüfung bleibt beim Berater.

Verifizierte Fachleute (Firmenname, Aufsichtsbehörde und Registernummer) erhalten 14 Tage kostenlos testen, ohne Karte und ohne automatische Verlängerung. Eine Demo mit einem fiktiven Portfolio finden Sie hier: ${LINK}

Wenn Sie keine weiteren E-Mails von uns wünschen, antworten Sie einfach mit „STOP“; dann schreiben wir nicht mehr.

Freundliche Grüße
10BONDS
${SENDER}`,
  },
} as const;

export function draftFor(f: Firm): { lang: OutreachLang; subject: string; body: string } {
  const lang = LANG_OF[f.country];
  let host = f.sourceUrl;
  try { host = new URL(f.sourceUrl).host.replace(/^www\./, ""); } catch {}
  return { lang, subject: T[lang].subject(f.firm), body: T[lang].body(f.firm, host) };
}

/** Germany: unsolicited e-mail advertising, even to firms, needs prior consent (UWG §7). Sending is blocked there by default. */
export const BLOCKED_COUNTRIES: readonly string[] = ["DE"];

/** First batch: firms whose own website prints a general contact address. Checked 26 Oct 2026. */
export const FIRST_BATCH: Firm[] = [
  { firm: "ATAI Società di Consulenza Finanziaria Srl", city: "Milano", country: "IT", email: "info@ataiscf.com", sourceUrl: "http://ataiscf.com/" },
  { firm: "Family Cube Partners SCF", city: "Milano", country: "IT", email: "fcp@fcube-scf.com", sourceUrl: "https://fcube-scf.com/" },
  { firm: "ADHOC SCF", city: "Milano", country: "IT", email: "info@adhocscf.com", sourceUrl: "https://www.adhocscf.com/" },
  { firm: "Amarille", city: "Paris", country: "FR", email: "contact@amarille.fr", sourceUrl: "https://amarille.fr/contact" },
  { firm: "Avant-Garde Family Office", city: "Paris", country: "FR", email: "contact@avantgarde-investment.com", sourceUrl: "https://www.familyoffice-paris.fr/mentions-legales" },
  { firm: "BREHMER & CIE. Family Office", city: "Frankfurt am Main", country: "DE", email: "info@brehmer-cie.de", sourceUrl: "https://www.brehmer-cie.com/impressum" },
  { firm: "BeFinanz Family Office GmbH", city: "Berlin", country: "DE", email: "info@befinanz.de", sourceUrl: "https://befinanz.de/impressum" },
];
