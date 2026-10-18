import type { Category, Country } from "./types";

// Localised text for the broker section. Each market has its own editorial copy (local bonds, venues,
// tax handling), not a word-for-word translation. Search phrases are the brief's starting candidates;
// no keyword-volume tool was reachable, so they are not ranked by demand yet.

export type Faq = { q: string; a: string };

export type CountryContent = {
  country: Country;
  lang: string; // BCP 47 for hreflang
  locale: string; // number formatting
  slug: string; // section path under /<country>/
  methodologySlug: string;
  sectionTitle: string; // "Migliori Broker per Obbligazioni"
  metaTitle: string;
  metaDescription: string;
  intro: string[];
  domesticGov: string; // BTP / OAT / Bund
  categories: Record<Category, string>;
  editorial: { h: string; p: string[] }[];
  faq: Faq[];
  ui: {
    breadcrumbHome: string;
    knowledge: string;
    tableTitle: string;
    tableNote: string;
    broker: string;
    score: string;
    orderSize: string;
    category: string;
    custody: string;
    details: string;
    view: string;
    notOffered: string;
    notDisclosed: string;
    notEligible: string;
    commission: string;
    thirdParty: string;
    fx: string;
    total: string;
    spreadsNote: string;
    uncounted: string;
    verified: string;
    overdue: string;
    sources: string;
    officialSite: string;
    sponsored: string;
    adDisclosure: string;
    noAffiliate: string;
    methodology: string;
    methodologyIntro: string[];
    criteria: Record<"cost" | "range" | "access" | "transparency" | "platform", { name: string; how: string }>;
    weight: string;
    assessmentNote: string;
    products: string;
    govBonds: string;
    corpBonds: string;
    fxBonds: string;
    venues: string;
    fees: string;
    commissions: string;
    custodyFee: string;
    accountFee: string;
    fxFee: string;
    otherFees: string;
    taxAgent: string;
    yes: string;
    no: string;
    unknown: string;
    strengths: string;
    limits: string;
    lastChecked: string;
    unverifiedFields: string;
    promo: string;
    until: string;
    min: string;
    max: string;
    upTo: string;
    above: string;
    perOrder: string;
    whereTitle: string;
    whereText: string;
    findBonds: string;
    findBondsText: string;
    disclaimer: string;
    draftBanner: string;
    otherMarkets: string;
    fewerThanTen: string;
    effectiveFrom: string;
    asOf: string;
    sortBy: string;
    generalTariff: string;
    planNote: string;
    strengthsAuto: { cheapest: string; noCustody: string; taxAgent: string; fx: string; manyVenues: string };
    limitsAuto: { noCorp: string; noFx: string; noTaxAgent: string; custody: string; unverified: string; minOrder: string };
  };
};

