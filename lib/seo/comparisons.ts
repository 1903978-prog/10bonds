import type { PublicBond } from "../types";
import { bondRisk } from "../ratings";
import { issuerKey } from "../ranking";
import { countryCode, issuerClass, sovereignOf } from "./classify";
import type { Locale } from "./locales";

// Public comparison pages built from the one shared bond copy, in three languages. The same page (same id) exists
// in each language under its own slug, so the pages point to each other with hreflang.
// A page only exists when enough bonds match, so there are no thin or empty pages.
// Public pages never show more than a free account: issuer, yield, duration, risk score and the maturity YEAR.
// No ISIN, bond name, coupon or exact maturity date (those are Plus).

export const MIN_ISSUERS = 5; // "issuers" pages: distinct issuers needed
export const MIN_BONDS = 5; // "curve" pages: bonds of one government needed
export const PUBLIC_ROWS = 5;
export const CURVE_ROWS = 10;
export const BAND_DURATIONS = [2, 5, 10];

/** Guide topics (shared by the language versions of a guide). */
export type Topic = "ytm" | "duration" | "ig" | "credit" | "hy" | "gov" | "compare";

type Text = { slug: string; h1: string; title: string; description: string; intro: [string, string] };
export type ComparisonDef = {
  id: string;
  kind: "issuers" | "curve" | "bands";
  match: (b: PublicBond) => boolean;
  topics: Topic[];
  related: string[]; // ids
  home?: Locale[]; // featured on these home pages
  text: Record<Locale, Text>;
};

// Investment grade = risk 1 to 6, high yield = risk 7 and above (10BONDS risk score).
const IG_LAST_RISK = 6;
const risk = (b: PublicBond) => bondRisk(b);
const ig = (b: PublicBond) => risk(b) !== null && risk(b)! <= IG_LAST_RISK;
const hy = (b: PublicBond) => risk(b) !== null && risk(b)! > IG_LAST_RISK;
const year = (b: PublicBond) => (b.maturity ? Number(b.maturity.slice(0, 4)) : null);

export const MATURITY_YEARS = [2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034, 2035, 2036];
export const DURATIONS = [2, 3, 5, 7, 10];
export const YIELDS = [3, 4, 5];

