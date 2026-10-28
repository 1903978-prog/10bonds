import type { MethodLang } from "./methodology";

/**
 * The Selection methodology page (/selection-methodology): how the Portfolio top 10 is built, step by step, exactly as
 * lib/bonds.ts, lib/outliers.ts, lib/ranking.ts and lib/expectedLoss.ts do it (the owner, 20/10/2026).
 * Numbers come from the code's constants and are filled in by the page ({placeholders}); never agency names.
 */
export type SelectionText = {
  title: string;
  intro: string;
  stepsHead: string;
  steps: [string, string][];
  formulasHead: string;
  formulas: [string, string][];
  fullHead: string;
  full: [string, string][];
};

export const SELECTION_TEXT: Record<MethodLang, SelectionText> = {
  en: {
    title: "How we pick the top 10",
    intro: "A transparent, rules-based process: clean the data, measure each bond's chance of default year by year, then choose, for the risk band of your slider position, the 10 bonds with the highest average return.",
    stepsHead: "The process",
    steps: [
      ["Universe", "Bonds from our daily data copy in your currency and minimum order size, with a 10BONDS risk score no higher than your limit. Unscored bonds never appear."],
      ["Clean-up", "Subordinated, junior, hybrid, AT1, CoCo, Tier 1/2 and perpetual debt is removed using the seniority field of the data (the bond name is a second check), then statistical return outliers (step 2 of the formulas)."],
      ["Horizon window", "Duration within ±{window}% of your horizon, widened in half-year steps (at most 2 years) until 10 different issuers are available."],
      ["One per issuer", "Each issuer group can appear once. No more than 3 bonds come from one sector, at most 2 are rated B+ or lower, and no single bond may carry more than 25% of the list's expected loss, so the list is spread across 10 different credits."],
      ["Default probabilities", "Each bond's chance of default for every year until it matures, from long-run historical default studies for its risk level."],
      ["Optimisation", "Among all valid lists whose average risk lies in the band of your slider position, the one with the highest average return; ties go to the lowest expected loss. The average duration stays within 5% of your horizon."],
    ],
    formulasHead: "Formulas",
    formulas: [
      ["Yearly default chance", "p(t) = PD(t) − PD(t−1), with PD(t) the cumulative default rate after t years"],
      ["Outlier rule", "return > μ + {sd}·σ of comparable bonds (same currency and risk score, similar duration, at least {peers} peers, the bond itself excluded)"],
      ["Bond survival", "S = 1 − PD(T), T = years to maturity"],
      ["Probability of at least one issuer default", "P = 1 − S₁ × S₂ × … × S₁₀"],
      ["Selection", "maximise average return such that band minimum ≤ average risk ≤ band maximum; ties: minimise the expected loss"],
      ["Expected loss on your money (shown)", "(PD₁(T₁)·L₁ + … + PD₁₀(T₁₀)·L₁₀) ÷ 10, over the bonds' life; L = loss in a default by debt rank: {lgd}% senior, 75% senior non-preferred"],
      ["Return after expected losses", "y − PD(D) ÷ D × {lgd}%, D = duration (used for ties and for the 1-bond view)"],
      ["Diversification score (0–100)", "per industry and per country: H = Σ wᵢ² (wᵢ = share of the 10 bonds), score = (1 ÷ H − 1) ÷ 9 × 100; overall = average of the two. 100 = every bond in a different group, 0 = all in one; bonds with no industry or country on record count as one group"],
    ],
    fullHead: "Full explanation",
    full: [
      ["The Return & risk slider: 30 risk bands", "Position n shows the 10 bonds with the highest average return whose average 10BONDS risk score lies in band n, ends included. Position 1 is the lowest average risk the rules allow and position 30 the highest; the positions in between step up evenly. With 10 bonds the average moves in steps of 0.1. Every list has 10 different issuers, a limit per sector and an average duration within 5% of your horizon; among lists with the same return, the one with the lowest expected loss is shown. If no list of 10 exists for a band, the page says \"No portfolio for this risk level\". Every position is worked out exactly (mixed-integer optimisation) after each data update for each horizon, currency and minimum order, and stored, so it opens at once."],
      ["Debt rank and governments", "A senior non-preferred bond is rated one notch below its issuer's senior rating and loses 75% in a default; a senior bond loses {lgd}%. National governments use their own cumulative default table, also based on public historical default studies; all other issuers use the combined table."],
      ["Order of the positions", "A higher band allows riskier bonds, so the best average return normally rises from one position to the next; where a band cannot pay more than a safer one, that is simply what its limits allow, and it is shown as it is."],
      ["Why the expected loss sits next to the average risk", "A list of five very safe and five very risky bonds can have the same average risk as ten middle-risk bonds, but it is far more likely to suffer a default: default rates rise much faster than the risk score. That is why the expected loss on your money is always shown next to the average risk: the band fixes the average, the expected loss shows what that mix costs."],
      ["From yearly to lifetime probability", "For each year t the chance a bond defaults in that year is PD(t) − PD(t−1), never negative. Surviving every year until maturity has probability 1 − PD(T). Cumulative rates are read from the published years with straight-line interpolation between them and from zero at the start, extended proportionally beyond 15 years and never above 100%."],
      ["Combining bonds", "The list loses nothing only if every bond survives every year, so P = 1 − ∏(1 − PDᵢ(Tᵢ)). Bonds are treated as independent; in a systemic crisis defaults cluster, so the true chance can be higher."],
      ["How a list is built on the spot", "When no stored list applies (for example with your own exclusions), the page first shows a quick pick of 10 different issuers, highest return first, with an average risk inside the band. It then improves the list by swapping one bond at a time, accepting a swap only if the average risk stays in the band, the average return does not fall and the expected loss does not rise, with at least one of the two strictly better. When the exact solution is ready and at least as good on both counts, the list switches to it and is marked Optimal."],
      ["The two ends", "Position 1 holds the lowest-risk list the rules allow (average risk about 1.6 to 2.1 today); position 30 the highest-risk list they allow (about 4.4 to 7.9 today, depending on horizon, currency and minimum order). The band is the only risk limit on the average: the expected loss on your money is always shown next to it."],
      ["Outliers", "A return far above comparable bonds usually signals a structure the issuer's score does not describe. Comparables share currency and risk score, with duration within ±20% (at least ±1 year). The threshold k is currently {sd} standard deviations."],
      ["Market map (efficient frontier)", "The chart on the home page shows every bond by risk and return. For 4 to 6 year bonds, each risk level is represented by its 95th-percentile return and levels that pay no more than a safer level are dropped, leaving only the efficient steps where extra risk earns extra return."],
      ["Risk score", "The 1 to 10 risk score is 10BONDS' own scale. Default probabilities come from a combined average of public historical default studies, not from any single provider."],
      ["Limits", "Historical default rates are long-run averages and do not forecast a specific issuer. Returns are indicative and can be stale. The search finds a very good list but cannot test every one of the billions of possible combinations."],
    ],
  },
  it: {
    title: "Come scegliamo le 10 obbligazioni",
    intro: "Un processo trasparente e basato su regole: puliamo i dati, misuriamo anno per anno la probabilità di default di ogni obbligazione e scegliamo, per la fascia di rischio della tua posizione sul cursore, le 10 obbligazioni con il rendimento medio più alto.",
    stepsHead: "Il processo",
    steps: [
      ["Universo", "Obbligazioni della nostra copia dati giornaliera nella tua valuta e taglio minimo, con un punteggio di rischio 10BONDS non superiore al tuo limite. Le obbligazioni senza punteggio non compaiono mai."],
      ["Pulizia", "Escludiamo il debito subordinato, junior, ibrido, AT1, CoCo, Tier 1/2 e perpetuo in base al campo di anzianità dei dati (il nome dell'obbligazione è un secondo controllo), poi i rendimenti anomali (formula 2)."],
      ["Finestra di orizzonte", "Duration entro ±{window}% del tuo orizzonte, allargata di mezzo anno alla volta (massimo 2 anni) finché ci sono 10 emittenti diversi."],
      ["Un'obbligazione per emittente", "Ogni gruppo emittente compare una sola volta. Al massimo 3 obbligazioni dallo stesso settore, al massimo 2 con rating B+ o inferiore e nessuna obbligazione può pesare per più del 25% sulla perdita attesa della lista: la lista è distribuita su 10 crediti diversi."],
      ["Probabilità di default", "Per ogni obbligazione la probabilità di default anno per anno fino alla scadenza, da studi storici pubblici di lungo periodo sui default per il suo livello di rischio."],
      ["Ottimizzazione", "Tra tutte le liste valide il cui rischio medio rientra nella fascia della tua posizione, quella con il rendimento medio più alto; a parità, la perdita attesa più bassa. La duration media resta entro il 5% del tuo orizzonte."],
    ],
    formulasHead: "Formule",
    formulas: [
      ["Probabilità annua di default", "p(t) = PD(t) − PD(t−1), con PD(t) il tasso di default cumulato dopo t anni"],
      ["Regola anomalie", "rendimento > μ + {sd}·σ delle obbligazioni comparabili (stessa valuta e punteggio, duration simile, almeno {peers} comparabili, esclusa l'obbligazione stessa)"],
      ["Sopravvivenza", "S = 1 − PD(T), T = anni alla scadenza"],
      ["Probabilità di perdita della lista", "P = 1 − S₁ × S₂ × … × S₁₀"],
      ["Selezione", "massimizzare il rendimento medio con minimo della fascia ≤ rischio medio ≤ massimo della fascia; a parità: minimizzare la perdita attesa"],
      ["Perdita attesa sul capitale (mostrata)", "(PD₁(T₁)·L₁ + … + PD₁₀(T₁₀)·L₁₀) ÷ 10, sulla vita delle obbligazioni; L = perdita in caso di default per grado di debito: {lgd}% senior, 75% senior non-preferred"],
      ["Rendimento al netto delle perdite attese", "y − PD(D) ÷ D × {lgd}%, D = duration (per i pareggi e la vista 1 obbligazione)"],
      ["Punteggio di diversificazione (0–100)", "per settore e per paese: H = Σ wᵢ² (wᵢ = quota delle 10 obbligazioni), punteggio = (1 ÷ H − 1) ÷ 9 × 100; totale = media dei due. 100 = ogni obbligazione in un gruppo diverso, 0 = tutte in uno; senza settore o paese noto contano come un solo gruppo"],
    ],
    fullHead: "Spiegazione completa",
    full: [
      ["Il cursore Rendimento e rischio: 30 fasce di rischio", "La posizione n mostra le 10 obbligazioni con il rendimento medio più alto il cui punteggio di rischio 10BONDS medio rientra nella fascia n, estremi inclusi. La posizione 1 ha il rischio medio più basso consentito dalle regole e la 30 il più alto; le posizioni intermedie salgono in modo uniforme. Con 10 obbligazioni la media cambia a passi di 0,1. Ogni lista ha 10 emittenti diversi, un limite per settore e una duration media entro il 5% del tuo orizzonte; tra liste con lo stesso rendimento viene mostrata quella con la perdita attesa più bassa. Se per una fascia non esiste una lista di 10, la pagina indica «Nessun portafoglio per questo livello di rischio». Ogni posizione è calcolata in modo esatto (ottimizzazione a numeri interi) dopo ogni aggiornamento dei dati per ogni orizzonte, valuta e taglio minimo, e memorizzata, quindi si apre subito."],
      ["Grado del debito e governi", "Un'obbligazione senior non-preferred è valutata una tacca sotto il rating senior dell'emittente e perde il 75% in caso di default; una senior perde il {lgd}%. I governi nazionali usano una propria tabella di default cumulati, anch'essa basata su studi storici pubblici; tutti gli altri emittenti usano la tabella combinata."],
      ["Ordine delle posizioni", "Una fascia più alta consente obbligazioni più rischiose, quindi il rendimento medio migliore di norma sale da una posizione alla successiva; dove una fascia non può rendere di più di una più sicura, è semplicemente ciò che i suoi limiti consentono e viene mostrata così com'è."],
      ["Perché la perdita attesa è accanto al rischio medio", "Una lista di cinque obbligazioni molto sicure e cinque molto rischiose può avere lo stesso rischio medio di dieci obbligazioni a rischio intermedio, ma è molto più esposta a un default: i tassi di default crescono molto più in fretta del punteggio di rischio. Per questo la perdita attesa sul capitale è sempre mostrata accanto al rischio medio: la fascia fissa la media, la perdita attesa mostra quanto costa quella combinazione."],
      ["Da annuale a probabilità sull'intera vita", "Per ogni anno t la probabilità che un'obbligazione vada in default in quell'anno è PD(t) − PD(t−1). Sopravvivere ogni anno fino alla scadenza ha probabilità 1 − PD(T). I tassi cumulati sono letti agli anni pubblicati 1, 3, 5, 7, 10 e 15 con interpolazione lineare, estesi in proporzione oltre i 15 anni."],
      ["Combinare le obbligazioni", "La lista non perde nulla solo se ogni obbligazione sopravvive ogni anno: P = 1 − ∏(1 − PDᵢ(Tᵢ)). Le obbligazioni sono considerate indipendenti; in una crisi sistemica i default si concentrano, quindi la probabilità reale può essere più alta."],
      ["Come si costruisce una lista sul momento", "Quando non vale nessuna lista memorizzata (ad esempio con le tue esclusioni), la pagina mostra subito una scelta rapida di 10 emittenti diversi, dal rendimento più alto, con rischio medio nella fascia. Poi migliora la lista scambiando un'obbligazione alla volta, accettando lo scambio solo se il rischio medio resta nella fascia, il rendimento medio non scende e la perdita attesa non sale, con almeno uno dei due strettamente migliore. Quando la soluzione esatta è pronta e almeno altrettanto buona su entrambi i fronti, la lista passa a essa ed è indicata come Ottimale."],
      ["I due estremi", "La posizione 1 contiene la lista a rischio più basso consentita dalle regole (rischio medio circa 1,6–2,1 oggi); la posizione 30 quella a rischio più alto consentita (circa 4,4–7,9 oggi, secondo orizzonte, valuta e taglio minimo). La fascia è l'unico limite di rischio sulla media: la perdita attesa sul capitale è sempre mostrata accanto."],
      ["Anomalie", "Un rendimento molto sopra le obbligazioni comparabili di solito indica una struttura che il punteggio dell'emittente non descrive. I comparabili hanno stessa valuta e punteggio e duration entro ±20% (almeno ±1 anno). La soglia k è oggi {sd} deviazioni standard."],
      ["Mappa del mercato (frontiera efficiente)", "Il grafico in home mostra ogni obbligazione per rischio e rendimento. Per le obbligazioni a 4-6 anni ogni livello di rischio è rappresentato dal suo rendimento al 95° percentile e i livelli che non pagano più di uno più sicuro sono esclusi: restano solo i gradini efficienti in cui più rischio porta più rendimento."],
      ["Punteggio di rischio", "Il punteggio da 1 a 10 è la scala propria di 10BONDS. Le probabilità di default vengono da una media combinata di studi storici pubblici sui default, non da un singolo fornitore."],
      ["Limiti", "I tassi storici di default sono medie di lungo periodo e non prevedono il singolo emittente. I rendimenti sono indicativi e possono non essere aggiornati. La ricerca trova un'ottima lista ma non può provare ognuna dei miliardi di combinazioni possibili."],
    ],
  },
  fr: {
    title: "Comment nous choisissons les 10 obligations",
    intro: "Un processus transparent et fondé sur des règles : nous nettoyons les données, mesurons année après année la probabilité de défaut de chaque obligation, puis choisissons, pour la tranche de risque de votre position sur le curseur, les 10 obligations au rendement moyen le plus élevé.",
    stepsHead: "Le processus",
    steps: [
      ["Univers", "Obligations de notre copie de données quotidienne dans votre devise et votre montant minimum, avec un score de risque 10BONDS au plus égal à votre limite. Les obligations sans score n'apparaissent jamais."],
      ["Nettoyage", "Les dettes subordonnées, juniors, hybrides, AT1, CoCo, Tier 1/2 et perpétuelles sont exclues d'après le champ d'ancienneté des données (le nom de l'obligation sert de second contrôle), puis les rendements aberrants (formule 2)."],
      ["Fenêtre d'horizon", "Duration à ±{window} % de votre horizon, élargie par demi-années (2 ans au plus) jusqu'à 10 émetteurs différents."],
      ["Une obligation par émetteur", "Chaque groupe d'émetteurs n'apparaît qu'une fois. Au plus 3 obligations d'un même secteur, au plus 2 notées B+ ou moins, et aucune obligation ne peut porter plus de 25 % de la perte attendue de la liste : la liste est répartie sur 10 crédits différents."],
      ["Probabilités de défaut", "Pour chaque obligation, la probabilité de défaut année par année jusqu'à l'échéance, d'après des études historiques publiques de long terme pour son niveau de risque."],
      ["Optimisation", "Parmi toutes les listes valides dont le risque moyen se situe dans la tranche de votre position, celle au rendement moyen le plus élevé ; à égalité, la perte attendue la plus faible. La duration moyenne reste à 5 % de votre horizon."],
    ],
    formulasHead: "Formules",
    formulas: [
      ["Probabilité annuelle de défaut", "p(t) = PD(t) − PD(t−1), PD(t) étant le taux de défaut cumulé après t années"],
      ["Règle des valeurs aberrantes", "rendement > μ + {sd}·σ des obligations comparables (même devise et score, duration proche, au moins {peers} comparables, l'obligation elle-même exclue)"],
      ["Survie", "S = 1 − PD(T), T = années jusqu'à l'échéance"],
      ["Probabilité de perte de la liste", "P = 1 − S₁ × S₂ × … × S₁₀"],
      ["Sélection", "maximiser le rendement moyen avec minimum de la tranche ≤ risque moyen ≤ maximum de la tranche ; à égalité : minimiser la perte attendue"],
      ["Perte attendue sur votre capital (affichée)", "(PD₁(T₁)·L₁ + … + PD₁₀(T₁₀)·L₁₀) ÷ 10, sur la durée des obligations ; L = perte en cas de défaut selon le rang de la dette : {lgd} % senior, 75 % senior non préférée"],
      ["Rendement net des pertes attendues", "y − PD(D) ÷ D × {lgd} %, D = duration (pour départager et pour la vue 1 obligation)"],
      ["Score de diversification (0–100)", "par secteur et par pays : H = Σ wᵢ² (wᵢ = part des 10 obligations), score = (1 ÷ H − 1) ÷ 9 × 100 ; total = moyenne des deux. 100 = chaque obligation dans un groupe différent, 0 = toutes dans un seul ; sans secteur ou pays connu, elles comptent comme un seul groupe"],
    ],
    fullHead: "Explication complète",
    full: [
      ["Le curseur Rendement et risque : 30 tranches de risque", "La position n affiche les 10 obligations au rendement moyen le plus élevé dont le score de risque 10BONDS moyen se situe dans la tranche n, bornes incluses. La position 1 a le risque moyen le plus bas autorisé par les règles et la position 30 le plus élevé ; les positions intermédiaires montent régulièrement. Avec 10 obligations, la moyenne varie par pas de 0,1. Chaque liste compte 10 émetteurs différents, une limite par secteur et une duration moyenne à 5 % de votre horizon ; à rendement égal, la liste affichée est celle à la perte attendue la plus faible. Si aucune liste de 10 n'existe pour une tranche, la page indique « Aucun portefeuille pour ce niveau de risque ». Chaque position est calculée de façon exacte (optimisation en nombres entiers) après chaque mise à jour des données pour chaque horizon, devise et montant minimum, puis mémorisée : elle s'ouvre aussitôt."],
      ["Rang de la dette et États", "Une obligation senior non préférée est notée un cran sous la note senior de l'émetteur et perd 75 % en cas de défaut ; une obligation senior perd {lgd} %. Les États nationaux utilisent leur propre table de défauts cumulés, également fondée sur des études historiques publiques ; tous les autres émetteurs utilisent la table combinée."],
      ["Ordre des positions", "Une tranche plus haute autorise des obligations plus risquées, donc le meilleur rendement moyen augmente normalement d'une position à l'autre ; lorsqu'une tranche ne peut pas payer plus qu'une tranche plus sûre, c'est simplement ce que ses limites permettent, et elle est affichée telle quelle."],
      ["Pourquoi la perte attendue est à côté du risque moyen", "Une liste de cinq obligations très sûres et cinq très risquées peut avoir le même risque moyen que dix obligations de risque intermédiaire, mais elle est bien plus exposée à un défaut : les taux de défaut montent bien plus vite que le score de risque. C'est pourquoi la perte attendue sur votre capital est toujours affichée à côté du risque moyen : la tranche fixe la moyenne, la perte attendue montre ce que coûte cette combinaison."],
      ["De l'année à toute la durée de vie", "Pour chaque année t, la probabilité qu'une obligation fasse défaut cette année-là est PD(t) − PD(t−1). Survivre chaque année jusqu'à l'échéance a une probabilité de 1 − PD(T). Les taux cumulés sont lus aux années publiées 1, 3, 5, 7, 10 et 15 avec interpolation linéaire, prolongés proportionnellement au-delà de 15 ans."],
      ["Combiner les obligations", "La liste ne perd rien que si chaque obligation survit chaque année : P = 1 − ∏(1 − PDᵢ(Tᵢ)). Les obligations sont supposées indépendantes ; en crise systémique les défauts se regroupent, la probabilité réelle peut donc être plus élevée."],
      ["Comment une liste est construite sur le moment", "Lorsqu'aucune liste mémorisée ne s'applique (par exemple avec vos exclusions), la page affiche d'abord une sélection rapide de 10 émetteurs différents, rendement le plus élevé d'abord, avec un risque moyen dans la tranche. Elle améliore ensuite la liste en échangeant une obligation à la fois, et n'accepte un échange que si le risque moyen reste dans la tranche, que le rendement moyen ne baisse pas et que la perte attendue n'augmente pas, l'un des deux au moins étant strictement meilleur. Quand la solution exacte est prête et au moins aussi bonne sur les deux plans, la liste y passe et porte la mention Optimal."],
      ["Les deux extrémités", "La position 1 contient la liste au risque le plus bas autorisée par les règles (risque moyen d'environ 1,6 à 2,1 aujourd'hui) ; la position 30 celle au risque le plus élevé autorisé (environ 4,4 à 7,9 aujourd'hui, selon l'horizon, la devise et le montant minimum). La tranche est la seule limite de risque sur la moyenne : la perte attendue sur votre capital est toujours affichée à côté."],
      ["Valeurs aberrantes", "Un rendement très au-dessus des obligations comparables signale en général une structure que le score de l'émetteur ne décrit pas. Les comparables ont la même devise et le même score, avec une duration à ±20 % (au moins ±1 an). Le seuil k est actuellement de {sd} écarts-types."],
      ["Carte du marché (frontière efficiente)", "Le graphique de l'accueil montre chaque obligation par risque et rendement. Pour les obligations à 4-6 ans, chaque niveau de risque est représenté par son rendement au 95e centile et les niveaux qui ne paient pas plus qu'un niveau plus sûr sont retirés : il ne reste que les marches efficientes où plus de risque rapporte plus."],
      ["Score de risque", "Le score de 1 à 10 est l'échelle propre de 10BONDS. Les probabilités de défaut proviennent d'une moyenne combinée d'études historiques publiques sur les défauts, non d'un fournisseur unique."],
      ["Limites", "Les taux de défaut historiques sont des moyennes de long terme et ne prévoient pas un émetteur précis. Les rendements sont indicatifs et peuvent dater. La recherche trouve une très bonne liste mais ne peut tester chacune des milliards de combinaisons possibles."],
    ],
  },
  de: {
    title: "So wählen wir die Top 10",
    intro: "Ein transparenter, regelbasierter Prozess: Wir bereinigen die Daten, messen Jahr für Jahr die Ausfallwahrscheinlichkeit jeder Anleihe und wählen dann für das Risikoband Ihrer Reglerposition die 10 Anleihen mit der höchsten Durchschnittsrendite.",
    stepsHead: "Der Ablauf",
    steps: [
      ["Universum", "Anleihen aus unserer täglichen Datenkopie in Ihrer Währung und Mindestanlage, mit einem 10BONDS-Risikowert bis zu Ihrem Limit. Anleihen ohne Wert erscheinen nie."],
      ["Bereinigung", "Nachrangige, Junior-, Hybrid-, AT1-, CoCo-, Tier-1/2- und ewige Anleihen werden anhand des Rangfelds der Daten entfernt (der Anleihename ist eine zweite Kontrolle), danach statistische Renditeausreißer (Formel 2)."],
      ["Horizontfenster", "Duration innerhalb von ±{window} % Ihres Horizonts, in Halbjahresschritten (höchstens 2 Jahre) erweitert, bis 10 verschiedene Emittenten verfügbar sind."],
      ["Eine pro Emittent", "Jede Emittentengruppe erscheint nur einmal. Höchstens 3 Anleihen aus einem Sektor, höchstens 2 mit B+ oder schlechter, und keine Anleihe darf mehr als 25 % des erwarteten Verlusts der Liste tragen: Die Liste verteilt sich auf 10 verschiedene Schuldner."],
      ["Ausfallwahrscheinlichkeiten", "Für jede Anleihe die Ausfallwahrscheinlichkeit Jahr für Jahr bis zur Fälligkeit, aus langfristigen öffentlichen historischen Ausfallstudien für ihr Risikoniveau."],
      ["Optimierung", "Unter allen gültigen Listen, deren Durchschnittsrisiko im Band Ihrer Reglerposition liegt, die mit der höchsten Durchschnittsrendite; bei Gleichstand der niedrigste erwartete Verlust. Die durchschnittliche Duration bleibt innerhalb von 5 % Ihres Horizonts."],
    ],
    formulasHead: "Formeln",
    formulas: [
      ["Jährliche Ausfallwahrscheinlichkeit", "p(t) = PD(t) − PD(t−1), PD(t) = kumulierte Ausfallrate nach t Jahren"],
      ["Ausreißerregel", "Rendite > μ + {sd}·σ vergleichbarer Anleihen (gleiche Währung und gleicher Wert, ähnliche Duration, mindestens {peers} Vergleichsanleihen, ohne die Anleihe selbst)"],
      ["Überleben", "S = 1 − PD(T), T = Jahre bis zur Fälligkeit"],
      ["Verlustwahrscheinlichkeit der Liste", "P = 1 − S₁ × S₂ × … × S₁₀"],
      ["Auswahl", "Durchschnittsrendite maximieren mit Bandminimum ≤ Durchschnittsrisiko ≤ Bandmaximum; bei Gleichstand: erwarteten Verlust minimieren"],
      ["Erwarteter Verlust auf Ihr Geld (angezeigt)", "(PD₁(T₁)·L₁ + … + PD₁₀(T₁₀)·L₁₀) ÷ 10, über die Laufzeit der Anleihen; L = Verlust bei Ausfall nach Rang: {lgd} % Senior, 75 % Senior Non-Preferred"],
      ["Rendite nach erwarteten Verlusten", "y − PD(D) ÷ D × {lgd} %, D = Duration (für Gleichstände und die 1-Anleihe-Ansicht)"],
      ["Diversifikationswert (0–100)", "je Branche und je Land: H = Σ wᵢ² (wᵢ = Anteil der 10 Anleihen), Wert = (1 ÷ H − 1) ÷ 9 × 100; gesamt = Mittel beider. 100 = jede Anleihe in einer anderen Gruppe, 0 = alle in einer; ohne bekannte Branche oder Land zählen sie als eine Gruppe"],
    ],
    fullHead: "Vollständige Erklärung",
    full: [
      ["Der Regler Rendite und Risiko: 30 Risikobänder", "Position n zeigt die 10 Anleihen mit der höchsten Durchschnittsrendite, deren durchschnittlicher 10BONDS-Risikowert im Band n liegt, Grenzen eingeschlossen. Position 1 hat das niedrigste Durchschnittsrisiko, das die Regeln zulassen, Position 30 das höchste; die Positionen dazwischen steigen gleichmäßig. Bei 10 Anleihen ändert sich der Durchschnitt in Schritten von 0,1. Jede Liste hat 10 verschiedene Emittenten, eine Grenze je Branche und eine durchschnittliche Duration innerhalb von 5 % Ihres Horizonts; bei gleicher Rendite wird die Liste mit dem niedrigsten erwarteten Verlust gezeigt. Gibt es für ein Band keine Liste mit 10 Anleihen, steht dort „Kein Portfolio für diese Risikostufe“. Jede Position wird nach jeder Datenaktualisierung für jeden Horizont, jede Währung und Mindestanlage exakt berechnet (ganzzahlige Optimierung) und gespeichert, sie öffnet sich also sofort."],
      ["Rang der Schuld und Staaten", "Eine Senior-Non-Preferred-Anleihe wird eine Stufe unter dem Senior-Rating des Emittenten eingestuft und verliert bei Ausfall 75 %; eine Senior-Anleihe verliert {lgd} %. Nationale Staaten nutzen eine eigene Tabelle kumulierter Ausfälle, ebenfalls aus öffentlichen historischen Studien; alle anderen Emittenten die kombinierte Tabelle."],
      ["Reihenfolge der Positionen", "Ein höheres Band erlaubt riskantere Anleihen, daher steigt die beste Durchschnittsrendite normalerweise von Position zu Position; wo ein Band nicht mehr zahlen kann als ein sichereres, ist das einfach das, was seine Grenzen zulassen, und es wird so gezeigt."],
      ["Warum der erwartete Verlust neben dem Durchschnittsrisiko steht", "Eine Liste aus fünf sehr sicheren und fünf sehr riskanten Anleihen kann dasselbe Durchschnittsrisiko haben wie zehn Anleihen mittleren Risikos, ist aber viel anfälliger für einen Ausfall: Ausfallraten steigen viel schneller als der Risikowert. Deshalb steht der erwartete Verlust auf Ihr Geld immer neben dem Durchschnittsrisiko: Das Band legt den Durchschnitt fest, der erwartete Verlust zeigt, was diese Mischung kostet."],
      ["Vom Jahr zur ganzen Laufzeit", "Für jedes Jahr t ist die Wahrscheinlichkeit, dass eine Anleihe in diesem Jahr ausfällt, PD(t) − PD(t−1), nie negativ. Jedes Jahr bis zur Fälligkeit zu überleben hat die Wahrscheinlichkeit 1 − PD(T). Kumulierte Raten werden bei den veröffentlichten Jahren abgelesen, dazwischen linear interpoliert, am Anfang von null aus, über 15 Jahre hinaus proportional fortgeschrieben und nie über 100 %."],
      ["Anleihen kombinieren", "Die Liste verliert nur dann nichts, wenn jede Anleihe jedes Jahr überlebt: P = 1 − ∏(1 − PDᵢ(Tᵢ)). Die Anleihen gelten als unabhängig; in einer Systemkrise häufen sich Ausfälle, die tatsächliche Wahrscheinlichkeit kann also höher sein."],
      ["Wie eine Liste sofort aufgebaut wird", "Gilt keine gespeicherte Liste (zum Beispiel mit Ihren eigenen Ausschlüssen), zeigt die Seite zuerst eine schnelle Auswahl von 10 verschiedenen Emittenten, höchste Rendite zuerst, mit einem Durchschnittsrisiko im Band. Dann verbessert sie die Liste durch Tauschen einzelner Anleihen und akzeptiert einen Tausch nur, wenn das Durchschnittsrisiko im Band bleibt, die Durchschnittsrendite nicht sinkt und der erwartete Verlust nicht steigt, wobei mindestens eines von beiden echt besser ist. Ist die exakte Lösung fertig und in beiden Punkten mindestens so gut, wechselt die Liste zu ihr und wird als Optimal gekennzeichnet."],
      ["Die beiden Enden", "Position 1 enthält die Liste mit dem niedrigsten Risiko, das die Regeln zulassen (Durchschnittsrisiko heute etwa 1,6 bis 2,1); Position 30 die mit dem höchsten (heute etwa 4,4 bis 7,9, je nach Horizont, Währung und Mindestanlage). Das Band ist die einzige Risikogrenze für den Durchschnitt: Der erwartete Verlust auf Ihr Geld steht immer daneben."],
      ["Ausreißer", "Eine Rendite weit über vergleichbaren Anleihen deutet meist auf eine Struktur hin, die der Wert des Emittenten nicht beschreibt. Vergleichsanleihen haben dieselbe Währung und denselben Wert, mit Duration innerhalb von ±20 % (mindestens ±1 Jahr). Der Schwellenwert k liegt derzeit bei {sd} Standardabweichungen."],
      ["Marktkarte (Effizienzgrenze)", "Das Diagramm auf der Startseite zeigt jede Anleihe nach Risiko und Rendite. Für 4- bis 6-jährige Anleihen steht jedes Risikoniveau für seine Rendite am 95. Perzentil; Niveaus, die nicht mehr zahlen als ein sichereres, entfallen. Übrig bleiben nur die Pareto-effizienten Stufen, auf denen mehr Risiko mehr Rendite bringt."],
      ["Risikowert", "Der Risikowert von 1 bis 10 ist die eigene Skala von 10BONDS. Die Ausfallwahrscheinlichkeiten stammen aus einem kombinierten Durchschnitt öffentlicher historischer Ausfallstudien, nicht von einem einzelnen Anbieter."],
      ["Grenzen", "Historische Ausfallraten sind langfristige Durchschnitte und sagen keinen einzelnen Emittenten voraus. Renditen sind indikativ und können veraltet sein. Die Suche findet eine sehr gute Liste, kann aber nicht jede der Milliarden möglichen Kombinationen prüfen."],
    ],
  },
};