const IT: CountryContent = {
  country: "it",
  lang: "it-IT",
  locale: "it-IT",
  slug: "broker-obbligazioni",
  methodologySlug: "metodologia",
  sectionTitle: "Migliori Broker per Obbligazioni",
  metaTitle: "Migliori broker per obbligazioni e BTP: commissioni a confronto",
  metaDescription:
    "Quanto costa comprare BTP e obbligazioni societarie? Commissioni, minimi, custodia e cambio dei broker disponibili in Italia, calcolati su ordini da 5.000, 10.000 e 50.000 euro dalle tariffe ufficiali.",
  intro: [
    "Abbiamo confrontato le commissioni ufficiali dei broker che permettono ai residenti in Italia di comprare BTP e obbligazioni societarie.",
    "Per ogni broker calcoliamo il costo di un acquisto da 5.000, 10.000 e 50.000 euro usando solo il foglio informativo o la pagina tariffe pubblicata dal broker, con la data dell'ultima verifica.",
  ],
  domesticGov: "BTP",
  categories: { domestic_gov: "BTP e titoli di Stato italiani", eu_gov: "Altri titoli di Stato europei", eu_corp: "Obbligazioni societarie in euro", fx_bond: "Obbligazioni in valuta (es. USD)" },
  editorial: [
    {
      h: "Dove comprare BTP",
      p: [
        "I BTP già emessi si comprano in Borsa sul MOT di Borsa Italiana o su EuroTLX, tramite qualsiasi banca o broker che dia accesso a questi mercati. Nelle emissioni dedicate ai risparmiatori in collocamento sul MOT molti intermediari non applicano commissioni: lo verifichiamo caso per caso nelle condizioni del broker.",
        "Sul mercato secondario il costo totale è dato dalla commissione del broker più la differenza tra prezzo denaro e lettera (spread), che dipende dalla liquidità del titolo e non è indicata in nessuna tariffa.",
      ],
    },
    {
      h: "Commissioni per l'acquisto di obbligazioni: cosa guardare",
      p: [
        "Molti broker applicano una percentuale con un minimo e un massimo per ordine. Su ordini piccoli pesa il minimo, su ordini grandi il massimo: per questo mostriamo tre importi diversi invece di una sola cifra.",
        "Oltre alla commissione contano il canone del conto, i costi di custodia del dossier titoli e, per le obbligazioni in dollari o altre valute, il costo del cambio.",
      ],
    },
    {
      h: "Fisco: regime amministrato o dichiarativo",
      p: [
        "Con un intermediario italiano o che offre il regime amministrato, il broker trattiene le imposte su cedole e plusvalenze (12,5% sui titoli di Stato italiani e dei Paesi della white list, 26% sulle altre obbligazioni). Con un broker in regime dichiarativo le indichi tu nella dichiarazione dei redditi.",
        "L'imposta di bollo dello 0,20% annuo (IVAFE per i conti presso intermediari esteri) è una tassa, non una commissione del broker: per questo non entra nel confronto dei costi.",
      ],
    },
  ],
  faq: [
    {
      q: "Qual è il broker più economico per comprare BTP?",
      a: "Dipende dall'importo: un broker con commissione fissa conviene sugli ordini grandi, uno a percentuale con minimo basso su quelli piccoli. La tabella mostra il costo per 5.000, 10.000 e 50.000 euro, ma non include lo spread di mercato, che non è pubblicato.",
    },
    {
      q: "Posso comprare BTP all'emissione senza commissioni?",
      a: "Nei collocamenti dedicati al pubblico sul MOT (per esempio BTP Valore o BTP Italia) molti intermediari non applicano commissioni d'acquisto. Controlla le condizioni del tuo broker per la specifica emissione.",
    },
    {
      q: "Fineco o Directa per le obbligazioni?",
      a: "Le due tariffe sono strutturate in modo diverso. Confrontale nella tabella per l'importo che ti interessa e apri le schede dei broker per i dettagli e le fonti ufficiali.",
    },
  ],
  ui: {
    breadcrumbHome: "10BONDS",
    knowledge: "Guide",
    tableTitle: "Costo di un acquisto di obbligazioni",
    tableNote: "Commissione del broker più costi obbligatori di terzi pubblicati, sul singolo acquisto. Spread di mercato esclusi.",
    broker: "Broker",
    score: "Valutazione",
    orderSize: "Importo",
    category: "Tipo di obbligazione",
    custody: "Custodia",
    details: "Dettagli",
    view: "Scheda",
    notOffered: "Non offerto",
    notDisclosed: "Non pubblicato",
    notEligible: "Non disponibile per i residenti",
    commission: "Commissione del broker",
    thirdParty: "Costi di terzi obbligatori",
    fx: "Cambio valuta",
    total: "Totale stimato",
    spreadsNote: "Lo spread denaro-lettera e la qualità di esecuzione sono costi reali ma non sono pubblicati in nessuna tariffa e quindi non sono inclusi.",
    uncounted: "Pubblicati ma non calcolabili per ordine",
    verified: "Verificato il",
    overdue: "Da ricontrollare",
    sources: "Fonti ufficiali",
    officialSite: "Sito ufficiale",
    sponsored: "Sponsorizzato",
    adDisclosure: "Contenuto sponsorizzato. Le sponsorizzazioni non influenzano il confronto né la valutazione.",
    noAffiliate: "Nessun link di affiliazione: i collegamenti portano al sito ufficiale del broker e non ci pagano nulla.",
    methodology: "Metodologia",
    methodologyIntro: [
      "La valutazione riassume cinque criteri calcolati solo dalle tariffe e dalle informazioni ufficiali dei broker. È un nostro giudizio con regole pubblicate, non una classifica oggettiva: pesi diversi darebbero un ordine diverso.",
      "Accordi commerciali, link di affiliazione e spazi sponsorizzati non entrano nel calcolo.",
    ],
    criteria: {
      cost: { name: "Costo", how: "Costo per acquisti da 5.000, 10.000 e 50.000 euro di titoli di Stato italiani e obbligazioni societarie: 100 al più economico, 0 al più caro. Costo non pubblicato = 0." },
      range: { name: "Gamma di obbligazioni", how: "Titoli di Stato italiani (30), altri titoli di Stato europei (20), societarie (30), obbligazioni in valuta (20)." },
      access: { name: "Accessibilità per i residenti", how: "Regime amministrato (70; 25 se non confermato) e nessun canone di conto o custodia (30)." },
      transparency: { name: "Trasparenza delle tariffe", how: "Quota dei costi principali confermati su un documento ufficiale del broker." },
      platform: { name: "Mercati disponibili", how: "Numero di mercati per le obbligazioni (MOT, EuroTLX, OTC, mercati esteri...)." },
    },
    weight: "Peso",
    assessmentNote: "Valutazione 10BONDS secondo la metodologia pubblicata, non un giudizio oggettivo.",
    products: "Obbligazioni disponibili",
    govBonds: "Titoli di Stato",
    corpBonds: "Obbligazioni societarie",
    fxBonds: "Obbligazioni in valuta",
    venues: "Mercati",
    fees: "Costi",
    commissions: "Commissioni sulle obbligazioni",
    custodyFee: "Custodia titoli",
    accountFee: "Canone del conto",
    fxFee: "Cambio valuta",
    otherFees: "Altri costi",
    taxAgent: "Regime amministrato",
    yes: "Sì",
    no: "No",
    unknown: "Non confermato",
    strengths: "Punti di forza",
    limits: "Limiti",
    lastChecked: "Ultima verifica",
    unverifiedFields: "Non confermati su fonte ufficiale",
    promo: "Promozione",
    until: "fino al",
    min: "min.",
    max: "max.",
    upTo: "fino a",
    above: "oltre",
    perOrder: "per ordine",
    whereTitle: "Dove posso comprare queste obbligazioni?",
    whereText: "Questi broker danno accesso alla categoria di obbligazioni; la disponibilità del singolo ISIN va verificata sulla piattaforma del broker.",
    findBonds: "Trova le obbligazioni",
    findBondsText: "Scegli durata e rendimento obiettivo: 10BONDS ti mostra le 10 obbligazioni che si avvicinano di più.",
    disclaimer:
      "Informazioni a solo scopo informativo, non consulenza finanziaria né offerta. Le tariffe possono cambiare: verifica sempre il documento ufficiale del broker prima di operare.",
    draftBanner: "Anteprima: questa pagina non è ancora pubblicata.",
    otherMarkets: "Altri mercati",
    fewerThanTen: "Mostriamo solo i broker con tariffe verificate: per ora sono meno di dieci.",
    effectiveFrom: "In vigore dal",
    asOf: "Aggiornato al",
    sortBy: "Ordina per",
    generalTariff: "Tariffa generale di borsa: il broker non pubblica una tariffa specifica per le obbligazioni.",
    planNote: "Se il broker offre più piani o mercati, usiamo il più economico per ciascun importo, senza sconti per operatività e senza promozioni.",
    strengthsAuto: { cheapest: "Tra i costi più bassi per i BTP su questo importo", noCustody: "Nessun canone di conto né di custodia", taxAgent: "Regime amministrato: le imposte le versa il broker", fx: "Obbligazioni in valuta disponibili", manyVenues: "Accesso a più mercati obbligazionari" },
    limitsAuto: { noCorp: "Obbligazioni societarie non offerte", noFx: "Obbligazioni in valuta non offerte o non documentate", noTaxAgent: "Regime dichiarativo: le imposte vanno dichiarate da te", custody: "Applica costi di conto o custodia", unverified: "Alcuni costi non sono confermati su fonte ufficiale", minOrder: "Commissione minima elevata sugli ordini piccoli" },
  },
};