const GOV: Record<"IT" | "FR" | "DE", Record<Locale, Text>> = {
  IT: {
    it: { slug: "btp", h1: "BTP: rendimenti dei titoli di Stato italiani", title: "BTP oggi: rendimenti per scadenza", description: "Rendimento a scadenza e duration dei BTP e degli altri titoli di Stato italiani in euro, per anno di scadenza, aggiornati ogni giorno.", intro: ["I BTP (Buoni del Tesoro Poliennali) sono i titoli di Stato italiani a medio e lungo termine: pagano una cedola fissa ogni sei mesi e rimborsano il capitale alla scadenza. Per molti risparmiatori italiani sono il primo riferimento per capire quanto rende il mercato obbligazionario.", "La tabella mostra i rendimenti dei titoli di Stato italiani presenti nei nostri dati, uno per anno di scadenza: una curva dei rendimenti semplificata. Gli interessi dei titoli di Stato italiani sono tassati al 12,5%, contro il 26% delle obbligazioni societarie."] },
    fr: { slug: "btp-italiens", h1: "BTP : rendements des obligations d'État italiennes", title: "BTP italiens : rendements par échéance", description: "Rendement à l'échéance et duration des BTP et autres obligations d'État italiennes en euros, par année d'échéance, mis à jour chaque jour.", intro: ["Les BTP (Buoni del Tesoro Poliennali) sont les obligations d'État italiennes à moyen et long terme, à coupon fixe semestriel. Elles rapportent en général plus que les OAT françaises, en contrepartie d'un risque de crédit jugé plus élevé par les agences de notation.", "Le tableau montre un rendement par année d'échéance : une courbe simplifiée des taux italiens, à comparer avec celle des OAT."] },
    de: { slug: "italienische-staatsanleihen", h1: "Italienische Staatsanleihen (BTP): Renditen", title: "Italienische Staatsanleihen: Renditen je Laufzeit", description: "Rendite bis Fälligkeit und Duration italienischer Staatsanleihen (BTP) in Euro, je Fälligkeitsjahr, täglich aktualisiert.", intro: ["BTP (Buoni del Tesoro Poliennali) sind die mittel- und langfristigen Staatsanleihen Italiens mit halbjährlichem Festkupon. Sie rentieren meist deutlich höher als Bundesanleihen, weil die Ratingagenturen Italiens Kreditqualität niedriger einstufen.", "Die Tabelle zeigt je Fälligkeitsjahr eine Anleihe: eine vereinfachte italienische Zinskurve, die sich mit der Bund-Kurve vergleichen lässt."] },
  },
  FR: {
    it: { slug: "titoli-di-stato-francesi", h1: "OAT: rendimenti dei titoli di Stato francesi", title: "Titoli di Stato francesi (OAT): rendimenti", description: "Rendimento a scadenza e duration delle OAT, i titoli di Stato francesi in euro, per anno di scadenza, aggiornati ogni giorno.", intro: ["Le OAT (Obligations Assimilables du Trésor) sono i titoli di Stato francesi a medio e lungo termine. Rendono di solito meno dei BTP e più dei Bund tedeschi: lo spread tra Francia e Germania è un indicatore seguito quanto lo spread BTP-Bund.", "La tabella mostra un rendimento per anno di scadenza, da confrontare con la curva dei BTP. Anche le OAT godono in Italia della tassazione al 12,5% riservata ai titoli di Stato dei Paesi che scambiano informazioni fiscali."] },
    fr: { slug: "oat", h1: "OAT : rendements des obligations d'État françaises", title: "OAT aujourd'hui : rendements par échéance", description: "Rendement à l'échéance et duration des OAT françaises en euros, par année d'échéance, avec la date des données.", intro: ["Les OAT (Obligations Assimilables du Trésor) sont émises par l'Agence France Trésor pour financer l'État. Elles servent de référence pour les taux d'intérêt en France : crédits immobiliers, fonds en euros et obligations d'entreprise se comparent souvent au taux de l'OAT à 10 ans.", "Le tableau présente une OAT par année d'échéance, soit une courbe des taux simplifiée. Les OAT indexées sur l'inflation (OATi et OAT€i) ne figurent pas ici : leurs flux dépendent de l'inflation et ne se comparent pas directement à un rendement nominal."] },
    de: { slug: "franzoesische-staatsanleihen", h1: "Französische Staatsanleihen (OAT): Renditen", title: "Französische Staatsanleihen (OAT): Renditen", description: "Rendite bis Fälligkeit und Duration französischer Staatsanleihen (OAT) in Euro, je Fälligkeitsjahr, täglich aktualisiert.", intro: ["OAT (Obligations Assimilables du Trésor) sind die Staatsanleihen Frankreichs. Ihr Renditeaufschlag gegenüber Bundesanleihen, der OAT-Bund-Spread, zeigt, wie der Markt Frankreichs Kreditqualität im Vergleich zu Deutschland einschätzt.", "Die Tabelle zeigt je Fälligkeitsjahr eine OAT. Inflationsindexierte OATi und OAT€i sind nicht enthalten, weil ihre Zahlungen von der Inflation abhängen."] },
  },
  DE: {
    it: { slug: "bund-tedeschi", h1: "Bund: rendimenti dei titoli di Stato tedeschi", title: "Bund tedeschi: rendimenti per scadenza", description: "Rendimento a scadenza e duration dei Bund e degli altri titoli di Stato tedeschi in euro, per anno di scadenza, aggiornati ogni giorno.", intro: ["I Bund sono i titoli di Stato tedeschi, considerati tra i più solidi dell'area euro. Il loro rendimento è il riferimento con cui si calcola lo spread: la differenza tra il rendimento di un BTP e quello di un Bund con la stessa scadenza.", "La tabella mostra un rendimento per anno di scadenza. Confrontala con la curva dei BTP per vedere lo spread scadenza per scadenza."] },
    fr: { slug: "bund-allemands", h1: "Bund : rendements des obligations d'État allemandes", title: "Bund allemands : rendements par échéance", description: "Rendement à l'échéance et duration des Bund et autres emprunts d'État allemands en euros, par année d'échéance.", intro: ["Les Bund sont les emprunts d'État allemands, la référence « sans risque » de la zone euro. L'écart entre l'OAT et le Bund à même échéance mesure la prime que le marché demande pour prêter à la France plutôt qu'à l'Allemagne.", "Le tableau présente un rendement par année d'échéance, à comparer avec la courbe des OAT."] },
    de: { slug: "bundesanleihen", h1: "Bundesanleihen: aktuelle Renditen nach Laufzeit", title: "Bundesanleihen: Renditen nach Laufzeit", description: "Rendite bis Fälligkeit und Duration von Bundesanleihen, Bundesobligationen und Bundesschatzanweisungen, je Fälligkeitsjahr, mit Datenstand.", intro: ["Bundesanleihen (Laufzeit meist 10 bis 30 Jahre), Bundesobligationen (Bobl, 5 Jahre) und Bundesschatzanweisungen (Schätze, 2 Jahre) werden von der Finanzagentur des Bundes begeben. Sie gelten als sicherste Anlage im Euroraum und sind der Maßstab, an dem andere Anleihen gemessen werden.", "Die Tabelle zeigt je Fälligkeitsjahr eine Bundeswertpapier-Rendite, also eine vereinfachte Zinskurve. Zinserträge unterliegen in Deutschland der Abgeltungsteuer."] },
  },
};

