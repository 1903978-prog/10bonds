import type { MethodLang } from "./methodology";

/**
 * The Ranking methodology page (/ranking-methodology): how the risk premium check judges whether a bond's extra yield
 * pays for its extra credit risk (Livio's specification, 20/10/2026). Numbers (premiums, bracket, floor, exceptional
 * spread) come from the active curve version, never from these texts; {placeholders} are filled in by the page.
 */
export type RankingText = {
  title: string;
  intro: string;
  status: { shadow: string; on: string };
  tableHead: string;
  cols: [string, string];
  stepsHead: string;
  steps: [string, string][];
  exampleHead: string;
  example: string[];
  fullHead: string;
  full: [string, string][];
  note: string;
};

export const RANKING_TEXT: Record<MethodLang, RankingText> = {
  en: {
    title: "Ranking methodology",
    intro: "A riskier bond usually pays more. We check whether that extra yield is enough to pay for the extra credit risk. For each 10BONDS risk score we set a minimum spread over the German government bond (Bund) of the same maturity. A bond only ranks if it pays more than that minimum.",
    status: { shadow: "Being introduced: until it is switched on, lists use yield after expected losses.", on: "In use for the Portfolio list." },
    tableHead: "Minimum spread over the Bund (curve v{version})",
    cols: ["Risk", "Minimum"],
    stepsHead: "How a bond is checked",
    steps: [
      ["Maturity first", "Only bonds maturing in {min} to {max} years are considered."],
      ["Credit quality", "Risk {floorRisk} or lower, within your risk limit. Bonds without a risk score are never shown."],
      ["Outliers out", "Subordinated, hybrid or perpetual bonds are left out, and so is any yield more than {sd} standard deviations above the average of similar bonds (same risk score and currency, similar duration). This happens first, so an outlier never pushes out another bond."],
      ["Spread over the Bund", "Bond yield minus the Bund yield for the same maturity, read from the Bund curve."],
      ["Hurdle", "The spread must be strictly above the minimum for its risk score. Equal is not enough."],
      ["Too good to be true", "A surplus of {exceptional} bp or more usually hides a risk, so the bond is left out."],
      ["Best list", "Your target yield must be reached; among the lists that reach it, the highest surplus wins. One bond per issuer."],
    ],
    exampleHead: "Example",
    example: [
      "Bond A has risk 2 and yields 4.00%. Bond B has risk 4 and yields 4.30%.",
      "Moving from risk 2 to risk 4 needs {diff} bp more ({b} - {a}). B pays only 30 bp more, so A ranks higher.",
      "At 4.50% B pays 50 bp more, above the {diff} bp hurdle, and can rank above A.",
    ],
    fullHead: "Full explanation",
    full: [
      ["What the numbers are", "The minimum spreads are 10BONDS screening hurdles for about five-year EUR bonds. They are not market fair values, expected default losses or a forecast of returns. They are stored as a versioned curve; any change creates a new version and the history is kept."],
      ["Units", "1 basis point (bp) = 0.01 percentage points. 35 bp = 0.35% = 0.0035 as a decimal."],
      ["Required extra yield between two risk levels", "Minimum spread of the riskier bond minus minimum spread of the safer one. Every pair comes from the same table, never from separate hand-set numbers."],
      ["Risk-adjusted yield", "Yield minus the minimum spread for the risk score. A riskier bond ranks first only when its extra yield more than covers its higher minimum. This is a ranking score in yield units, not an expected return."],
      ["Risk compensation surplus", "Spread over the maturity-matched Bund minus the minimum spread. A positive surplus means the bond pays more than its risk requires. Bonds of different maturities are compared on this surplus, not on raw yield."],
      ["Governments and agencies", "Government, agency, regional and supranational bonds use the same table by risk score: a government bond needs the same spread as a company bond with the same risk. German Bunds are the base, so they show no surplus."],
      ["Risk score", "The 1 to 10 risk score is 10BONDS' own scale, built from public credit information. It is not a credit rating. See the Rating methodology."],
      ["What is left out", "Bonds outside the maturity bracket, above risk {floorRisk}, without a risk score, stale or missing prices, yields below the Bund, names suggesting subordinated, hybrid, perpetual, callable or floating structures, yields more than {sd} standard deviations above similar bonds, and surpluses of {exceptional} bp or more."],
      ["Your target yield", "The list's average yield must reach your target and should not overshoot it by more than half a point, and no single bond may yield more than 2 points above it. A lower target therefore gives a safer list."],
    ],
    note: "Information only, not investment advice. Yields and the Bund curve come from our daily data copy and can be wrong or out of date.",
  },
  it: {
    title: "Metodologia della classifica",
    intro: "Un'obbligazione più rischiosa di solito rende di più. Verifichiamo se quel rendimento in più basta a pagare il rischio di credito in più. Per ogni livello di rischio 10BONDS fissiamo uno spread minimo sul Bund tedesco della stessa scadenza: l'obbligazione entra in classifica solo se rende più di quel minimo.",
    status: { shadow: "In introduzione: finché non è attivato, le liste usano il rendimento dopo le perdite attese.", on: "In uso per la lista Portafoglio." },
    tableHead: "Spread minimo sul Bund (curva v{version})",
    cols: ["Rischio", "Minimo"],
    stepsHead: "Come viene verificata un'obbligazione",
    steps: [
      ["Prima la scadenza", "Contano solo le obbligazioni con scadenza tra {min} e {max} anni."],
      ["Qualità del credito", "Rischio {floorRisk} o inferiore, entro il tuo limite di rischio. Le obbligazioni senza livello di rischio non sono mai mostrate."],
      ["Fuori i casi anomali", "Subordinate, ibride o perpetue sono escluse, come ogni rendimento oltre {sd} deviazioni standard sopra la media di obbligazioni simili (stesso rischio e valuta, durata simile). Avviene per primo, così un caso anomalo non esclude mai un'altra obbligazione."],
      ["Spread sul Bund", "Rendimento dell'obbligazione meno quello del Bund della stessa scadenza, letto dalla curva del Bund."],
      ["Soglia", "Lo spread deve superare strettamente il minimo del suo livello di rischio. Uguale non basta."],
      ["Troppo bello per essere vero", "Un surplus di {exceptional} pb o più di solito nasconde un rischio: l'obbligazione è esclusa."],
      ["La lista migliore", "Il tuo rendimento obiettivo deve essere raggiunto; tra le liste che lo raggiungono vince il surplus più alto. Una sola obbligazione per emittente."],
    ],
    exampleHead: "Esempio",
    example: [
      "L'obbligazione A ha rischio 2 e rende 4,00%. La B ha rischio 4 e rende 4,30%.",
      "Passare da rischio 2 a rischio 4 richiede {diff} pb in più ({b} - {a}). B rende solo 30 pb in più, quindi A è più in alto.",
      "Al 4,50% B rende 50 pb in più, sopra la soglia di {diff} pb, e può superare A.",
    ],
    fullHead: "Spiegazione completa",
    full: [
      ["Cosa sono i numeri", "Gli spread minimi sono soglie di selezione di 10BONDS per obbligazioni in euro a circa cinque anni. Non sono valori equi di mercato, perdite attese da default né previsioni di rendimento. Sono salvati come curva con versione: ogni modifica crea una nuova versione e lo storico resta."],
      ["Unità", "1 punto base (pb) = 0,01 punti percentuali. 35 pb = 0,35% = 0,0035 in decimale."],
      ["Rendimento in più richiesto tra due livelli di rischio", "Spread minimo dell'obbligazione più rischiosa meno quello della più sicura. Ogni coppia deriva dalla stessa tabella."],
      ["Rendimento corretto per il rischio", "Rendimento meno lo spread minimo del livello di rischio. Un'obbligazione più rischiosa passa davanti solo se il rendimento in più copre ampiamente il suo minimo più alto. È un punteggio di classifica, non un rendimento atteso."],
      ["Surplus di compensazione del rischio", "Spread sul Bund della stessa scadenza meno lo spread minimo. Un surplus positivo significa che l'obbligazione paga più di quanto chiede il suo rischio. Scadenze diverse si confrontano su questo surplus, non sul rendimento lordo."],
      ["Stati ed enti pubblici", "Titoli di Stato, agenzie, regioni e sovranazionali usano la stessa tabella per rischio: un titolo di Stato richiede lo stesso spread di un'azienda con lo stesso rischio. Il Bund tedesco è la base, quindi non ha surplus."],
      ["Rischio", "Il rischio da 1 a 10 è una scala propria di 10BONDS, costruita da informazioni pubbliche sul credito. Non è un rating. Vedi la Metodologia del rating."],
      ["Cosa viene escluso", "Obbligazioni fuori dalla fascia di scadenza, con rischio oltre {floorRisk}, senza livello di rischio, con prezzi vecchi o mancanti, rendimenti sotto il Bund, nomi che indicano strutture subordinate, ibride, perpetue, richiamabili o variabili, rendimenti oltre {sd} deviazioni standard sopra obbligazioni simili e surplus di {exceptional} pb o più."],
      ["Il tuo rendimento obiettivo", "Il rendimento medio della lista deve raggiungere l'obiettivo senza superarlo di più di mezzo punto, e nessuna obbligazione può rendere più di 2 punti sopra. Un obiettivo più basso dà quindi una lista più sicura."],
    ],
    note: "Solo informazione, non consulenza finanziaria. Rendimenti e curva del Bund provengono dalla nostra copia giornaliera dei dati e possono essere errati o non aggiornati.",
  },
  fr: {
    title: "Méthodologie du classement",
    intro: "Une obligation plus risquée rapporte en général davantage. Nous vérifions si ce rendement supplémentaire suffit à payer le risque de crédit supplémentaire. Pour chaque niveau de risque 10BONDS, nous fixons un écart minimum sur le Bund allemand de même échéance : l'obligation n'est classée que si elle rapporte plus que ce minimum.",
    status: { shadow: "En cours d'introduction : tant qu'elle n'est pas activée, les listes utilisent le rendement après pertes attendues.", on: "Utilisée pour la liste Portefeuille." },
    tableHead: "Écart minimum sur le Bund (courbe v{version})",
    cols: ["Risque", "Minimum"],
    stepsHead: "Comment une obligation est vérifiée",
    steps: [
      ["D'abord l'échéance", "Seules les obligations à échéance de {min} à {max} ans sont prises en compte."],
      ["Qualité de crédit", "Risque {floorRisk} ou moins, dans votre limite de risque. Les obligations sans niveau de risque ne sont jamais affichées."],
      ["Cas anormaux exclus", "Subordonnées, hybrides ou perpétuelles sont exclues, comme tout rendement à plus de {sd} écarts-types au-dessus de la moyenne d'obligations similaires (même risque et devise, duration proche). Cela passe en premier : un cas anormal n'écarte jamais une autre obligation."],
      ["Écart sur le Bund", "Rendement de l'obligation moins celui du Bund de même échéance, lu sur la courbe du Bund."],
      ["Seuil", "L'écart doit être strictement supérieur au minimum de son niveau de risque. L'égalité ne suffit pas."],
      ["Trop beau pour être vrai", "Un surplus de {exceptional} pb ou plus cache souvent un risque : l'obligation est exclue."],
      ["La meilleure liste", "Votre rendement cible doit être atteint ; parmi les listes qui l'atteignent, le surplus le plus élevé l'emporte. Une seule obligation par émetteur."],
    ],
    exampleHead: "Exemple",
    example: [
      "L'obligation A a un risque 2 et rapporte 4,00 %. La B a un risque 4 et rapporte 4,30 %.",
      "Passer du risque 2 au risque 4 demande {diff} pb de plus ({b} - {a}). B ne rapporte que 30 pb de plus, donc A est mieux classée.",
      "À 4,50 %, B rapporte 50 pb de plus, au-dessus du seuil de {diff} pb, et peut dépasser A.",
    ],
    fullHead: "Explication complète",
    full: [
      ["Ce que sont les chiffres", "Les écarts minimums sont des seuils de sélection 10BONDS pour des obligations en euros à environ cinq ans. Ce ne sont ni des justes valeurs de marché, ni des pertes attendues, ni une prévision de rendement. Ils sont enregistrés comme une courbe versionnée : chaque modification crée une nouvelle version et l'historique est conservé."],
      ["Unités", "1 point de base (pb) = 0,01 point de pourcentage. 35 pb = 0,35 % = 0,0035 en décimal."],
      ["Rendement supplémentaire requis entre deux niveaux de risque", "Écart minimum de l'obligation la plus risquée moins celui de la plus sûre. Chaque paire vient du même tableau."],
      ["Rendement ajusté du risque", "Rendement moins l'écart minimum du niveau de risque. Une obligation plus risquée ne passe devant que si son rendement supplémentaire couvre largement son minimum plus élevé. C'est un score de classement, pas un rendement attendu."],
      ["Surplus de rémunération du risque", "Écart sur le Bund de même échéance moins l'écart minimum. Un surplus positif signifie que l'obligation paie plus que ce que demande son risque. Des échéances différentes sont comparées sur ce surplus, pas sur le rendement brut."],
      ["États et organismes publics", "Emprunts d'État, agences, régions et supranationaux utilisent le même tableau par risque : un emprunt d'État demande le même écart qu'une entreprise de même risque. Le Bund allemand est la base, il n'a donc pas de surplus."],
      ["Risque", "Le risque de 1 à 10 est une échelle propre à 10BONDS, construite à partir d'informations publiques sur le crédit. Ce n'est pas une notation. Voir la Méthodologie de notation."],
      ["Ce qui est exclu", "Obligations hors de la tranche d'échéance, au-dessus du risque {floorRisk}, sans niveau de risque, prix anciens ou manquants, rendements sous le Bund, noms évoquant des structures subordonnées, hybrides, perpétuelles, remboursables par anticipation ou variables, rendements à plus de {sd} écarts-types au-dessus d'obligations similaires et surplus de {exceptional} pb ou plus."],
      ["Votre rendement cible", "Le rendement moyen de la liste doit atteindre la cible sans la dépasser de plus d'un demi-point, et aucune obligation ne peut rapporter plus de 2 points au-dessus. Une cible plus basse donne donc une liste plus sûre."],
    ],
    note: "Information uniquement, pas un conseil en investissement. Rendements et courbe du Bund viennent de notre copie quotidienne des données et peuvent être erronés ou dépassés.",
  },
  de: {
    title: "Ranking-Methodik",
    intro: "Eine riskantere Anleihe bringt meist mehr Rendite. Wir prüfen, ob diese Mehrrendite das zusätzliche Kreditrisiko bezahlt. Für jede 10BONDS-Risikostufe legen wir einen Mindestaufschlag über die Bundesanleihe gleicher Laufzeit fest: Eine Anleihe kommt nur ins Ranking, wenn sie mehr als dieses Minimum bringt.",
    status: { shadow: "Wird eingeführt: Bis zur Freischaltung nutzen die Listen die Rendite nach erwarteten Verlusten.", on: "Im Einsatz für die Portfolio-Liste." },
    tableHead: "Mindestaufschlag über Bund (Kurve v{version})",
    cols: ["Risiko", "Minimum"],
    stepsHead: "So wird eine Anleihe geprüft",
    steps: [
      ["Zuerst die Laufzeit", "Nur Anleihen mit {min} bis {max} Jahren Restlaufzeit zählen."],
      ["Bonität", "Risiko {floorRisk} oder niedriger, innerhalb Ihres Risikolimits. Anleihen ohne Risikostufe werden nie gezeigt."],
      ["Ausreißer raus", "Nachrangige, hybride oder ewige Anleihen werden ausgeschlossen, ebenso jede Rendite mehr als {sd} Standardabweichungen über dem Durchschnitt ähnlicher Anleihen (gleiches Risiko und Währung, ähnliche Duration). Das geschieht zuerst, damit ein Ausreißer nie eine andere Anleihe verdrängt."],
      ["Aufschlag über Bund", "Rendite der Anleihe minus Rendite der Bundesanleihe gleicher Laufzeit, aus der Bund-Kurve."],
      ["Hürde", "Der Aufschlag muss das Minimum seiner Risikostufe klar übersteigen. Gleich reicht nicht."],
      ["Zu schön, um wahr zu sein", "Ein Überschuss von {exceptional} Bp oder mehr verbirgt meist ein Risiko: Die Anleihe wird ausgeschlossen."],
      ["Die beste Liste", "Ihre Zielrendite muss erreicht werden; unter den Listen, die sie erreichen, gewinnt der höchste Überschuss. Eine Anleihe pro Emittent."],
    ],
    exampleHead: "Beispiel",
    example: [
      "Anleihe A hat Risiko 2 und rentiert 4,00 %. Anleihe B hat Risiko 4 und rentiert 4,30 %.",
      "Von Risiko 2 zu Risiko 4 braucht es {diff} Bp mehr ({b} - {a}). B bringt nur 30 Bp mehr, also liegt A vorne.",
      "Bei 4,50 % bringt B 50 Bp mehr, über der Hürde von {diff} Bp, und kann A überholen.",
    ],
    fullHead: "Vollständige Erklärung",
    full: [
      ["Was die Zahlen sind", "Die Mindestaufschläge sind 10BONDS-Auswahlhürden für Euro-Anleihen mit rund fünf Jahren Laufzeit. Sie sind keine fairen Marktwerte, keine erwarteten Ausfallverluste und keine Renditeprognose. Sie sind als versionierte Kurve gespeichert: Jede Änderung erzeugt eine neue Version, die Historie bleibt erhalten."],
      ["Einheiten", "1 Basispunkt (Bp) = 0,01 Prozentpunkte. 35 Bp = 0,35 % = 0,0035 als Dezimalzahl."],
      ["Nötige Mehrrendite zwischen zwei Risikostufen", "Mindestaufschlag der riskanteren Anleihe minus der der sichereren. Jedes Paar stammt aus derselben Tabelle."],
      ["Risikoadjustierte Rendite", "Rendite minus Mindestaufschlag der Risikostufe. Eine riskantere Anleihe liegt nur vorne, wenn ihre Mehrrendite ihr höheres Minimum mehr als deckt. Das ist ein Ranking-Wert, keine erwartete Rendite."],
      ["Risikokompensations-Überschuss", "Aufschlag über die Bundesanleihe gleicher Laufzeit minus Mindestaufschlag. Ein positiver Überschuss heißt: Die Anleihe zahlt mehr, als ihr Risiko verlangt. Unterschiedliche Laufzeiten werden über diesen Überschuss verglichen, nicht über die Bruttorendite."],
      ["Staaten und öffentliche Emittenten", "Staatsanleihen, Agenturen, Bundesländer und Supranationale nutzen dieselbe Tabelle nach Risiko: Eine Staatsanleihe braucht denselben Aufschlag wie ein Unternehmen mit gleichem Risiko. Bundesanleihen sind die Basis und zeigen daher keinen Überschuss."],
      ["Risiko", "Das Risiko von 1 bis 10 ist eine eigene Skala von 10BONDS, aufgebaut aus öffentlichen Bonitätsinformationen. Es ist kein Rating. Siehe Rating-Methodik."],
      ["Was ausgeschlossen wird", "Anleihen außerhalb der Laufzeitspanne, über Risiko {floorRisk}, ohne Risikostufe, mit alten oder fehlenden Kursen, Renditen unter Bund, Namen mit Hinweis auf nachrangige, hybride, ewige, kündbare oder variable Strukturen, Renditen mehr als {sd} Standardabweichungen über ähnlichen Anleihen und Überschüsse ab {exceptional} Bp."],
      ["Ihre Zielrendite", "Die Durchschnittsrendite der Liste muss das Ziel erreichen und soll es um höchstens einen halben Punkt übersteigen; keine Anleihe darf mehr als 2 Punkte darüber liegen. Ein niedrigeres Ziel ergibt also eine sicherere Liste."],
    ],
    note: "Nur zur Information, keine Anlageberatung. Renditen und Bund-Kurve stammen aus unserer täglichen Datenkopie und können falsch oder veraltet sein.",
  },
};

/** Fills {name} placeholders. */
export function fill(s: string, v: Record<string, string | number>): string {
  return s.replace(/\{(\w+)\}/g, (m, k) => (k in v ? String(v[k]) : m));
}