const FR: CountryContent = {
  country: "fr",
  lang: "fr-FR",
  locale: "fr-FR",
  slug: "courtiers-obligations",
  methodologySlug: "methodologie",
  sectionTitle: "Meilleurs Courtiers pour les Obligations",
  metaTitle: "Meilleur courtier pour acheter des obligations : frais comparés",
  metaDescription:
    "Combien coûte l'achat d'OAT et d'obligations d'entreprise ? Courtage, minimums, droits de garde et frais de change des courtiers accessibles en France, calculés pour 5 000, 10 000 et 50 000 € à partir des grilles tarifaires officielles.",
  intro: [
    "Nous avons comparé les grilles tarifaires officielles des courtiers qui permettent aux résidents français d'acheter des obligations d'État et d'entreprise.",
    "Pour chaque courtier, nous calculons le coût d'un achat de 5 000, 10 000 et 50 000 € à partir de sa seule documentation officielle, avec la date de la dernière vérification.",
  ],
  domesticGov: "OAT",
  categories: { domestic_gov: "OAT et obligations d'État françaises", eu_gov: "Autres obligations d'État européennes", eu_corp: "Obligations d'entreprise en euros", fx_bond: "Obligations en devises (ex. USD)" },
  editorial: [
    {
      h: "Où acheter des OAT",
      p: [
        "Les OAT sont cotées sur Euronext Paris, mais la liquidité pour les petits ordres y est souvent faible. Selon le courtier, l'accès passe par Euronext, par d'autres places européennes ou par des contreparties hors marché (OTC).",
        "Les obligations se détiennent dans un compte-titres ordinaire (CTO) : elles ne sont pas éligibles au PEA.",
      ],
    },
    {
      h: "Frais d'achat d'obligations : ce qui compte",
      p: [
        "La plupart des courtiers facturent un pourcentage avec un minimum par ordre, ou une grille par tranche de montant. Sur un petit ordre, c'est le minimum qui pèse ; sur un gros ordre, le pourcentage. C'est pourquoi nous comparons trois montants.",
        "Il faut ajouter les droits de garde éventuels, les frais de tenue de compte et, pour une obligation en dollars, les frais de change.",
      ],
    },
    {
      h: "Fiscalité et déclaration",
      p: [
        "Un courtier établi en France fournit l'imprimé fiscal unique (IFU) et prélève à la source l'acompte d'impôt et les prélèvements sociaux sur les coupons. Avec un courtier étranger, ces démarches peuvent vous revenir : nous l'indiquons quand l'information est publiée.",
        "Les obligations d'entreprise ont souvent une valeur nominale minimale de 100 000 € ; vérifiez la coupure avant de comparer les frais.",
      ],
    },
  ],
  faq: [
    {
      q: "Quel est le courtier le moins cher pour acheter des obligations ?",
      a: "Cela dépend du montant : un tarif fixe avantage les gros ordres, un pourcentage avec un faible minimum les petits. Le tableau compare 5 000, 10 000 et 50 000 €, hors écart de cotation (spread), qui n'est publié nulle part.",
    },
    {
      q: "Peut-on mettre des obligations dans un PEA ?",
      a: "Non, les obligations se détiennent dans un compte-titres ordinaire (CTO) ou via une assurance-vie, pas dans un PEA.",
    },
    {
      q: "Comment acheter des obligations d'État ?",
      a: "Ouvrez un compte-titres chez un courtier qui donne accès aux obligations, recherchez le code ISIN de l'obligation et passez un ordre à cours limité pour maîtriser le prix.",
    },
  ],
  ui: {
    breadcrumbHome: "10BONDS",
    knowledge: "Guides",
    tableTitle: "Coût d'un achat d'obligations",
    tableNote: "Courtage plus frais de tiers obligatoires publiés, pour un achat. Écarts de cotation exclus.",
    broker: "Courtier",
    score: "Évaluation",
    orderSize: "Montant",
    category: "Type d'obligation",
    custody: "Droits de garde",
    details: "Détails",
    view: "Fiche",
    notOffered: "Non proposé",
    notDisclosed: "Non publié",
    notEligible: "Non disponible pour les résidents",
    commission: "Courtage",
    thirdParty: "Frais de tiers obligatoires",
    fx: "Change",
    total: "Total estimé",
    spreadsNote: "L'écart entre prix acheteur et vendeur et la qualité d'exécution sont des coûts réels, mais aucune grille ne les publie : ils ne sont pas inclus.",
    uncounted: "Publiés mais non calculables par ordre",
    verified: "Vérifié le",
    overdue: "À revérifier",
    sources: "Sources officielles",
    officialSite: "Site officiel",
    sponsored: "Sponsorisé",
    adDisclosure: "Contenu sponsorisé. Les partenariats n'influencent ni la comparaison ni l'évaluation.",
    noAffiliate: "Aucun lien d'affiliation : les liens mènent au site officiel du courtier et ne nous rapportent rien.",
    methodology: "Méthodologie",
    methodologyIntro: [
      "L'évaluation résume cinq critères calculés uniquement à partir des tarifs et informations officiels des courtiers. C'est notre appréciation selon des règles publiées, pas un classement objectif : d'autres pondérations donneraient un autre ordre.",
      "Les accords commerciaux, liens d'affiliation et emplacements sponsorisés n'entrent pas dans le calcul.",
    ],
    criteria: {
      cost: { name: "Coût", how: "Coût d'achats de 5 000, 10 000 et 50 000 € d'OAT et d'obligations d'entreprise : 100 pour le moins cher, 0 pour le plus cher. Coût non publié = 0." },
      range: { name: "Gamme d'obligations", how: "Obligations d'État françaises (30), autres États européens (20), entreprises (30), devises (20)." },
      access: { name: "Accessibilité pour les résidents", how: "Fiscalité gérée à la source avec IFU (70 ; 25 si non confirmé) et pas de frais de tenue de compte ni de garde (30)." },
      transparency: { name: "Transparence tarifaire", how: "Part des frais principaux confirmés sur un document officiel du courtier." },
      platform: { name: "Marchés accessibles", how: "Nombre de places pour les obligations (Euronext, autres bourses, OTC...)." },
    },
    weight: "Poids",
    assessmentNote: "Évaluation 10BONDS selon la méthodologie publiée, pas un jugement objectif.",
    products: "Obligations proposées",
    govBonds: "Obligations d'État",
    corpBonds: "Obligations d'entreprise",
    fxBonds: "Obligations en devises",
    venues: "Marchés",
    fees: "Frais",
    commissions: "Courtage sur obligations",
    custodyFee: "Droits de garde",
    accountFee: "Tenue de compte",
    fxFee: "Frais de change",
    otherFees: "Autres frais",
    taxAgent: "Fiscalité à la source et IFU",
    yes: "Oui",
    no: "Non",
    unknown: "Non confirmé",
    strengths: "Points forts",
    limits: "Limites",
    lastChecked: "Dernière vérification",
    unverifiedFields: "Non confirmés sur une source officielle",
    promo: "Offre promotionnelle",
    until: "jusqu'au",
    min: "min.",
    max: "max.",
    upTo: "jusqu'à",
    above: "au-delà",
    perOrder: "par ordre",
    whereTitle: "Où acheter ces obligations ?",
    whereText: "Ces courtiers donnent accès à cette catégorie d'obligations ; la disponibilité d'un ISIN précis se vérifie sur la plateforme du courtier.",
    findBonds: "Trouver des obligations",
    findBondsText: "Choisissez une durée et un rendement cible : 10BONDS affiche les 10 obligations les plus proches.",
    disclaimer:
      "Information uniquement, ni conseil en investissement ni offre. Les tarifs peuvent changer : vérifiez toujours la documentation officielle du courtier avant d'investir.",
    draftBanner: "Aperçu : cette page n'est pas encore publiée.",
    otherMarkets: "Autres marchés",
    fewerThanTen: "Nous n'affichons que les courtiers aux tarifs vérifiés : ils sont moins de dix pour l'instant.",
    effectiveFrom: "En vigueur depuis le",
    asOf: "Mis à jour le",
    sortBy: "Trier par",
    generalTariff: "Grille générale de courtage : le courtier ne publie pas de tarif propre aux obligations.",
    planNote: "Si le courtier propose plusieurs offres ou places, nous retenons la moins chère pour chaque montant, sans remise de volume ni promotion.",
    strengthsAuto: { cheapest: "Parmi les moins chers pour les OAT sur ce montant", noCustody: "Ni frais de tenue de compte ni droits de garde", taxAgent: "Fiscalité gérée à la source avec IFU", fx: "Obligations en devises disponibles", manyVenues: "Accès à plusieurs marchés obligataires" },
    limitsAuto: { noCorp: "Obligations d'entreprise non proposées", noFx: "Obligations en devises non proposées ou non documentées", noTaxAgent: "Fiscalité à déclarer vous-même", custody: "Frais de tenue de compte ou de garde", unverified: "Certains frais non confirmés sur une source officielle", minOrder: "Courtage minimum élevé sur les petits ordres" },
  },
};