function maturityDef(y: number): ComparisonDef {
  return {
    id: `maturity-${y}`, kind: "issuers", match: (b) => year(b) === y, topics: ["ytm", "credit"],
    related: MATURITY_YEARS.filter((x) => Math.abs(x - y) === 1).map((x) => `maturity-${x}`),
    text: {
      it: { slug: `scadenza-${y}`, h1: `Obbligazioni in euro con scadenza ${y}`, title: `Obbligazioni scadenza ${y}: rendimenti a confronto`, description: `Obbligazioni in euro che scadono nel ${y}: rendimento a scadenza, duration e rischio a confronto, con i dati aggiornati ogni giorno.`, intro: [`Un'obbligazione che scade nel ${y} restituisce il capitale in quell'anno, se l'emittente resta solvibile. Chi ha una spesa prevista intorno al ${y} può usare questa scadenza per allineare l'investimento al proprio orizzonte e non dover vendere prima a un prezzo sfavorevole.`, `Qui trovi le obbligazioni in euro con scadenza ${y}, una per emittente, ordinate per rendimento. Un rendimento più alto di solito paga un rischio di credito più alto: guarda sempre il rischio accanto.`] },
      fr: { slug: `echeance-${y}`, h1: `Obligations en euros à échéance ${y}`, title: `Obligations échéance ${y} : rendements comparés`, description: `Obligations en euros remboursées en ${y} : rendement à l'échéance, duration et risque, une par émetteur, données quotidiennes.`, intro: [`Une obligation à échéance ${y} rembourse son capital cette année-là, si l'émetteur reste solvable. Si vous avez un projet prévu vers ${y}, choisir cette échéance permet de caler le placement sur votre horizon sans devoir revendre avant, au prix du moment.`, `Voici les obligations en euros arrivant à échéance en ${y}, une par émetteur, classées par rendement. Un rendement plus élevé rémunère en général un risque de crédit plus élevé : regardez la risque.`] },
      de: { slug: `faelligkeit-${y}`, h1: `Euro-Anleihen mit Fälligkeit ${y}`, title: `Anleihen Fälligkeit ${y}: Renditen im Vergleich`, description: `Euro-Anleihen, die ${y} fällig werden: Rendite bis Fälligkeit, Duration und Risiko, eine je Emittent, täglich aktualisiert.`, intro: [`Eine Anleihe mit Fälligkeit ${y} zahlt das Kapital in diesem Jahr zurück, sofern der Emittent zahlungsfähig bleibt. Wer um ${y} Geld braucht, kann mit dieser Laufzeit die Anlage an den eigenen Zeithorizont anpassen und muss nicht vorher zu einem ungünstigen Kurs verkaufen.`, `Hier sehen Sie Euro-Anleihen mit Fälligkeit ${y}, eine je Emittent, nach Rendite sortiert. Eine höhere Rendite ist meist der Preis für ein höheres Kreditrisiko: Achten Sie auf das Risiko.`] },
    },
  };
}

