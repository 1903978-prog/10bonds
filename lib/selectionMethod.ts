import type { MethodLang } from "./methodology";

/**
 * The Selection methodology page (/selection-methodology): how the Portfolio top 10 is built, step by step, exactly as
 * lib/bonds.ts, lib/outliers.ts, lib/ranking.ts, lib/expectedLoss.ts and lib/monteCarlo.ts do it (the owner, 20/10/2026).
 * Numbers come from the code's constants and are filled in by the page ({placeholders}); never agency names.
 */
export type SelectionText = {
  title: string;
  intro: string;
  stepsHead: string;
  steps: [string, string][];
  formulasHead: string;
  formulas: [string, string][];
  mcHead: string;
  mc: string[];
  fullHead: string;
  full: [string, string][];
};

export const SELECTION_TEXT: Record<MethodLang, SelectionText> = {
  en: {
    title: "How we pick the top 10",
    intro: "A transparent, rules-based process: clean the data, measure each bond's chance of default year by year, then choose the 10 bonds whose combined chance of a loss is lowest while still reaching your target return. A Monte Carlo simulation then stress-tests the list.",
    stepsHead: "The process",
    steps: [
      ["Universe", "Bonds from our daily data copy in your currency and minimum order size, with a 10BONDS risk score no higher than your limit. Unscored bonds never appear."],
      ["Clean-up", "Names indicating subordinated, hybrid, perpetual, AT1 or CoCo debt are removed, then statistical return outliers (step 2 of the formulas)."],
      ["Horizon window", "Duration within ±{window}% of your horizon, widened in half-year steps (at most 2 years) until 10 different issuers are available."],
      ["One per issuer", "Each issuer can appear once, so the list is spread across 10 different credits."],
      ["Default probabilities", "Each bond's chance of default for every year until it matures, from long-run historical default studies for its risk level."],
      ["Optimisation", "Among all valid lists, the one with the lowest chance of a loss whose average return reaches your target and whose average duration stays within 5% of your horizon."],
      ["Stress test", "{paths} simulated scenarios of defaults give the expected return after defaults and a bad-case (5th percentile) return."],
    ],
    formulasHead: "Formulas",
    formulas: [
      ["Yearly default chance", "p(t) = PD(t) − PD(t−1), with PD(t) the cumulative default rate after t years"],
      ["Outlier rule", "return > μ + {sd}·σ of comparable bonds (same currency and risk score, similar duration, at least {peers} peers, the bond itself excluded)"],
      ["Bond survival", "S = 1 − PD(T), T = years to maturity"],
      ["List chance of a loss", "P = 1 − S₁ × S₂ × … × S₁₀"],
      ["Selection", "minimise P such that average return ≥ target"],
      ["Expected loss on your money (shown)", "(PD₁(T₁) + … + PD₁₀(T₁₀)) ÷ 10 × {lgd}%, over the bonds' life"],
      ["Return after expected losses", "y − PD(D) ÷ D × {lgd}%, D = duration (used for ties and for the 1-bond view)"],
    ],
    mcHead: "Monte Carlo stress test",
    mc: [
      "Each of the {paths} scenarios draws, for every bond, whether it defaults within your horizon (using its default probability) and when.",
      "A bond grows at its return until it defaults, then returns {recovery}% of its value. The list is equally weighted.",
      "We report the average return across all scenarios and the return that 95% of scenarios beat. The draw is seeded, so the same list always gives the same result.",
    ],
    fullHead: "Full explanation",
    full: [
      ["Why not the average risk score", "A list of five very safe and five very risky bonds can have the same average score as ten middle-risk bonds, but it is far more likely to suffer a default: default rates rise much faster than the risk score. Measuring the chance of a loss captures this; the average score does not."],
      ["From yearly to lifetime probability", "For each year t the chance a bond defaults in that year is PD(t) − PD(t−1). Surviving every year until maturity has probability 1 − PD(T). Cumulative rates are read from published years 1, 3, 5, 7, 10 and 15 with straight-line interpolation between them, extended proportionally beyond 15 years."],
      ["Combining bonds", "The list loses nothing only if every bond survives every year, so P = 1 − ∏(1 − PDᵢ(Tᵢ)). Bonds are treated as independent; in a systemic crisis defaults cluster, so the true chance can be higher."],
      ["How the search works", "The objective is the sum of −ln(1 − PDᵢ), which ranks lists exactly like P. Constraints are handled lexicographically: first reach the target return, then keep the average duration within 5% of the horizon (0.5 points per year beyond), then minimise P, then prefer higher return after expected losses. A best-improvement swap search (up to 400 rounds) runs from several starting lists: the safest bonds, the highest-return bonds and the best list found under every lower risk limit, so accepting more risk never returns a riskier list than needed."],
      ["Slider maximum", "The highest target offered is the average return of the 10 highest-return issuers in the window, rounded down to 0.01%. At that maximum the list is exactly those 10 bonds."],
      ["Outliers", "A return far above comparable bonds usually signals a structure the issuer's score does not describe. Comparables share currency and risk score, with duration within ±20% (at least ±1 year). The threshold k is currently {sd} standard deviations."],
      ["Market map (efficient frontier)", "The chart on the home page shows every bond by risk and return. For 4 to 6 year bonds, each risk level is represented by its 95th-percentile return and levels that pay no more than a safer level are dropped, leaving only the Pareto-efficient steps where extra risk earns extra return."],
      ["Risk score", "The 1 to 10 risk score is 10BONDS' own scale. Default probabilities come from a combined average of public historical default studies, not from any single provider."],
      ["Limits", "Historical default rates are long-run averages and do not forecast a specific issuer. Returns are indicative and can be stale. The search finds a very good list but cannot test every one of the billions of possible combinations."],
    ],
  },
  it: {
    title: "Come scegliamo le 10 obbligazioni",
    intro: "Un processo trasparente e basato su regole: puliamo i dati, misuriamo anno per anno la probabilità di default di ogni obbligazione e scegliamo le 10 con la probabilità di perdita complessiva più bassa che raggiungono ancora il tuo rendimento obiettivo. Una simulazione Monte Carlo mette poi alla prova la lista.",
    stepsHead: "Il processo",
    steps: [
      ["Universo", "Obbligazioni della nostra copia dati giornaliera nella tua valuta e taglio minimo, con un punteggio di rischio 10BONDS non superiore al tuo limite. Le obbligazioni senza punteggio non compaiono mai."],
      ["Pulizia", "Escludiamo i nomi che indicano debito subordinato, ibrido, perpetuo, AT1 o CoCo, poi i rendimenti anomali (formula 2)."],
      ["Finestra di orizzonte", "Duration entro ±{window}% del tuo orizzonte, allargata di mezzo anno alla volta (massimo 2 anni) finché ci sono 10 emittenti diversi."],
      ["Un'obbligazione per emittente", "Ogni emittente compare una sola volta, quindi la lista è distribuita su 10 crediti diversi."],
      ["Probabilità di default", "Per ogni obbligazione la probabilità di default anno per anno fino alla scadenza, da studi storici pubblici di lungo periodo sui default per il suo livello di rischio."],
      ["Ottimizzazione", "Tra tutte le liste valide, quella con la probabilità di perdita più bassa il cui rendimento medio raggiunge l'obiettivo e la cui duration media resta entro il 5% del tuo orizzonte."],
      ["Stress test", "{paths} scenari simulati di default danno il rendimento atteso al netto dei default e un rendimento nel caso sfavorevole (5° percentile)."],
    ],
    formulasHead: "Formule",
    formulas: [
      ["Probabilità annua di default", "p(t) = PD(t) − PD(t−1), con PD(t) il tasso di default cumulato dopo t anni"],
      ["Regola anomalie", "rendimento > μ + {sd}·σ delle obbligazioni comparabili (stessa valuta e punteggio, duration simile, almeno {peers} comparabili, esclusa l'obbligazione stessa)"],
      ["Sopravvivenza", "S = 1 − PD(T), T = anni alla scadenza"],
      ["Probabilità di perdita della lista", "P = 1 − S₁ × S₂ × … × S₁₀"],
      ["Selezione", "minimizzare P con rendimento medio ≥ obiettivo"],
      ["Perdita attesa sul capitale (mostrata)", "(PD₁(T₁) + … + PD₁₀(T₁₀)) ÷ 10 × {lgd}%, sulla vita delle obbligazioni"],
      ["Rendimento al netto delle perdite attese", "y − PD(D) ÷ D × {lgd}%, D = duration (per i pareggi e la vista 1 obbligazione)"],
    ],
    mcHead: "Stress test Monte Carlo",
    mc: [
      "In ciascuno dei {paths} scenari estraiamo, per ogni obbligazione, se va in default entro il tuo orizzonte (secondo la sua probabilità di default) e quando.",
      "Un'obbligazione cresce al suo rendimento fino al default, poi restituisce il {recovery}% del suo valore. La lista è a pesi uguali.",
      "Riportiamo il rendimento medio su tutti gli scenari e il rendimento superato dal 95% degli scenari. L'estrazione usa un seme fisso: la stessa lista dà sempre lo stesso risultato.",
    ],
    fullHead: "Spiegazione completa",
    full: [
      ["Perché non il rischio medio", "Una lista di cinque obbligazioni molto sicure e cinque molto rischiose può avere lo stesso punteggio medio di dieci obbligazioni a rischio intermedio, ma è molto più esposta a un default: i tassi di default crescono molto più in fretta del punteggio. La probabilità di perdita lo coglie, la media no."],
      ["Da annuale a probabilità sull'intera vita", "Per ogni anno t la probabilità che un'obbligazione vada in default in quell'anno è PD(t) − PD(t−1). Sopravvivere ogni anno fino alla scadenza ha probabilità 1 − PD(T). I tassi cumulati sono letti agli anni pubblicati 1, 3, 5, 7, 10 e 15 con interpolazione lineare, estesi in proporzione oltre i 15 anni."],
      ["Combinare le obbligazioni", "La lista non perde nulla solo se ogni obbligazione sopravvive ogni anno: P = 1 − ∏(1 − PDᵢ(Tᵢ)). Le obbligazioni sono considerate indipendenti; in una crisi sistemica i default si concentrano, quindi la probabilità reale può essere più alta."],
      ["Come funziona la ricerca", "L'obiettivo è la somma di −ln(1 − PDᵢ), che ordina le liste esattamente come P. I vincoli sono in ordine di priorità: prima raggiungere il rendimento obiettivo, poi tenere la duration media entro il 5% dell'orizzonte (0,5 punti per ogni anno oltre), poi minimizzare P, poi preferire il rendimento al netto delle perdite attese più alto. Una ricerca a scambi (miglior miglioramento, fino a 400 giri) parte da più liste: le più sicure, quelle a rendimento più alto e la migliore trovata con ogni limite di rischio più basso, così accettare più rischio non dà mai una lista più rischiosa del necessario."],
      ["Massimo del cursore", "L'obiettivo più alto proposto è il rendimento medio dei 10 emittenti a rendimento più alto nella finestra, arrotondato per difetto a 0,01%. A quel massimo la lista è esattamente quelle 10 obbligazioni."],
      ["Anomalie", "Un rendimento molto sopra le obbligazioni comparabili di solito indica una struttura che il punteggio dell'emittente non descrive. I comparabili hanno stessa valuta e punteggio e duration entro ±20% (almeno ±1 anno). La soglia k è oggi {sd} deviazioni standard."],
      ["Mappa del mercato (frontiera efficiente)", "Il grafico in home mostra ogni obbligazione per rischio e rendimento. Per le obbligazioni a 4-6 anni ogni livello di rischio è rappresentato dal suo rendimento al 95° percentile e i livelli che non pagano più di uno più sicuro sono esclusi: restano solo i gradini Pareto-efficienti in cui più rischio porta più rendimento."],
      ["Punteggio di rischio", "Il punteggio da 1 a 10 è la scala propria di 10BONDS. Le probabilità di default vengono da una media combinata di studi storici pubblici sui default, non da un singolo fornitore."],
      ["Limiti", "I tassi storici di default sono medie di lungo periodo e non prevedono il singolo emittente. I rendimenti sono indicativi e possono non essere aggiornati. La ricerca trova un'ottima lista ma non può provare ognuna dei miliardi di combinazioni possibili."],
    ],
  },
  fr: {
    title: "Comment nous choisissons les 10 obligations",
    intro: "Un processus transparent et fondé sur des règles : nous nettoyons les données, mesurons année après année la probabilité de défaut de chaque obligation, puis choisissons les 10 dont la probabilité de perte combinée est la plus faible tout en atteignant votre rendement cible. Une simulation Monte Carlo met ensuite la liste à l'épreuve.",
    stepsHead: "Le processus",
    steps: [
      ["Univers", "Obligations de notre copie de données quotidienne dans votre devise et votre montant minimum, avec un score de risque 10BONDS au plus égal à votre limite. Les obligations sans score n'apparaissent jamais."],
      ["Nettoyage", "Les noms indiquant une dette subordonnée, hybride, perpétuelle, AT1 ou CoCo sont exclus, puis les rendements aberrants (formule 2)."],
      ["Fenêtre d'horizon", "Duration à ±{window} % de votre horizon, élargie par demi-années (2 ans au plus) jusqu'à 10 émetteurs différents."],
      ["Une obligation par émetteur", "Chaque émetteur n'apparaît qu'une fois : la liste est répartie sur 10 crédits différents."],
      ["Probabilités de défaut", "Pour chaque obligation, la probabilité de défaut année par année jusqu'à l'échéance, d'après des études historiques publiques de long terme pour son niveau de risque."],
      ["Optimisation", "Parmi toutes les listes valides, celle à la probabilité de perte la plus faible dont le rendement moyen atteint votre cible et dont la duration moyenne reste à 5 % de votre horizon."],
      ["Test de résistance", "{paths} scénarios de défauts simulés donnent le rendement attendu après défauts et un rendement défavorable (5e centile)."],
    ],
    formulasHead: "Formules",
    formulas: [
      ["Probabilité annuelle de défaut", "p(t) = PD(t) − PD(t−1), PD(t) étant le taux de défaut cumulé après t années"],
      ["Règle des valeurs aberrantes", "rendement > μ + {sd}·σ des obligations comparables (même devise et score, duration proche, au moins {peers} comparables, l'obligation elle-même exclue)"],
      ["Survie", "S = 1 − PD(T), T = années jusqu'à l'échéance"],
      ["Probabilité de perte de la liste", "P = 1 − S₁ × S₂ × … × S₁₀"],
      ["Sélection", "minimiser P avec rendement moyen ≥ cible"],
      ["Perte attendue sur votre capital (affichée)", "(PD₁(T₁) + … + PD₁₀(T₁₀)) ÷ 10 × {lgd} %, sur la durée des obligations"],
      ["Rendement net des pertes attendues", "y − PD(D) ÷ D × {lgd} %, D = duration (pour départager et pour la vue 1 obligation)"],
    ],
    mcHead: "Test de résistance Monte Carlo",
    mc: [
      "Dans chacun des {paths} scénarios, nous tirons pour chaque obligation si elle fait défaut avant votre horizon (selon sa probabilité de défaut) et à quel moment.",
      "Une obligation croît à son rendement jusqu'au défaut, puis rend {recovery} % de sa valeur. La liste est équipondérée.",
      "Nous indiquons le rendement moyen de tous les scénarios et le rendement dépassé par 95 % d'entre eux. Le tirage utilise une graine fixe : la même liste donne toujours le même résultat.",
    ],
    fullHead: "Explication complète",
    full: [
      ["Pourquoi pas le risque moyen", "Une liste de cinq obligations très sûres et cinq très risquées peut avoir le même score moyen que dix obligations de risque moyen, mais elle est bien plus exposée à un défaut : les taux de défaut montent bien plus vite que le score. La probabilité de perte le mesure, la moyenne non."],
      ["De l'année à toute la durée de vie", "Pour chaque année t, la probabilité qu'une obligation fasse défaut cette année-là est PD(t) − PD(t−1). Survivre chaque année jusqu'à l'échéance a une probabilité de 1 − PD(T). Les taux cumulés sont lus aux années publiées 1, 3, 5, 7, 10 et 15 avec interpolation linéaire, prolongés proportionnellement au-delà de 15 ans."],
      ["Combiner les obligations", "La liste ne perd rien que si chaque obligation survit chaque année : P = 1 − ∏(1 − PDᵢ(Tᵢ)). Les obligations sont supposées indépendantes ; en crise systémique les défauts se regroupent, la probabilité réelle peut donc être plus élevée."],
      ["Fonctionnement de la recherche", "L'objectif est la somme de −ln(1 − PDᵢ), qui classe les listes exactement comme P. Les contraintes sont traitées par ordre de priorité : d'abord atteindre le rendement cible, puis garder la duration moyenne à 5 % de l'horizon (0,5 point par année au-delà), puis minimiser P, puis préférer le meilleur rendement net des pertes attendues. Une recherche par échanges (meilleure amélioration, jusqu'à 400 tours) part de plusieurs listes : les plus sûres, les plus rémunératrices et la meilleure trouvée sous chaque limite de risque inférieure, de sorte qu'accepter plus de risque ne donne jamais une liste plus risquée que nécessaire."],
      ["Maximum du curseur", "La cible la plus haute proposée est le rendement moyen des 10 émetteurs les plus rémunérateurs de la fenêtre, arrondi à 0,01 % inférieur. À ce maximum, la liste est exactement ces 10 obligations."],
      ["Valeurs aberrantes", "Un rendement très au-dessus des obligations comparables signale en général une structure que le score de l'émetteur ne décrit pas. Les comparables ont la même devise et le même score, avec une duration à ±20 % (au moins ±1 an). Le seuil k est actuellement de {sd} écarts-types."],
      ["Carte du marché (frontière efficiente)", "Le graphique de l'accueil montre chaque obligation par risque et rendement. Pour les obligations à 4-6 ans, chaque niveau de risque est représenté par son rendement au 95e centile et les niveaux qui ne paient pas plus qu'un niveau plus sûr sont retirés : il ne reste que les marches Pareto-efficientes où plus de risque rapporte plus."],
      ["Score de risque", "Le score de 1 à 10 est l'échelle propre de 10BONDS. Les probabilités de défaut proviennent d'une moyenne combinée d'études historiques publiques sur les défauts, non d'un fournisseur unique."],
      ["Limites", "Les taux de défaut historiques sont des moyennes de long terme et ne prévoient pas un émetteur précis. Les rendements sont indicatifs et peuvent dater. La recherche trouve une très bonne liste mais ne peut tester chacune des milliards de combinaisons possibles."],
    ],
  },
  de: {
    title: "So wählen wir die Top 10",
    intro: "Ein transparenter, regelbasierter Prozess: Wir bereinigen die Daten, messen Jahr für Jahr die Ausfallwahrscheinlichkeit jeder Anleihe und wählen dann die 10 Anleihen mit der geringsten gemeinsamen Verlustwahrscheinlichkeit, die Ihre Zielrendite noch erreichen. Eine Monte-Carlo-Simulation prüft die Liste anschließend unter Stress.",
    stepsHead: "Der Ablauf",
    steps: [
      ["Universum", "Anleihen aus unserer täglichen Datenkopie in Ihrer Währung und Mindestanlage, mit einem 10BONDS-Risikowert bis zu Ihrem Limit. Anleihen ohne Wert erscheinen nie."],
      ["Bereinigung", "Namen, die auf nachrangige, hybride, ewige, AT1- oder CoCo-Anleihen hinweisen, werden entfernt, danach statistische Renditeausreißer (Formel 2)."],
      ["Horizontfenster", "Duration innerhalb von ±{window} % Ihres Horizonts, in Halbjahresschritten (höchstens 2 Jahre) erweitert, bis 10 verschiedene Emittenten verfügbar sind."],
      ["Eine pro Emittent", "Jeder Emittent erscheint nur einmal, die Liste verteilt sich also auf 10 verschiedene Schuldner."],
      ["Ausfallwahrscheinlichkeiten", "Für jede Anleihe die Ausfallwahrscheinlichkeit Jahr für Jahr bis zur Fälligkeit, aus langfristigen öffentlichen historischen Ausfallstudien für ihr Risikoniveau."],
      ["Optimierung", "Unter allen gültigen Listen die mit der geringsten Verlustwahrscheinlichkeit, deren Durchschnittsrendite Ihr Ziel erreicht und deren durchschnittliche Duration innerhalb von 5 % Ihres Horizonts bleibt."],
      ["Stresstest", "{paths} simulierte Ausfallszenarien liefern die erwartete Rendite nach Ausfällen und eine Rendite im ungünstigen Fall (5. Perzentil)."],
    ],
    formulasHead: "Formeln",
    formulas: [
      ["Jährliche Ausfallwahrscheinlichkeit", "p(t) = PD(t) − PD(t−1), PD(t) = kumulierte Ausfallrate nach t Jahren"],
      ["Ausreißerregel", "Rendite > μ + {sd}·σ vergleichbarer Anleihen (gleiche Währung und gleicher Wert, ähnliche Duration, mindestens {peers} Vergleichsanleihen, ohne die Anleihe selbst)"],
      ["Überleben", "S = 1 − PD(T), T = Jahre bis zur Fälligkeit"],
      ["Verlustwahrscheinlichkeit der Liste", "P = 1 − S₁ × S₂ × … × S₁₀"],
      ["Auswahl", "P minimieren mit Durchschnittsrendite ≥ Ziel"],
      ["Erwarteter Verlust auf Ihr Geld (angezeigt)", "(PD₁(T₁) + … + PD₁₀(T₁₀)) ÷ 10 × {lgd} %, über die Laufzeit der Anleihen"],
      ["Rendite nach erwarteten Verlusten", "y − PD(D) ÷ D × {lgd} %, D = Duration (für Gleichstände und die 1-Anleihe-Ansicht)"],
    ],
    mcHead: "Monte-Carlo-Stresstest",
    mc: [
      "In jedem der {paths} Szenarien wird für jede Anleihe gezogen, ob sie innerhalb Ihres Horizonts ausfällt (gemäß ihrer Ausfallwahrscheinlichkeit) und wann.",
      "Eine Anleihe wächst mit ihrer Rendite bis zum Ausfall und bringt dann {recovery} % ihres Werts zurück. Die Liste ist gleich gewichtet.",
      "Wir zeigen die Durchschnittsrendite über alle Szenarien und die Rendite, die 95 % der Szenarien übertreffen. Die Ziehung nutzt einen festen Startwert: Dieselbe Liste ergibt immer dasselbe Ergebnis.",
    ],
    fullHead: "Vollständige Erklärung",
    full: [
      ["Warum nicht das Durchschnittsrisiko", "Eine Liste aus fünf sehr sicheren und fünf sehr riskanten Anleihen kann denselben Durchschnittswert haben wie zehn Anleihen mittleren Risikos, ist aber viel anfälliger für einen Ausfall: Ausfallraten steigen viel schneller als der Risikowert. Die Verlustwahrscheinlichkeit erfasst das, der Durchschnitt nicht."],
      ["Vom Jahr zur ganzen Laufzeit", "Für jedes Jahr t ist die Wahrscheinlichkeit, dass eine Anleihe in diesem Jahr ausfällt, PD(t) − PD(t−1). Jedes Jahr bis zur Fälligkeit zu überleben hat die Wahrscheinlichkeit 1 − PD(T). Kumulierte Raten werden bei den veröffentlichten Jahren 1, 3, 5, 7, 10 und 15 abgelesen, dazwischen linear interpoliert und über 15 Jahre hinaus proportional fortgeschrieben."],
      ["Anleihen kombinieren", "Die Liste verliert nur dann nichts, wenn jede Anleihe jedes Jahr überlebt: P = 1 − ∏(1 − PDᵢ(Tᵢ)). Die Anleihen gelten als unabhängig; in einer Systemkrise häufen sich Ausfälle, die tatsächliche Wahrscheinlichkeit kann also höher sein."],
      ["So funktioniert die Suche", "Zielgröße ist die Summe von −ln(1 − PDᵢ), die Listen genau wie P ordnet. Die Bedingungen gelten in Rangfolge: zuerst die Zielrendite erreichen, dann die durchschnittliche Duration innerhalb von 5 % des Horizonts halten (0,5 Punkte je Jahr darüber), dann P minimieren, dann die höhere Rendite nach erwarteten Verlusten bevorzugen. Eine Tauschsuche (beste Verbesserung, bis zu 400 Runden) startet von mehreren Listen: den sichersten, den renditestärksten und der besten Liste unter jedem niedrigeren Risikolimit, sodass mehr akzeptiertes Risiko nie eine riskantere Liste als nötig ergibt."],
      ["Reglermaximum", "Das höchste angebotene Ziel ist die Durchschnittsrendite der 10 renditestärksten Emittenten im Fenster, auf 0,01 % abgerundet. Bei diesem Maximum besteht die Liste genau aus diesen 10 Anleihen."],
      ["Ausreißer", "Eine Rendite weit über vergleichbaren Anleihen deutet meist auf eine Struktur hin, die der Wert des Emittenten nicht beschreibt. Vergleichsanleihen haben dieselbe Währung und denselben Wert, mit Duration innerhalb von ±20 % (mindestens ±1 Jahr). Der Schwellenwert k liegt derzeit bei {sd} Standardabweichungen."],
      ["Marktkarte (Effizienzgrenze)", "Das Diagramm auf der Startseite zeigt jede Anleihe nach Risiko und Rendite. Für 4- bis 6-jährige Anleihen steht jedes Risikoniveau für seine Rendite am 95. Perzentil; Niveaus, die nicht mehr zahlen als ein sichereres, entfallen. Übrig bleiben nur die Pareto-effizienten Stufen, auf denen mehr Risiko mehr Rendite bringt."],
      ["Risikowert", "Der Risikowert von 1 bis 10 ist die eigene Skala von 10BONDS. Die Ausfallwahrscheinlichkeiten stammen aus einem kombinierten Durchschnitt öffentlicher historischer Ausfallstudien, nicht von einem einzelnen Anbieter."],
      ["Grenzen", "Historische Ausfallraten sind langfristige Durchschnitte und sagen keinen einzelnen Emittenten voraus. Renditen sind indikativ und können veraltet sein. Die Suche findet eine sehr gute Liste, kann aber nicht jede der Milliarden möglichen Kombinationen prüfen."],
    ],
  },
};