const DE: CountryContent = {
  country: "de",
  lang: "de-DE",
  locale: "de-DE",
  slug: "anleihen-broker",
  methodologySlug: "methodik",
  sectionTitle: "Beste Broker für Anleihen",
  metaTitle: "Beste Broker für Anleihen: Gebühren im Vergleich",
  metaDescription:
    "Was kostet der Kauf von Bundesanleihen und Unternehmensanleihen? Ordergebühren, Mindestentgelte, Depot- und Fremdwährungskosten der Broker in Deutschland, berechnet für 5.000, 10.000 und 50.000 € aus den offiziellen Preisverzeichnissen.",
  intro: [
    "Wir haben die offiziellen Preisverzeichnisse der Broker verglichen, über die Anleger mit Wohnsitz in Deutschland Staats- und Unternehmensanleihen kaufen können.",
    "Für jeden Broker berechnen wir die Kosten eines Kaufs über 5.000, 10.000 und 50.000 € ausschließlich aus seinen offiziellen Unterlagen, mit dem Datum der letzten Prüfung.",
  ],
  domesticGov: "Bundesanleihen",
  categories: { domestic_gov: "Bundesanleihen", eu_gov: "Andere europäische Staatsanleihen", eu_corp: "Unternehmensanleihen in Euro", fx_bond: "Fremdwährungsanleihen (z. B. USD)" },
  editorial: [
    {
      h: "Bundesanleihen kaufen: über welchen Broker?",
      p: [
        "Bundesanleihen werden an deutschen Börsen gehandelt, etwa in Frankfurt oder Stuttgart, und bei vielen Brokern auch außerbörslich über Direkthandelspartner. Welche Handelsplätze verfügbar sind, unterscheidet sich je nach Broker.",
        "Neben der Ordergebühr des Brokers können Börsenentgelte und fremde Spesen anfallen. Wir rechnen sie ein, wenn das Preisverzeichnis sie beziffert, und weisen sie sonst gesondert aus.",
      ],
    },
    {
      h: "Anleihen kaufen: welche Gebühren zählen",
      p: [
        "Viele Broker berechnen einen Grundpreis plus Prozentsatz mit Mindest- und Höchstentgelt, andere eine Pauschale pro Order. Bei kleinen Orders zählt die Mindestgebühr, bei großen der Prozentsatz oder die Obergrenze. Deshalb vergleichen wir drei Ordergrößen.",
        "Hinzu kommen eventuelle Depotgebühren und bei Anleihen in US-Dollar oder anderen Währungen die Kosten des Währungstauschs. Beim Kauf zahlen Sie außerdem aufgelaufene Stückzinsen; sie sind keine Gebühr.",
      ],
    },
    {
      h: "Steuern: inländisches Depot oder Auslandsbroker",
      p: [
        "Deutsche Depotbanken behalten die Abgeltungsteuer (25 % plus Solidaritätszuschlag und gegebenenfalls Kirchensteuer) automatisch ein und berücksichtigen Freistellungsaufträge. Bei manchen Auslandsbrokern müssen Sie Erträge selbst in der Steuererklärung angeben.",
        "Viele Unternehmensanleihen haben eine Mindeststückelung von 100.000 €; prüfen Sie die Stückelung vor dem Kostenvergleich.",
      ],
    },
  ],
  faq: [
    {
      q: "Welcher Broker ist am günstigsten für Anleihen?",
      a: "Das hängt von der Ordergröße ab: Pauschalen lohnen sich bei großen Orders, prozentuale Gebühren mit niedrigem Minimum bei kleinen. Die Tabelle zeigt 5.000, 10.000 und 50.000 €, ohne Geld-Brief-Spanne, die kein Preisverzeichnis nennt.",
    },
    {
      q: "Was kostet es, Staatsanleihen zu kaufen?",
      a: "Ordergebühr des Brokers, eventuelle Börsenentgelte und die Geld-Brief-Spanne. Stückzinsen sind keine Kosten, sondern bereits verdiente Zinsen, die Sie dem Verkäufer erstatten.",
    },
    {
      q: "Brauche ich ein Depot für Anleihen?",
      a: "Ja, Anleihen werden wie Aktien in einem Wertpapierdepot verwahrt. Vergleichen Sie neben der Ordergebühr auch Depot- und Kontoführungsgebühren.",
    },
  ],
  ui: {
    breadcrumbHome: "10BONDS",
    knowledge: "Ratgeber",
    tableTitle: "Kosten eines Anleihekaufs",
    tableNote: "Ordergebühr des Brokers plus veröffentlichte Pflichtentgelte Dritter für einen Kauf. Ohne Geld-Brief-Spanne.",
    broker: "Broker",
    score: "Bewertung",
    orderSize: "Ordergröße",
    category: "Anleiheart",
    custody: "Depotgebühr",
    details: "Details",
    view: "Profil",
    notOffered: "Nicht angeboten",
    notDisclosed: "Nicht veröffentlicht",
    notEligible: "Für Inländer nicht verfügbar",
    commission: "Ordergebühr",
    thirdParty: "Pflichtentgelte Dritter",
    fx: "Währungstausch",
    total: "Geschätzte Gesamtkosten",
    spreadsNote: "Geld-Brief-Spanne und Ausführungsqualität sind echte Kosten, werden aber in keinem Preisverzeichnis genannt und sind daher nicht enthalten.",
    uncounted: "Veröffentlicht, aber nicht pro Order berechenbar",
    verified: "Geprüft am",
    overdue: "Erneut prüfen",
    sources: "Offizielle Quellen",
    officialSite: "Offizielle Website",
    sponsored: "Anzeige",
    adDisclosure: "Anzeige. Werbepartnerschaften beeinflussen weder den Vergleich noch die Bewertung.",
    noAffiliate: "Keine Affiliate-Links: Die Links führen zur offiziellen Website des Brokers, wir erhalten dafür nichts.",
    methodology: "Methodik",
    methodologyIntro: [
      "Die Bewertung fasst fünf Kriterien zusammen, die ausschließlich aus offiziellen Preisverzeichnissen und Angaben der Broker berechnet werden. Sie ist unsere Einschätzung nach veröffentlichten Regeln, keine objektive Rangliste: andere Gewichte ergäben eine andere Reihenfolge.",
      "Provisionen, Affiliate-Links und Anzeigenplätze fließen nicht in die Berechnung ein.",
    ],
    criteria: {
      cost: { name: "Kosten", how: "Kosten für Käufe über 5.000, 10.000 und 50.000 € von Bundesanleihen und Unternehmensanleihen: 100 für den günstigsten, 0 für den teuersten. Nicht veröffentlicht = 0." },
      range: { name: "Anleiheauswahl", how: "Bundesanleihen (30), andere europäische Staatsanleihen (20), Unternehmensanleihen (30), Fremdwährungsanleihen (20)." },
      access: { name: "Zugang für Inländer", how: "Automatischer Steuerabzug (70; 25 wenn nicht bestätigt) und keine Konto- oder Depotgebühr (30)." },
      transparency: { name: "Preistransparenz", how: "Anteil der wichtigsten Kosten, die in einem offiziellen Dokument des Brokers bestätigt sind." },
      platform: { name: "Handelsplätze", how: "Anzahl der Handelsplätze für Anleihen (Börsen, Direkthandel, OTC)." },
    },
    weight: "Gewicht",
    assessmentNote: "10BONDS-Bewertung nach veröffentlichter Methodik, kein objektives Urteil.",
    products: "Angebotene Anleihen",
    govBonds: "Staatsanleihen",
    corpBonds: "Unternehmensanleihen",
    fxBonds: "Fremdwährungsanleihen",
    venues: "Handelsplätze",
    fees: "Kosten",
    commissions: "Ordergebühren für Anleihen",
    custodyFee: "Depotgebühr",
    accountFee: "Kontoführung",
    fxFee: "Währungstausch",
    otherFees: "Sonstige Kosten",
    taxAgent: "Automatischer Steuerabzug",
    yes: "Ja",
    no: "Nein",
    unknown: "Nicht bestätigt",
    strengths: "Stärken",
    limits: "Einschränkungen",
    lastChecked: "Zuletzt geprüft",
    unverifiedFields: "Nicht offiziell bestätigt",
    promo: "Aktion",
    until: "bis",
    min: "mind.",
    max: "max.",
    upTo: "bis",
    above: "darüber",
    perOrder: "pro Order",
    whereTitle: "Wo kann ich diese Anleihen kaufen?",
    whereText: "Diese Broker bieten Zugang zu dieser Anleiheart; ob eine bestimmte ISIN handelbar ist, prüfen Sie auf der Plattform des Brokers.",
    findBonds: "Anleihen finden",
    findBondsText: "Wählen Sie Laufzeit und Zielrendite: 10BONDS zeigt die 10 passendsten Anleihen.",
    disclaimer:
      "Nur zur Information, keine Anlageberatung und kein Angebot. Gebühren können sich ändern: Prüfen Sie vor jeder Order das offizielle Preisverzeichnis des Brokers.",
    draftBanner: "Vorschau: Diese Seite ist noch nicht veröffentlicht.",
    otherMarkets: "Andere Märkte",
    fewerThanTen: "Wir zeigen nur Broker mit geprüften Preisen: derzeit weniger als zehn.",
    effectiveFrom: "Gültig ab",
    asOf: "Stand",
    sortBy: "Sortieren nach",
    generalTariff: "Allgemeines Orderentgelt: Der Broker nennt keinen eigenen Anleihetarif.",
    planNote: "Bietet ein Broker mehrere Preismodelle oder Handelsplätze, verwenden wir je Ordergröße das günstigste, ohne Vieltrader-Rabatte und ohne Aktionen.",
    strengthsAuto: { cheapest: "Unter den günstigsten für Bundesanleihen bei dieser Ordergröße", noCustody: "Keine Konto- oder Depotgebühr", taxAgent: "Abgeltungsteuer wird automatisch abgeführt", fx: "Fremdwährungsanleihen verfügbar", manyVenues: "Zugang zu mehreren Handelsplätzen" },
    limitsAuto: { noCorp: "Keine Unternehmensanleihen", noFx: "Fremdwährungsanleihen nicht angeboten oder nicht dokumentiert", noTaxAgent: "Kein automatischer Steuerabzug: Erträge selbst erklären", custody: "Konto- oder Depotgebühren", unverified: "Einige Kosten nicht offiziell bestätigt", minOrder: "Hohe Mindestgebühr bei kleinen Orders" },
  },
};

export const CONTENT: Record<Country, CountryContent> = { it: IT, fr: FR, de: DE };

/** Country of a site path: "/it/..." -> "it". */
export function countryOfPath(path: string): Country | null {
  const seg = path.split("/")[1];
  return seg === "it" || seg === "fr" || seg === "de" ? seg : null;
}

export const sectionPath = (c: Country) => `/${c}/${CONTENT[c].slug}`;
export const brokerPath = (c: Country, id: string) => `${sectionPath(c)}/${id}`;
export const methodologyPath = (c: Country) => `${sectionPath(c)}/${CONTENT[c].methodologySlug}`;