function durationDef(d: number): ComparisonDef {
  const lo = d - 0.5;
  const hi = d + 0.5;
  const it = d <= 3 ? `Una duration di circa ${d} anni indica un'obbligazione poco sensibile ai tassi: se i tassi salgono di un punto percentuale, il prezzo scende all'incirca del ${d}%. È la fascia di chi vuole limitare le oscillazioni.` : d <= 5 ? `Con una duration di circa ${d} anni, un punto percentuale di variazione dei tassi muove il prezzo all'incirca del ${d}%. È la fascia intermedia, spesso un compromesso tra rendimento e sensibilità ai tassi.` : `Una duration di circa ${d} anni rende il prezzo molto sensibile ai tassi: un punto di rialzo vale all'incirca il ${d}% di perdita di prezzo, e viceversa. Il rendimento delle scadenze lunghe si paga con oscillazioni maggiori.`;
  const fr = d <= 3 ? `Une duration d'environ ${d} ans signifie une faible sensibilité aux taux : si les taux montent d'un point, le prix baisse d'environ ${d} %. C'est la zone de ceux qui veulent limiter les variations de prix.` : d <= 5 ? `Avec une duration d'environ ${d} ans, une variation des taux d'un point fait bouger le prix d'environ ${d} %. C'est la zone intermédiaire, souvent un compromis entre rendement et risque de taux.` : `Une duration d'environ ${d} ans rend le prix très sensible aux taux : une hausse d'un point coûte environ ${d} % de prix, et inversement. Le rendement des échéances longues se paie par une volatilité plus forte.`;
  const de = d <= 3 ? `Eine Duration von etwa ${d} Jahren bedeutet geringe Zinsempfindlichkeit: Steigen die Zinsen um einen Prozentpunkt, fällt der Kurs um rund ${d} %. Geeignet für alle, die Kursschwankungen begrenzen wollen.` : d <= 5 ? `Bei einer Duration von etwa ${d} Jahren bewegt ein Prozentpunkt Zinsänderung den Kurs um rund ${d} %. Die mittlere Laufzeitzone ist oft ein Kompromiss zwischen Rendite und Zinsrisiko.` : `Eine Duration von etwa ${d} Jahren macht den Kurs sehr zinsempfindlich: Ein Prozentpunkt Zinsanstieg kostet rund ${d} % Kurs, und umgekehrt. Die Rendite langer Laufzeiten bezahlt man mit stärkeren Schwankungen.`;
  return {
    id: `duration-${d}`, kind: "issuers", match: (b) => b.modifiedDuration !== null && Math.abs(b.modifiedDuration - d) <= 0.5, topics: ["duration", "ytm"],
    related: DURATIONS.filter((x) => x !== d).slice(0, 2).map((x) => `duration-${x}`),
    text: {
      it: { slug: `duration-${d}-anni`, h1: `Obbligazioni con duration di circa ${d} anni`, title: `Obbligazioni duration ${d} anni: confronto`, description: `Obbligazioni in euro con duration modificata tra ${lo} e ${hi} anni: rendimento a scadenza, rischio e anno di scadenza, una per emittente.`, intro: [it, `La tabella mostra obbligazioni in euro con duration modificata tra ${lo} e ${hi} anni, una per emittente, ordinate per rendimento a scadenza.`] },
      fr: { slug: `duration-${d}-ans`, h1: `Obligations avec une duration d'environ ${d} ans`, title: `Obligations duration ${d} ans : comparatif`, description: `Obligations en euros avec une duration modifiée entre ${lo} et ${hi} ans : rendement à l'échéance, risque et année d'échéance.`, intro: [fr, `Le tableau montre des obligations en euros dont la duration modifiée est comprise entre ${lo} et ${hi} ans, une par émetteur, classées par rendement.`] },
      de: { slug: `duration-${d}-jahre`, h1: `Anleihen mit rund ${d} Jahren Duration`, title: `Anleihen mit ${d} Jahren Duration im Vergleich`, description: `Euro-Anleihen mit modifizierter Duration zwischen ${lo} und ${hi} Jahren: Rendite bis Fälligkeit, Risiko und Fälligkeitsjahr.`, intro: [de, `Die Tabelle zeigt Euro-Anleihen mit modifizierter Duration zwischen ${lo} und ${hi} Jahren, eine je Emittent, nach Rendite sortiert.`] },
    },
  };
}

function yieldDef(y: number): ComparisonDef {
  const lo = y - 0.5;
  const hi = y + 0.5;
  return {
    id: `yield-${y}`, kind: "issuers", match: (b) => b.grossYtm !== null && Math.abs(b.grossYtm - y) <= 0.5, topics: ["ytm", y >= 5 ? "hy" : "ig"],
    related: YIELDS.filter((x) => x !== y).map((x) => `yield-${x}`),
    text: {
      it: { slug: `rendimento-${y}-percento`, h1: `Obbligazioni con rendimento intorno al ${y}%`, title: `Obbligazioni rendimento ${y}%: confronto aggiornato`, description: `Obbligazioni in euro con rendimento a scadenza lordo tra ${lo}% e ${hi}%: emittente, rischio, duration e anno di scadenza.`, intro: [`Un rendimento a scadenza intorno al ${y}% lordo è quello che otterresti tenendo l'obbligazione fino alla scadenza al prezzo di oggi, se l'emittente paga cedole e capitale. Non è garantito: dipende dalla solvibilità dell'emittente.`, y >= 5 ? `In euro, rendimenti intorno al ${y}% arrivano soprattutto da emittenti con rischio più alto o da scadenze lunghe. Confronta il rischio di ogni obbligazione prima del rendimento.` : `A parità di rendimento conta la combinazione di rischio e duration: due obbligazioni al ${y}% possono avere rischi molto diversi. La tabella mostra entrambi.`] },
      fr: { slug: `rendement-${y}-pourcent`, h1: `Obligations avec un rendement proche de ${y} %`, title: `Obligations à ${y} % de rendement : comparatif`, description: `Obligations en euros avec un rendement à l'échéance brut entre ${lo} % et ${hi} % : émetteur, risque, duration et échéance.`, intro: [`Un rendement à l'échéance d'environ ${y} % brut correspond à ce que vous obtiendriez en gardant l'obligation jusqu'au remboursement, au prix actuel, si l'émetteur honore coupons et capital. Ce n'est pas une garantie.`, y >= 5 ? `En euros, des rendements proches de ${y} % viennent surtout d'émetteurs plus risqués ou d'échéances longues : vérifiez le risque avant le rendement.` : `À rendement égal, c'est le couple risque et duration qui fait la différence : deux obligations à ${y} % peuvent présenter des risques très différents.`] },
      de: { slug: `rendite-${y}-prozent`, h1: `Anleihen mit rund ${y} % Rendite`, title: `Anleihen mit ${y} % Rendite im Vergleich`, description: `Euro-Anleihen mit einer Bruttorendite bis Fälligkeit zwischen ${lo} % und ${hi} %: Emittent, Risiko, Duration und Fälligkeitsjahr.`, intro: [`Eine Rendite bis Fälligkeit von rund ${y} % brutto erhalten Sie, wenn Sie die Anleihe zum heutigen Kurs kaufen und bis zur Rückzahlung halten und der Emittent Kupons und Kapital zahlt. Garantiert ist sie nicht.`, y >= 5 ? `Renditen um ${y} % kommen im Euroraum vor allem von riskanteren Emittenten oder langen Laufzeiten. Prüfen Sie zuerst das Risiko.` : `Bei gleicher Rendite entscheiden Risiko und Duration: Zwei Anleihen mit ${y} % können sehr unterschiedliche Risiken haben.`] },
    },
  };
}

