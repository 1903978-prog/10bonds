import type { SeedGuide } from "./guidesSeed";

// First-wave Knowledge Center pages from the research brief that had no page yet. They go in as DRAFTS with an
// outline: the facts to research are marked, nothing is published until Livio completes and approves them.

const todo = (lang: "it" | "fr" | "de", items: string[]) =>
  `<blockquote><strong>${lang === "it" ? "Bozza da completare" : lang === "fr" ? "Brouillon à compléter" : "Entwurf, noch zu vervollständigen"}:</strong> ${items.join(" · ")}</blockquote>`;

export const SEED_GUIDES_WAVE: SeedGuide[] = [
  {
    locale: "it", topic: "compare", group: "bonds-vs-etf", status: "draft",
    slug: "btp-o-etf-obbligazionari",
    title: "BTP o ETF obbligazionari: cosa cambia per chi investe",
    seoTitle: "BTP o ETF obbligazionari? Differenze e scelta",
    metaDescription: "BTP singoli o ETF obbligazionari: scadenza, rendimento, costi, tassazione e diversificazione a confronto, con un modo semplice per scegliere.",
    primaryKeyword: "btp o etf obbligazionari",
    relatedKeywords: ["etf obbligazionari", "btp"],
    relatedSlugs: ["btp", "duration-obbligazioni"],
    bodyHtml: `<p>Un BTP ha una scadenza: se lo tieni fino alla fine, sai già quanto incassi. Un ETF obbligazionario non scade mai: compra e vende titoli di continuo, quindi il suo valore si muove con i tassi per sempre.</p>
<h2 id="scadenza">Scadenza e rendimento noto</h2><p>Il rendimento a scadenza di un BTP è fissato al prezzo di acquisto. In un ETF il rendimento indicato è una media che cambia ogni giorno.</p>
<h2 id="costi">Costi</h2><p>Il BTP ha solo la commissione di acquisto; l'ETF ha anche un costo annuo (TER).</p>
${todo("it", ["confrontare TER tipici con fonte", "tassazione ETF (26% su proventi; quota titoli di Stato) da verificare su fonte ufficiale", "esempio numerico con dati reali"])}
<h2 id="quando">Quando scegliere l'uno o l'altro</h2><p>Chi ha una data precisa in cui servono i soldi tende a preferire titoli con quella scadenza; chi vuole diversificare con poco capitale guarda agli ETF.</p>
<p><strong>Prova subito:</strong> <a href="/it">confronta i BTP e le obbligazioni per scadenza</a>.</p>`,
  },
  {
    locale: "fr", topic: "gov", group: "buy-oat", status: "draft",
    slug: "acheter-des-oat",
    title: "Acheter des OAT en direct : comment faire",
    seoTitle: "Acheter des OAT en direct : mode d'emploi",
    metaDescription: "Comment acheter des obligations assimilables du Trésor (OAT) en direct via un courtier : où, à quel prix, avec quels frais et quels risques.",
    primaryKeyword: "acheter des oat",
    relatedKeywords: ["oat", "obligations d'état"],
    relatedSlugs: ["oat-obligations-etat"],
    bodyHtml: `<p>Les OAT sont les obligations de l'État français. Un particulier peut les acheter sur le marché secondaire via un courtier, comme une action, au prix du jour.</p>
<h2 id="ou">Où les acheter</h2><p>Via un compte-titres auprès d'un courtier ou d'une banque qui donne accès au marché obligataire.</p>
<h2 id="prix">Prix et rendement</h2><p>Le prix varie autour de 100 ; le rendement à l'échéance dépend du prix payé et du coupon.</p>
${todo("fr", ["lister les courtiers (voir la comparaison des frais en cours)", "minimum d'achat et frais avec sources", "fiscalité à vérifier sur impots.gouv.fr"])}
<p><strong>Essayez :</strong> <a href="/fr/obligations/oat">voir les rendements des OAT</a>.</p>`,
  },
  {
    locale: "de", topic: "compare", group: "bonds-vs-deposit", status: "draft",
    slug: "anleihen-oder-festgeld",
    title: "Anleihen oder Festgeld: was passt besser?",
    seoTitle: "Anleihen oder Festgeld? Der Vergleich",
    metaDescription: "Anleihen oder Festgeld: Rendite, Sicherheit, Einlagensicherung, Verfügbarkeit und Steuern im einfachen Vergleich.",
    primaryKeyword: "anleihen oder festgeld",
    relatedKeywords: ["festgeld", "anleihen"],
    relatedSlugs: ["bundesanleihen", "rendite-bis-faelligkeit"],
    bodyHtml: `<p>Festgeld bringt einen festen Zins für eine feste Zeit. Eine Anleihe bringt einen Kupon und kann vor Fälligkeit verkauft werden, ihr Kurs schwankt aber mit den Zinsen.</p>
<h2 id="sicherheit">Sicherheit</h2><p>Festgeld ist im Rahmen der gesetzlichen Einlagensicherung geschützt; eine Anleihe ist so sicher wie ihr Emittent.</p>
<h2 id="verfuegbarkeit">Verfügbarkeit</h2><p>Festgeld ist bis zum Ende gebunden; Anleihen lassen sich an der Börse verkaufen, eventuell mit Verlust.</p>
${todo("de", ["Höhe der Einlagensicherung mit Quelle", "aktuelle Festgeldzinsen nur mit Quelle und Datum", "Steuer (Abgeltungsteuer) mit Quelle"])}
<p><strong>Jetzt ausprobieren:</strong> <a href="/de">Anleihen nach Rendite und Laufzeit finden</a>.</p>`,
  },
];
