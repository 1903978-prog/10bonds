import type { Metadata } from "next";
import type { PublicBond } from "../types";
import { bondNotch, bondRisk } from "../ratings";
import { lossAdjustedYield } from "../expectedLoss";
import { lgdOf } from "../seniority";
import { LOCALE, LOCALES, pathOf, type Locale } from "./locales";
import { isSovereignBond } from "../sovereign";

// One public page per bond the site shows, at /bonds/{ISIN} (English) and /it/obbligazioni/{ISIN},
// /fr/obligations/{ISIN}, /de/anleihen/{ISIN}, so a Google search for an ISIN can find 10BONDS (the owner, 20 Oct 2026).
// The ISIN is shown on the bond's own page for everyone; the yield and the ranking stay with Plus and above.

export type BondLang = "en" | Locale;
export const BOND_LANGS: BondLang[] = ["en", ...LOCALES];

/** Two letters, nine letters or digits, one check digit. */
export const ISIN_RE = /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/;
export const isIsin = (s: string) => ISIN_RE.test(s);

export const bondPagePath = (l: BondLang, isin: string) => (l === "en" ? `/bonds/${isin}` : pathOf(l, "bonds", isin));

const HREFLANG: Record<BondLang, string> = { en: "en", it: LOCALE.it.hreflang, fr: LOCALE.fr.hreflang, de: LOCALE.de.hreflang };

/** hreflang links for one bond in every language; English is the default. */
export function bondAlternates(self: BondLang, isin: string): Metadata["alternates"] {
  const languages: Record<string, string> = Object.fromEntries(BOND_LANGS.map((l) => [HREFLANG[l], bondPagePath(l, isin)]));
  languages["x-default"] = bondPagePath("en", isin);
  return { canonical: bondPagePath(self, isin), languages };
}

/** Same alternates as absolute addresses, for the sitemap. */
export const bondSitemapLanguages = (site: string, isin: string) =>
  Object.fromEntries([...BOND_LANGS.map((l) => [HREFLANG[l], site + bondPagePath(l, isin)]), ["x-default", site + bondPagePath("en", isin)]]);

const INTL: Record<BondLang, string> = { en: "en-GB", it: "it-IT", fr: "fr-FR", de: "de-DE" };

export const fmtPct = (l: BondLang, n: number, d = 2) => n.toLocaleString(INTL[l], { minimumFractionDigits: d, maximumFractionDigits: d });

/** "3.802" style coupon: as many decimals as the data has (up to 3), never fewer than needed. */
export function fmtCoupon(l: BondLang, c: number): string {
  return c.toLocaleString(INTL[l], { minimumFractionDigits: 0, maximumFractionDigits: 3 });
}