function homeIssuersDef(c: "IT" | "FR" | "DE"): ComparisonDef {
  const names = { IT: ["italiani", "italiens", "italienische", "Italia", "Italie", "Italien"], FR: ["francesi", "français", "französische", "Francia", "France", "Frankreich"], DE: ["tedeschi", "allemands", "deutsche", "Germania", "Allemagne", "Deutschland"] }[c];
  return {
    id: `issuers-${c.toLowerCase()}`, kind: "issuers", match: (b) => countryCode(b) === c, topics: ["credit", "ytm"],
    related: [`gov-${c.toLowerCase()}`, "corporate"], home: [c === "IT" ? "it" : c === "FR" ? "fr" : "de"],
    text: {
      it: { slug: `emittenti-${names[0]}`, h1: `Obbligazioni in euro di emittenti ${names[0]}`, title: `Obbligazioni di emittenti ${names[0]}: confronto`, description: `Obbligazioni in euro di emittenti con sede in ${names[3]}: rendimento a scadenza, duration e rischio a confronto, aggiornati ogni giorno.`, intro: [c === "IT" ? "Molti risparmiatori italiani preferiscono emittenti che conoscono: lo Stato, le banche e le grandi aziende del Paese. Conoscere il nome non riduce il rischio: contano il rischio di credito, la duration e diversificazione." : `Le obbligazioni di emittenti con sede in ${names[3]} sono un modo per diversificare fuori dall'Italia restando in euro, senza rischio di cambio.`, `Qui trovi le obbligazioni in euro di emittenti con Paese ${names[3]}, una per emittente, ordinate per rendimento a scadenza.`] },
      fr: { slug: `emetteurs-${c === "IT" ? "italiens" : c === "FR" ? "francais" : "allemands"}`, h1: `Obligations en euros d'émetteurs ${names[1]}`, title: `Obligations d'émetteurs ${names[1]} : comparatif`, description: `Obligations en euros d'émetteurs domiciliés en ${names[4]} : rendement à l'échéance, duration et risque, mises à jour chaque jour.`, intro: [c === "FR" ? "Beaucoup d'épargnants français privilégient des émetteurs qu'ils connaissent : l'État, les banques et les grands groupes du CAC 40. Un nom familier ne réduit pas le risque : le risque de crédit, la duration et la diversification comptent davantage." : `Les obligations d'émetteurs domiciliés en ${names[4]} permettent de diversifier hors de France tout en restant en euros, sans risque de change.`, `Voici les obligations en euros d'émetteurs dont le pays est ${names[4] === "France" ? "la France" : names[4] === "Italie" ? "l'Italie" : "l'Allemagne"}, une par émetteur, classées par rendement.`] },
      de: { slug: { IT: "italienische-emittenten", FR: "franzoesische-emittenten", DE: "deutsche-emittenten" }[c], h1: `Euro-Anleihen ${c === "DE" ? "deutscher" : c === "FR" ? "französischer" : "italienischer"} Emittenten`, title: `Anleihen ${c === "DE" ? "deutscher" : c === "FR" ? "französischer" : "italienischer"} Emittenten im Vergleich`, description: `Euro-Anleihen von Emittenten mit Sitz in ${names[5]}: Rendite bis Fälligkeit, Duration und Risiko, täglich aktualisiert.`, intro: [c === "DE" ? "Viele deutsche Anleger bevorzugen bekannte Namen: den Bund, Banken und DAX-Konzerne. Ein bekannter Name senkt das Risiko aber nicht: Kreditrisiko, Duration und Streuung zählen mehr." : `Anleihen von Emittenten aus ${names[5]} erweitern die Streuung über Deutschland hinaus, ohne Währungsrisiko, da sie in Euro laufen.`, `Hier sehen Sie Euro-Anleihen von Emittenten mit Sitz in ${names[5]}, eine je Emittent, nach Rendite sortiert.`] },
    },
  };
}

export const COMPARISONS: ComparisonDef[] = [
  ...(["IT", "FR", "DE"] as const).map((c): ComparisonDef => ({
    id: `gov-${c.toLowerCase()}`, kind: "curve", match: (b) => sovereignOf(b) === c, topics: ["gov", "ytm"],
    related: (["IT", "FR", "DE"] as const).filter((x) => x !== c).map((x) => `gov-${x.toLowerCase()}`),
    home: [c === "IT" ? "it" : c === "FR" ? "fr" : "de"], text: GOV[c],
  })),
  {
    id: "best", kind: "bands", match: ig, topics: ["compare", "ig"], related: ["investment-grade", "corporate"], home: ["it", "fr", "de"],
    text: {
      it: { slug: "migliori-obbligazioni", h1: "Le obbligazioni investment grade che rendono di più, per orizzonte", title: "Migliori obbligazioni per rendimento: confronto", description: "Le obbligazioni in euro investment grade con il rendimento a scadenza più alto a 2, 5 e 10 anni di duration, una per emittente. Dati quotidiani.", intro: ["“Migliori” dipende da cosa cerchi: qui usiamo un criterio trasparente e verificabile. Per tre orizzonti, 2, 5 e 10 anni di duration, mostriamo le obbligazioni investment grade (rischio 10BONDS da 1 a 6) con il rendimento a scadenza più alto, una per emittente.", "Non è una raccomandazione: un rendimento più alto a parità di orizzonte spesso indica un rischio maggiore. Per una selezione sul tuo obiettivo di rendimento usa lo strumento, che cerca le 10 obbligazioni più vicine ai tuoi due criteri."] },
      fr: { slug: "meilleures-obligations", h1: "Les obligations investment grade les mieux rémunérées, par horizon", title: "Meilleures obligations par rendement : comparatif", description: "Les obligations en euros investment grade au rendement le plus élevé pour 2, 5 et 10 ans de duration, une par émetteur. Données quotidiennes.", intro: ["« Meilleures » dépend de ce que vous cherchez : nous utilisons ici un critère transparent. Pour trois horizons, 2, 5 et 10 ans de duration, voici les obligations investment grade (risque 10BONDS de 1 à 6) offrant le rendement à l'échéance le plus élevé, une par émetteur.", "Ce n'est pas une recommandation : à horizon égal, un rendement plus élevé traduit souvent un risque plus élevé. Pour une sélection selon votre propre objectif, utilisez l'outil."] },
      de: { slug: "beste-anleihen", h1: "Investment-Grade-Anleihen mit der höchsten Rendite je Anlagehorizont", title: "Beste Anleihen nach Rendite im Vergleich", description: "Euro-Anleihen mit Investment Grade und der höchsten Rendite bis Fälligkeit bei 2, 5 und 10 Jahren Duration, eine je Emittent. Tägliche Daten.", intro: ["„Beste“ hängt davon ab, was Sie suchen. Wir verwenden ein transparentes Kriterium: Für drei Horizonte, 2, 5 und 10 Jahre Duration, zeigen wir die Investment-Grade-Anleihen (10BONDS-Risiko 1 bis 6) mit der höchsten Rendite bis Fälligkeit, eine je Emittent.", "Das ist keine Empfehlung: Bei gleichem Horizont bedeutet mehr Rendite oft mehr Risiko. Für eine Auswahl nach Ihrer eigenen Zielrendite nutzen Sie den Anleihen-Finder."] },
    },
  },
  {
    id: "corporate", kind: "issuers", match: (b) => issuerClass(b) === "corporate", topics: ["credit", "compare"], related: ["investment-grade", "high-yield"], home: ["it", "fr", "de"],
    text: {
      it: { slug: "corporate", h1: "Obbligazioni corporate in euro", title: "Obbligazioni corporate euro: rendimenti a confronto", description: "Obbligazioni societarie in euro di aziende e banche: rendimento a scadenza, duration e rischio, una per emittente, aggiornate ogni giorno.", intro: ["Le obbligazioni corporate sono emesse da aziende e banche, non da Stati. Rendono più dei titoli di Stato con lo stesso orizzonte perché il rischio di credito è più alto, e in Italia i loro interessi sono tassati al 26% invece che al 12,5%.", "La tabella mostra le obbligazioni corporate in euro con il rendimento più alto, una per emittente. Distinguiamo Stati, enti sovranazionali e agenzie in base al nome dell'emittente."] },
      fr: { slug: "obligations-entreprise", h1: "Obligations d'entreprise en euros", title: "Obligations d'entreprise en euros : comparatif", description: "Obligations d'entreprises et de banques en euros : rendement à l'échéance, duration et risque, une par émetteur, données quotidiennes.", intro: ["Les obligations d'entreprise (ou « corporate ») sont émises par des sociétés et des banques. Elles rapportent plus que les OAT de même horizon parce que le risque de crédit est plus élevé. En France, leurs intérêts relèvent en principe du prélèvement forfaitaire unique de 30 %, comme ceux des OAT.", "Le tableau présente les obligations d'entreprise en euros au rendement le plus élevé, une par émetteur. Les États, agences et organismes supranationaux sont exclus d'après le nom de l'émetteur."] },
      de: { slug: "unternehmensanleihen", h1: "Unternehmensanleihen in Euro", title: "Unternehmensanleihen in Euro: Renditen im Vergleich", description: "Euro-Anleihen von Unternehmen und Banken: Rendite bis Fälligkeit, Duration und Risiko, eine je Emittent, täglich aktualisiert.", intro: ["Unternehmensanleihen werden von Firmen und Banken begeben, nicht von Staaten. Sie rentieren höher als Bundesanleihen gleicher Laufzeit, weil das Ausfallrisiko höher ist.", "Die Tabelle zeigt Euro-Unternehmensanleihen mit der höchsten Rendite, eine je Emittent. Staaten, Förderbanken und supranationale Emittenten erkennen wir am Namen des Emittenten und lassen sie weg."] },
    },
  },
  {
    id: "high-yield", kind: "issuers", match: hy, topics: ["hy", "credit"], related: ["investment-grade", "yield-5"],
    text: {
      it: { slug: "alto-rendimento", h1: "Obbligazioni ad alto rendimento in euro", title: "Obbligazioni alto rendimento in euro: confronto", description: "Obbligazioni high yield in euro (rischio 10BONDS da 7 in su): rendimento a scadenza, duration e rischio, una per emittente, dati aggiornati.", intro: ["Le obbligazioni ad alto rendimento, o high yield, sono emesse da società con un rischio di credito più alto (rischio 10BONDS da 7 in su). Pagano di più perché il rischio che l'emittente non rimborsi è più alto, e reagiscono più delle altre all'andamento dell'economia.", "Non mostriamo emittenti senza valutazione né emittenti in insolvenza. Ogni emittente compare una volta sola."] },
      fr: { slug: "haut-rendement", h1: "Obligations à haut rendement en euros", title: "Obligations haut rendement en euros : comparatif", description: "Obligations high yield en euros (risque 10BONDS de 7 et plus) : rendement à l'échéance, duration et risque, une par émetteur.", intro: ["Les obligations à haut rendement, ou high yield, sont émises par des sociétés au risque de crédit plus élevé (risque 10BONDS de 7 et plus). Elles rapportent davantage parce que le risque de défaut est plus élevé, et elles suivent de près la conjoncture.", "Nous n'affichons aucun émetteur sans évaluation ni en défaut. Chaque émetteur n'apparaît qu'une fois."] },
      de: { slug: "hochzinsanleihen", h1: "Hochzinsanleihen in Euro", title: "Hochzinsanleihen in Euro im Vergleich", description: "High-Yield-Anleihen in Euro (10BONDS-Risiko ab 7): Rendite bis Fälligkeit, Duration und Risiko, eine je Emittent.", intro: ["Hochzinsanleihen (High Yield) stammen von Unternehmen mit höherem Kreditrisiko (10BONDS-Risiko ab 7). Sie zahlen mehr, weil das Ausfallrisiko höher ist, und reagieren stärker auf die Konjunktur.", "Wir zeigen keine Emittenten ohne Bewertung und keine Emittenten im Zahlungsausfall. Jeder Emittent erscheint nur einmal."] },
    },
  },
  {
    id: "investment-grade", kind: "issuers", match: ig, topics: ["ig", "credit"], related: ["high-yield", "best"],
    text: {
      it: { slug: "investment-grade", h1: "Obbligazioni investment grade in euro", title: "Obbligazioni investment grade in euro: confronto", description: "Obbligazioni in euro con rischio 10BONDS da 1 a 6: rendimento a scadenza, duration e rischio, una per emittente, aggiornate ogni giorno.", intro: ["Investment grade indica le obbligazioni di emittenti considerati solidi; qui sono quelle con rischio 10BONDS da 1 a 6. Il rendimento è più basso dell'high yield, in cambio di insolvenze storicamente più rare.", "La tabella mostra le obbligazioni investment grade in euro con il rendimento più alto, una per emittente: un punto di partenza per capire quanto rende oggi la parte più solida del mercato."] },
      fr: { slug: "investment-grade", h1: "Obligations investment grade en euros", title: "Obligations investment grade en euros : comparatif", description: "Obligations en euros au risque 10BONDS de 1 à 6 : rendement à l'échéance, duration et risque, une par émetteur, données quotidiennes.", intro: ["« Investment grade » désigne les obligations d'émetteurs jugés solides ; ici, celles au risque 10BONDS de 1 à 6. Le rendement est plus faible qu'en haut rendement, en échange de défauts historiquement bien plus rares.", "Le tableau présente les obligations investment grade en euros les mieux rémunérées, une par émetteur."] },
      de: { slug: "investment-grade", h1: "Investment-Grade-Anleihen in Euro", title: "Investment-Grade-Anleihen in Euro im Vergleich", description: "Euro-Anleihen mit 10BONDS-Risiko 1 bis 6: Rendite bis Fälligkeit, Duration und Risiko, eine je Emittent, täglich aktualisiert.", intro: ["Investment Grade bezeichnet Anleihen von Emittenten, die als solide gelten; hier sind es Anleihen mit 10BONDS-Risiko 1 bis 6. Die Rendite ist niedriger als bei Hochzinsanleihen, Ausfälle waren historisch deutlich seltener.", "Die Tabelle zeigt Investment-Grade-Anleihen in Euro mit der höchsten Rendite, eine je Emittent."] },
    },
  },
  homeIssuersDef("IT"),
  homeIssuersDef("FR"),
  homeIssuersDef("DE"),
  ...YIELDS.map(yieldDef),
  ...DURATIONS.map(durationDef),
  ...MATURITY_YEARS.map(maturityDef),
];