export function fmtMonthYear(l: BondLang, iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  const s = d.toLocaleDateString(INTL[l], { month: "short", year: "numeric", timeZone: "UTC" }).replace(".", "");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function fmtDay(l: BondLang, iso: string): string {
  return new Date(iso.length === 10 ? iso + "T00:00:00Z" : iso).toLocaleDateString(INTL[l], { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

export function countryName(l: BondLang, code: string | null): string | null {
  if (!code) return null;
  if (code === "EU") return BOND_TEXT[l].eu;
  try {
    return new Intl.DisplayNames([INTL[l]], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

/** The issuer as shown: the cleaned issuer, else the bond's own name. */
export const issuerOf = (b: PublicBond) => b.issuer?.trim() || b.name;

/** "Landesbank Baden-Württemberg 3.802% Feb 2031 EUR" (without the word "bond"). */
export function bondLabel(l: BondLang, b: PublicBond, max?: number): string {
  const full = bondLabelOf(l, b, issuerOf(b));
  if (!max || full.length <= max) return full;
  // Too long for a title or description: shorten only the issuer's name, never the coupon, month or currency.
  const rest = full.length - issuerOf(b).length;
  return bondLabelOf(l, b, shorten(issuerOf(b), Math.max(12, max - rest)));
}

function bondLabelOf(l: BondLang, b: PublicBond, issuer: string): string {
  const parts = [issuer];
  if (b.coupon !== null) parts.push(`${fmtCoupon(l, b.coupon)}%`);
  if (b.maturity) parts.push(fmtMonthYear(l, b.maturity));
  parts.push(b.currency);
  return parts.join(" ");
}

/** Page title, e.g. "Landesbank Baden-Württemberg 3.802% Feb 2031 EUR Bond | DE000LB39CB2". */
/** Keeps a long issuer name from pushing a title or description past what search engines show: cut with an ellipsis. */
const shorten = (s: string, max: number) => (s.length <= max ? s : `${s.slice(0, max - 1).trimEnd()}…`);
export const bondTitle = (l: BondLang, b: PublicBond) => {
  const tail = ` ${BOND_TEXT[l].bond} | ${b.isin}`;
  return `${bondLabel(l, b, 70 - tail.length)}${tail}`;
};

export function bondDescription(l: BondLang, b: PublicBond): string {
  const t = BOND_TEXT[l];
  const risk = bondRisk(b);
  return t.metaDescription
    .replace("{label}", bondLabel(l, b, 56))
    .replace("{isin}", b.isin)
    .replace("{risk}", risk === null ? "–" : String(risk));
}

/** Where a bond stands among bonds like it: same currency, duration within ±20%, ranked by yield after expected losses. */
export function peerRank(b: PublicBond, all: PublicBond[]): { rank: number; of: number; adj: number } | null {
  const score = (x: PublicBond) => {
    const n = bondNotch(x);
    return n === null || x.grossYtm === null || x.modifiedDuration === null ? null : lossAdjustedYield(x.grossYtm, n, x.modifiedDuration, lgdOf(x), isSovereignBond(x));
  };
  const own = score(b);
  if (own === null || b.modifiedDuration === null) return null;
  const d = b.modifiedDuration;
  const peers = all.filter((x) => x.currency === b.currency && x.modifiedDuration !== null && Math.abs(x.modifiedDuration - d) <= d * 0.2);
  const scores = peers.map(score).filter((s): s is number => s !== null);
  return { rank: scores.filter((s) => s > own).length + 1, of: Math.max(scores.length, 1), adj: own };
}

/** Other bonds of the same issuer, then bonds like it (same currency, close duration, same risk score), for internal links. */
export function relatedBonds(b: PublicBond, all: PublicBond[], max = 6): { sameIssuer: PublicBond[]; similar: PublicBond[] } {
  const issuer = issuerOf(b).toLowerCase();
  const sameIssuer = all.filter((x) => x.isin !== b.isin && issuerOf(x).toLowerCase() === issuer)
    .sort((x, y) => (x.maturity ?? "").localeCompare(y.maturity ?? ""))
    .slice(0, max);
  const risk = bondRisk(b);
  const d = b.modifiedDuration ?? 0;
  const taken = new Set([b.isin, ...sameIssuer.map((x) => x.isin)]);
  const seen = new Set([issuer]);
  const similar: PublicBond[] = [];
  for (const x of all
    .filter((x) => !taken.has(x.isin) && x.currency === b.currency && bondRisk(x) === risk && x.modifiedDuration !== null)
    .sort((x, y) => Math.abs(x.modifiedDuration! - d) - Math.abs(y.modifiedDuration! - d))) {
    const k = issuerOf(x).toLowerCase();
    if (seen.has(k)) continue; // one bond per issuer
    seen.add(k);
    similar.push(x);
    if (similar.length >= max) break;
  }
  return { sameIssuer, similar };
}

type BondText = {
  bond: string; allBonds: string; home: string; metaDescription: string; intro: string;
  issuer: string; isin: string; country: string; currency: string; coupon: string; maturity: string; minimum: string;
  risk: string; duration: string; ytm: string; adj: string; rank: string; rankOf: string; locked: string; lockedText: string;
  upgrade: string; signup: string; moreIssuer: string; similar: string; dataAsOf: string; findTen: string; eu: string; note: string;
  riskLink: string; readMe: string;
};

export const BOND_TEXT: Record<BondLang, BondText> = {
  en: {
    bond: "Bond", allBonds: "Bonds", home: "Home",
    metaDescription: "{label} bond, ISIN {isin}: issuer, coupon, maturity, minimum investment and 10BONDS risk score {risk}/10. Compare it with similar bonds.",
    intro: "The bond with ISIN {isin} was issued by {issuer}. Below are its main facts and where it stands among similar bonds.",
    issuer: "Issuer", isin: "ISIN", country: "Country", currency: "Currency", coupon: "Coupon", maturity: "Maturity", minimum: "Minimum investment",
    risk: "10BONDS risk (1-10)", duration: "Duration (years)", ytm: "Return (per year)", adj: "Return after expected losses", rank: "Rank among similar bonds", rankOf: "of",
    locked: "Return and ranking", lockedText: "See this bond's return, its return after expected losses and its rank among similar bonds with Plus.",
    upgrade: "See plans", signup: "Free account", moreIssuer: "More {issuer} bonds", similar: "Similar bonds", dataAsOf: "Data as of",
    findTen: "Find your 10 bonds", eu: "European Union",
    note: "Information only, not advice or an offer. Gross, indicative figures that can change. The 1-10 risk is a 10BONDS score, not a credit rating.",
    riskLink: "How the risk score works",
    readMe: "{issuer} pays a {coupon} coupon and matures on {maturity}. The risk score, from 1 (lowest) to 10, is the 10BONDS own assessment of the issuer and is not a credit rating. Figures are indicative, gross of taxes and costs, and past or expected returns are not guaranteed.",
  },
  it: {
    bond: "Obbligazione", allBonds: "Obbligazioni", home: "Home",
    metaDescription: "Obbligazione {label}, ISIN {isin}: emittente, cedola, scadenza, taglio minimo e rischio 10BONDS {risk}/10. Confrontala con obbligazioni simili.",
    intro: "L'obbligazione con codice ISIN {isin} è emessa da {issuer}. Qui trovi i dati principali e la sua posizione tra le obbligazioni simili.",
    issuer: "Emittente", isin: "ISIN", country: "Paese", currency: "Valuta", coupon: "Cedola", maturity: "Scadenza", minimum: "Taglio minimo",
    risk: "Rischio 10BONDS (1-10)", duration: "Duration (anni)", ytm: "Rendimento (annuo)", adj: "Rendimento al netto delle perdite attese", rank: "Posizione tra obbligazioni simili", rankOf: "su",
    locked: "Rendimento e posizione", lockedText: "Con Plus vedi il rendimento di questa obbligazione, il rendimento al netto delle perdite attese e la sua posizione tra quelle simili.",
    upgrade: "Vedi i piani", signup: "Account gratuito", moreIssuer: "Altre obbligazioni {issuer}", similar: "Obbligazioni simili", dataAsOf: "Dati al",
    findTen: "Trova le tue 10 obbligazioni", eu: "Unione europea",
    note: "Solo informazione, non consulenza né offerta. Dati lordi e indicativi, possono cambiare. Il rischio 1-10 è una valutazione 10BONDS, non un rating.",
    riskLink: "Come funziona il rischio",
    readMe: "{issuer} paga una cedola {coupon} e scade il {maturity}. Il punteggio di rischio, da 1 (più basso) a 10, è la valutazione interna di 10BONDS sull'emittente e non è un rating. I dati sono indicativi, al lordo di imposte e costi, e i rendimenti passati o attesi non sono garantiti.",
  },
  fr: {
    bond: "Obligation", allBonds: "Obligations", home: "Accueil",
    metaDescription: "Obligation {label}, ISIN {isin} : émetteur, coupon, échéance, montant minimum et risque 10BONDS {risk}/10. Comparez-la à des obligations similaires.",
    intro: "L'obligation de code ISIN {isin} est émise par {issuer}. Voici ses données principales et sa place parmi les obligations similaires.",
    issuer: "Émetteur", isin: "ISIN", country: "Pays", currency: "Devise", coupon: "Coupon", maturity: "Échéance", minimum: "Montant minimum",
    risk: "Risque 10BONDS (1-10)", duration: "Duration (années)", ytm: "Rendement (par an)", adj: "Rendement après pertes attendues", rank: "Rang parmi les obligations similaires", rankOf: "sur",
    locked: "Rendement et rang", lockedText: "Avec Plus, voyez le rendement de cette obligation, son rendement après pertes attendues et son rang parmi les obligations similaires.",
    upgrade: "Voir les offres", signup: "Compte gratuit", moreIssuer: "Autres obligations {issuer}", similar: "Obligations similaires", dataAsOf: "Données au",
    findTen: "Trouvez vos 10 obligations", eu: "Union européenne",
    note: "Information uniquement, ni conseil ni offre. Chiffres bruts et indicatifs, susceptibles de changer. Le risque 1-10 est une note 10BONDS, pas une notation de crédit.",
    riskLink: "Comment fonctionne le risque",
    readMe: "{issuer} verse un coupon de {coupon} et arrive à échéance le {maturity}. Le score de risque, de 1 (le plus bas) à 10, est l'évaluation interne de 10BONDS sur l'émetteur et n'est pas une notation. Les chiffres sont indicatifs, bruts d'impôts et de frais, et les rendements passés ou attendus ne sont pas garantis.",
  },
  de: {
    bond: "Anleihe", allBonds: "Anleihen", home: "Start",
    metaDescription: "Anleihe {label}, ISIN {isin}: Emittent, Kupon, Fälligkeit, Mindestanlage und 10BONDS-Risiko {risk}/10. Mit ähnlichen Anleihen vergleichen.",
    intro: "Die Anleihe mit der ISIN {isin} wurde von {issuer} begeben. Hier finden Sie die wichtigsten Daten und ihren Platz unter ähnlichen Anleihen.",
    issuer: "Emittent", isin: "ISIN", country: "Land", currency: "Währung", coupon: "Kupon", maturity: "Fälligkeit", minimum: "Mindestanlage",
    risk: "10BONDS-Risiko (1-10)", duration: "Duration (Jahre)", ytm: "Rendite (pro Jahr)", adj: "Rendite nach erwarteten Verlusten", rank: "Rang unter ähnlichen Anleihen", rankOf: "von",
    locked: "Rendite und Rang", lockedText: "Mit Plus sehen Sie die Rendite dieser Anleihe, die Rendite nach erwarteten Verlusten und ihren Rang unter ähnlichen Anleihen.",
    upgrade: "Pläne ansehen", signup: "Kostenloses Konto", moreIssuer: "Weitere Anleihen von {issuer}", similar: "Ähnliche Anleihen", dataAsOf: "Daten vom",
    findTen: "Finden Sie Ihre 10 Anleihen", eu: "Europäische Union",
    note: "Nur zur Information, keine Beratung und kein Angebot. Bruttowerte, unverbindlich und veränderlich. Das Risiko 1-10 ist eine 10BONDS-Bewertung, kein Rating.",
    riskLink: "So funktioniert das Risiko",
    readMe: "{issuer} zahlt einen Kupon von {coupon} und läuft am {maturity} aus. Der Risikowert von 1 (niedrigster) bis 10 ist die interne Einschätzung von 10BONDS zum Emittenten und kein Rating. Die Zahlen sind unverbindlich, brutto vor Steuern und Kosten, und vergangene oder erwartete Renditen sind nicht garantiert.",
  },
};

export const BOND_SITEMAP = "/bonds/sitemap.xml";

/** Every bond page address in every language, with its language versions. */
export function bondPageUrls(site: string, isins: string[]): { url: string; alternates: { languages: Record<string, string> } }[] {
  return [...new Set(isins)].filter(isIsin).flatMap((isin) => {
    const languages = bondSitemapLanguages(site, isin);
    return BOND_LANGS.map((l) => ({ url: site + bondPagePath(l, isin), alternates: { languages } }));
  });
}