export const comparisonById = (id: string) => COMPARISONS.find((c) => c.id === id);
export const comparisonBySlug = (locale: Locale, slug: string) => COMPARISONS.find((c) => c.text[locale].slug === slug);

export type ComparisonRow = { rank: number; issuer: string; ytm: number; duration: number; risk: number | null; maturityYear: number | null };
export type ComparisonData = {
  def: ComparisonDef;
  bonds: number; // matching bonds
  issuers: number; // distinct issuers
  rows: ComparisonRow[];
  bands: { duration: number; rows: ComparisonRow[] }[]; // "bands" pages only
  ytm: { min: number; median: number; max: number } | null;
  avgDuration: number | null;
  investmentGradeShare: number | null; // 0..1 of issuers
};

const toRow = (b: PublicBond, i: number): ComparisonRow => ({ rank: i + 1, issuer: b.issuer ?? b.name, ytm: b.grossYtm!, duration: b.modifiedDuration!, risk: bondRisk(b), maturityYear: year(b) });

/** One bond per issuer (the site's own rule), highest yield first. */
function perIssuer(bonds: PublicBond[]): PublicBond[] {
  const best = new Map<string, PublicBond>();
  for (const b of [...bonds].sort((a, b) => b.grossYtm! - a.grossYtm! || a.isin.localeCompare(b.isin))) {
    const k = issuerKey(b);
    if (!best.has(k)) best.set(k, b);
  }
  return [...best.values()];
}

/** Build a comparison page from the bonds the site shows (rated, euro, priced). */
export function buildComparison(def: ComparisonDef, bonds: PublicBond[]): ComparisonData {
  const matching = bonds.filter((b) => b.grossYtm !== null && b.modifiedDuration !== null && bondRisk(b) !== null && def.match(b));
  const issuers = perIssuer(matching);
  let rows: ComparisonRow[] = [];
  let bands: ComparisonData["bands"] = [];
  if (def.kind === "curve") {
    // One bond per maturity year (the one with the longest remaining life in that year), shortest first.
    const byYear = new Map<number, PublicBond>();
    for (const b of matching) {
      const y = year(b);
      if (y === null) continue;
      const cur = byYear.get(y);
      if (!cur || (b.maturity ?? "") > (cur.maturity ?? "")) byYear.set(y, b);
    }
    const ys = [...byYear.keys()].sort((a, b) => a - b);
    const pick = ys.length <= CURVE_ROWS ? ys : Array.from({ length: CURVE_ROWS }, (_, i) => ys[Math.round((i * (ys.length - 1)) / (CURVE_ROWS - 1))]);
    rows = [...new Set(pick)].map((y, i) => toRow(byYear.get(y)!, i));
  } else if (def.kind === "bands") {
    bands = BAND_DURATIONS.map((d) => ({ duration: d, rows: perIssuer(matching.filter((b) => Math.abs(b.modifiedDuration! - d) <= 0.5)).slice(0, PUBLIC_ROWS).map(toRow) }));
  } else {
    rows = issuers.slice(0, PUBLIC_ROWS).map(toRow);
  }
  const yields = matching.map((b) => b.grossYtm!).sort((a, b) => a - b);
  return {
    def,
    bonds: matching.length,
    issuers: issuers.length,
    rows,
    bands,
    ytm: yields.length ? { min: yields[0], median: yields[Math.floor(yields.length / 2)], max: yields.at(-1)! } : null,
    avgDuration: matching.length ? matching.reduce((s, b) => s + b.modifiedDuration!, 0) / matching.length : null,
    investmentGradeShare: issuers.length ? issuers.filter(ig).length / issuers.length : null,
  };
}

/** Enough behind the page to be worth indexing. */
export function hasEnough(c: ComparisonData): boolean {
  if (c.def.kind === "curve") return c.rows.length >= MIN_BONDS;
  if (c.def.kind === "bands") return c.bands.every((b) => b.rows.length >= 3);
  return c.issuers >= MIN_ISSUERS;
}

export function allComparisons(bonds: PublicBond[]) {
  return COMPARISONS.map((d) => buildComparison(d, bonds));
}
