import type { Locale } from "./locales";

// Fixed text of the language home pages, hubs and methodology. Market data never appears here: it comes from the
// database at render time, with its date.

type Home = {
  title: string; description: string; h1: string; lead: string; points: [string, string, string];
  govId: string; govTitle: string; compareTitle: string; guidesTitle: string;
  plansTitle: string; plans: { name: string; price: string; text: string }[]; plansLink: string;
};

export const HOME: Record<Locale, Home> = {
  it: {
    title: "10BONDS · Trova le migliori obbligazioni in pochi secondi",
    description: "Scegli durata e rendimento obiettivo: 10BONDS confronta migliaia di obbligazioni in euro, BTP compresi, e ti mostra le 10 più adatte. Dati aggiornati ogni giorno.",
    h1: "Trova le migliori obbligazioni in pochi secondi",
    lead: "Scegli una duration e un rendimento obiettivo: 10BONDS confronta migliaia di obbligazioni in euro, BTP e corporate, e ti mostra le 10 più vicine, una per emittente.",
    points: ["Rendimento a scadenza, duration e rischio in un'unica lista.", "BTP, titoli di Stato europei e obbligazioni societarie a confronto.", "Dati aggiornati ogni giorno, con la data sempre in vista."],
    govId: "gov-it", govTitle: "I BTP oggi", compareTitle: "Confronta le obbligazioni", guidesTitle: "Guide per capire i numeri",
    plansTitle: "Piani", plans: [
      { name: "Gratis", price: "0 €", text: "Con un account: 10 ricerche di singole obbligazioni e 3 di portafoglio a settimana, la top 10 completa con emittente, rendimento, rischio e duration." },
      { name: "Plus", price: "9 € al mese o 86,40 € all'anno", text: "Codici ISIN visibili, ricerche illimitate, nome, cedola e scadenza di ogni obbligazione, medie della lista." },
      { name: "Premium", price: "19 € al mese o 182,40 € all'anno", text: "Tutto Plus, più avvisi via e-mail sui cambiamenti, ricerche salvate e analisi del rischio." },
      { name: "Pro", price: "89 € al mese o 854,40 € all'anno", text: "Solo per professionisti: analisi del portafoglio dei clienti e suggerimenti di sostituzione per aumentare il rendimento." },
    ], plansLink: "Dettagli dei piani",
  },
  fr: {
    title: "10BONDS · Comparez les obligations par rendement et risque",
    description: "Choisissez un horizon et un rendement cible : 10BONDS compare des milliers d'obligations en euros, OAT comprises, et affiche les 10 plus adaptées. Données quotidiennes.",
    h1: "Comparez les obligations selon leur rendement et leur risque",
    lead: "Choisissez une duration et un rendement cible : 10BONDS compare des milliers d'obligations en euros, OAT, emprunts d'État européens et obligations d'entreprise, et affiche les 10 plus proches, une par émetteur.",
    points: ["Rendement à l'échéance, duration et risque dans une seule liste.", "OAT, Bund, BTP et obligations d'entreprise comparés sur les mêmes critères.", "Données mises à jour chaque jour, toujours datées."],
    govId: "gov-fr", govTitle: "Les OAT aujourd'hui", compareTitle: "Comparer les obligations", guidesTitle: "Guides pour comprendre les chiffres",
    plansTitle: "Offres", plans: [
      { name: "Gratuit", price: "0 €", text: "Avec un compte : 10 recherches d'obligation et 3 recherches de portefeuille par semaine, le top 10 complet avec émetteur, rendement, risque et duration." },
      { name: "Plus", price: "9 € par mois ou 86,40 € par an", text: "Codes ISIN visibles, recherches illimitées, nom, coupon et échéance de chaque obligation, moyennes de la liste." },
      { name: "Premium", price: "19 € par mois ou 182,40 € par an", text: "Tout Plus, avec des alertes par e-mail sur les changements, des recherches enregistrées et l'analyse du risque." },
      { name: "Pro", price: "89 € par mois ou 854,40 € par an", text: "Réservé aux professionnels : analyse des portefeuilles clients et suggestions d'échanges pour augmenter le rendement." },
    ], plansLink: "Détail des offres",
  },
  de: {
    title: "10BONDS · Anleihen nach Rendite und Risiko vergleichen",
    description: "Wählen Sie Laufzeit und Zielrendite: 10BONDS vergleicht Tausende Euro-Anleihen, Bundesanleihen eingeschlossen, und zeigt die 10 passendsten. Täglich aktualisierte Daten.",
    h1: "Finden und vergleichen Sie Anleihen nach Rendite und Risiko",
    lead: "Wählen Sie eine Duration und eine Zielrendite: 10BONDS vergleicht Tausende Euro-Anleihen, Bundesanleihen, europäische Staatsanleihen und Unternehmensanleihen, und zeigt die 10 passendsten, eine je Emittent.",
    points: ["Rendite bis Fälligkeit, Duration und Risiko in einer Liste.", "Bundesanleihen, OAT, BTP und Unternehmensanleihen nach denselben Kriterien.", "Täglich aktualisierte Daten, immer mit Datum."],
    govId: "gov-de", govTitle: "Bundesanleihen heute", compareTitle: "Anleihen vergleichen", guidesTitle: "Ratgeber zu den Kennzahlen",
    plansTitle: "Tarife", plans: [
      { name: "Kostenlos", price: "0 €", text: "Mit Konto: 10 Einzelanleihe- und 3 Portfolio-Suchen pro Woche, die komplette Top 10 mit Emittent, Rendite, Risiko und Duration." },
      { name: "Plus", price: "9 € im Monat oder 86,40 € im Jahr", text: "ISIN sichtbar, unbegrenzte Suchen, Name, Kupon und Fälligkeit jeder Anleihe, Durchschnittswerte der Liste." },
      { name: "Premium", price: "19 € im Monat oder 182,40 € im Jahr", text: "Alles aus Plus, dazu E-Mail-Hinweise bei Änderungen, gespeicherte Suchen und Risikoanalysen." },
      { name: "Pro", price: "89 € im Monat oder 854,40 € im Jahr", text: "Nur für Profis: Analyse von Kundenportfolios und Tauschvorschläge für mehr Rendite." },
    ], plansLink: "Tarife im Detail",
  },
};

type Hub = { title: string; description: string; h1: string; lead: string };
export const GUIDES_HUB: Record<Locale, Hub> = {
  it: { title: "Guide alle obbligazioni · 10BONDS", description: "Guide pratiche in italiano su BTP, rendimento a scadenza, duration, rating e rischio di credito delle obbligazioni in euro.", h1: "Guide alle obbligazioni", lead: "Spiegazioni chiare dei numeri che contano quando scegli un'obbligazione: rendimento, duration, rating e rischio." },
  fr: { title: "Guides obligataires · 10BONDS", description: "Guides pratiques en français sur les OAT, le rendement à l'échéance, la duration, la notation et le risque de crédit.", h1: "Guides pour investir en obligations", lead: "Des explications claires sur les chiffres qui comptent : rendement, duration, notation et risque." },
  de: { title: "Anleihen-Ratgeber · 10BONDS", description: "Ratgeber auf Deutsch zu Bundesanleihen, Rendite bis Fälligkeit, Duration, Rating und Kreditrisiko.", h1: "Ratgeber für Anleihen", lead: "Klare Erklärungen zu den Kennzahlen, auf die es ankommt: Rendite, Duration, Rating und Risiko." },
};
export const BONDS_HUB: Record<Locale, Hub> = {
  it: { title: "Obbligazioni a confronto: BTP, corporate, scadenze · 10BONDS", description: "Confronta obbligazioni in euro per tipo di emittente, rischio, rendimento, duration e scadenza. Dati aggiornati ogni giorno.", h1: "Obbligazioni a confronto", lead: "Pagine di confronto costruite sui nostri dati giornalieri: scegli un tema, poi usa lo strumento per la tua selezione." },
  fr: { title: "Comparatifs d'obligations : OAT, entreprises, échéances · 10BONDS", description: "Comparez les obligations en euros par type d'émetteur, risque, rendement, duration et échéance. Données quotidiennes.", h1: "Comparatifs d'obligations", lead: "Des comparatifs construits sur nos données quotidiennes : choisissez un thème, puis utilisez l'outil pour votre sélection." },
  de: { title: "Anleihen im Vergleich: Bund, Unternehmen, Laufzeiten · 10BONDS", description: "Vergleichen Sie Euro-Anleihen nach Emittent, Risiko, Rendite, Duration und Fälligkeit. Täglich aktualisierte Daten.", h1: "Anleihen im Vergleich", lead: "Vergleichsseiten auf Basis unserer täglichen Daten: Wählen Sie ein Thema und nutzen Sie dann den Anleihen-Finder für Ihre Auswahl." },
};
export const TEAM: Record<Locale, Hub & { empty: string; credentials: string; verified: string }> = {
  it: { title: "Redazione · 10BONDS", description: "Chi scrive e rivede le guide e le pagine di 10BONDS.", h1: "Redazione", lead: "Le persone che scrivono e rivedono i contenuti di 10BONDS.", empty: "I profili della redazione saranno pubblicati a breve.", credentials: "Qualifiche", verified: "Qualifiche verificate da 10BONDS" },
  fr: { title: "Rédaction · 10BONDS", description: "Qui écrit et relit les guides et les pages de 10BONDS.", h1: "Rédaction", lead: "Les personnes qui écrivent et relisent les contenus de 10BONDS.", empty: "Les profils de la rédaction seront publiés prochainement.", credentials: "Qualifications", verified: "Qualifications vérifiées par 10BONDS" },
  de: { title: "Redaktion · 10BONDS", description: "Wer die Ratgeber und Seiten von 10BONDS schreibt und prüft.", h1: "Redaktion", lead: "Die Menschen, die die Inhalte von 10BONDS schreiben und prüfen.", empty: "Die Profile der Redaktion werden in Kürze veröffentlicht.", credentials: "Qualifikationen", verified: "Von 10BONDS geprüfte Qualifikationen" },
};

type Method = { title: string; description: string; h1: string; lead: string; sections: { id: string; h2: string; paras: string[] }[] };
export const METHOD: Record<Locale, Method> = {
  it: {
    title: "Metodologia: come selezioniamo le obbligazioni · 10BONDS",
    description: "Come 10BONDS seleziona e ordina le obbligazioni: fonti dei dati, calcolo di rendimento e duration, regole di esclusione e limiti.",
    h1: "Metodologia",
    lead: "Come scegliamo le obbligazioni che vedi, da dove arrivano i dati e cosa non possiamo garantire.",
    sections: [
      { id: "ranking", h2: "Come funziona la classifica", paras: [
        "Indichi due criteri: una duration e un rendimento a scadenza obiettivo. Prendiamo le obbligazioni in euro con duration entro il ±20% di quella scelta (per 13 anni: da 10,4 a 15,6), allargando la finestra di mezzo anno alla volta finché ci sono almeno 10 emittenti diversi.",
        "Tra queste scegliamo 10 obbligazioni, una per emittente, con il miglior rendimento al netto delle perdite attese: il rendimento meno il tasso storico annuo di default del rating (medie di lungo periodo basate su studi storici pubblici sui default, per la stessa durata) moltiplicato per una perdita del 60% in caso di default. Sotto il massimo scegliamo il rischio medio più basso che raggiunge ancora il tuo obiettivo: un obiettivo più basso dà una lista più sicura. A parità di rischio vince il rendimento netto più alto. Il rendimento medio raggiunge almeno il tuo obiettivo e la duration media resta vicina a quella scelta. Con il terzo cursore scegli il rischio massimo che accetti, da 1 (più basso) a 10 (più alto).",
        "Il rendimento massimo che puoi chiedere per ogni duration è la media dei 10 emittenti con il rendimento più alto: oltre quel valore nessuna lista di 10 obbligazioni potrebbe raggiungerlo.",
      ] },
      { id: "sources", h2: "Fonti dei dati", paras: [
        "Ogni giorno il sistema dati di 10BONDS calcola rendimenti e duration a partire dai prezzi di mercato delle obbligazioni e ne copia il risultato in un database separato, che questo sito legge in sola lettura. Ogni pagina mostra la data dei dati.",
        "Il rischio da 1 (più basso) a 10 (più alto) è una valutazione interna di 10BONDS, solo a titolo informativo: non è un rating di credito. Verifica sempre i rating ufficiali presso le agenzie di rating, l'emittente e il tuo consulente finanziario.",
      ] },
      { id: "calculations", h2: "Calcoli", paras: [
        "Il rendimento a scadenza è lordo: è il tasso che rende il prezzo di oggi uguale al valore attuale di cedole e rimborso, nell'ipotesi che l'obbligazione sia tenuta fino alla scadenza e che l'emittente paghi tutto. La duration è la duration modificata, cioè la variazione percentuale approssimativa del prezzo per un punto percentuale di variazione dei tassi.",
        "Nelle pagine di confronto distinguiamo Stati, agenzie e aziende in base al nome dell'emittente; il Paese è quello della sede dell'emittente indicato nei dati.",
      ] },
      { id: "exclusions", h2: "Cosa escludiamo", paras: [
        "Obbligazioni senza valutazione del rischio o in insolvenza, non in euro, già scadute, senza rendimento o duration, con prezzi fermi da più di 10 giorni rispetto al resto dei dati, e strutture che il nostro sistema non modella in modo affidabile (indicizzate all'inflazione, a tasso variabile, con cedole crescenti).",
      ] },
      { id: "limits", h2: "Limiti e rischi", paras: [
        "I dati possono contenere errori o ritardi: verifica sempre prezzo e rendimento con la tua banca o il tuo broker prima di operare. 10BONDS è uno strumento di ricerca e confronto: non conosce la tua situazione e non fornisce consulenza né raccomandazioni personalizzate. Le obbligazioni possono perdere valore e gli emittenti possono non rimborsare.",
      ] },
    ],
  },
  fr: {
    title: "Méthodologie : comment nous sélectionnons les obligations · 10BONDS",
    description: "Comment 10BONDS sélectionne et classe les obligations : sources des données, calcul du rendement et de la duration, exclusions et limites.",
    h1: "Méthodologie",
    lead: "Comment nous choisissons les obligations affichées, d'où viennent les données et ce que nous ne pouvons pas garantir.",
    sections: [
      { id: "ranking", h2: "Comment fonctionne le classement", paras: [
        "Vous indiquez deux critères : une duration et un rendement à l'échéance cible. Nous retenons les obligations en euros dont la duration est à ±20 % de votre choix (pour 13 ans : de 10,4 à 15,6), en élargissant la fenêtre d'une demi-année à la fois jusqu'à réunir au moins 10 émetteurs différents.",
        "Parmi elles, nous choisissons 10 obligations, une par émetteur, au meilleur rendement net des pertes attendues : le rendement moins le taux historique annuel de défaut de la note (moyennes de long terme d'après les études historiques publiques sur les défauts, pour la même durée) multiplié par une perte de 60 % en cas de défaut. Sous le maximum, nous retenons le risque moyen le plus faible qui atteint encore votre objectif : un objectif plus bas donne une liste plus sûre. À risque égal, le meilleur rendement net l'emporte. Le rendement moyen atteint au moins votre objectif et la duration moyenne reste proche de votre choix. Le troisième curseur fixe le risque maximal accepté, de 1 (le plus faible) à 10 (le plus élevé).",
        "Le rendement maximal que vous pouvez demander pour chaque duration est la moyenne des 10 émetteurs les mieux rémunérés : au-delà, aucune liste de 10 obligations ne pourrait l'atteindre.",
      ] },
      { id: "sources", h2: "Sources des données", paras: [
        "Chaque jour, le système de données de 10BONDS calcule rendements et durations à partir des prix de marché des obligations et copie le résultat dans une base séparée, que ce site lit en lecture seule. Chaque page indique la date des données.",
        "Le risque de 1 (le plus faible) à 10 (le plus élevé) est une évaluation interne de 10BONDS, à titre informatif uniquement : ce n'est pas une notation de crédit. Vérifiez toujours les notations officielles auprès des agences de notation, de l'émetteur et de votre conseiller financier.",
      ] },
      { id: "calculations", h2: "Calculs", paras: [
        "Le rendement à l'échéance est brut : c'est le taux qui égalise le prix actuel et la valeur actualisée des coupons et du remboursement, en supposant que l'obligation est conservée jusqu'à l'échéance et que l'émetteur paie tout. La duration est la duration modifiée, c'est-à-dire la variation approximative du prix, en pourcentage, pour une variation des taux d'un point.",
        "Dans les comparatifs, nous distinguons États, agences et entreprises d'après le nom de l'émetteur ; le pays est celui du siège de l'émetteur indiqué dans les données.",
      ] },
      { id: "exclusions", h2: "Ce que nous excluons", paras: [
        "Les obligations sans évaluation du risque ou en défaut, non libellées en euros, échues, sans rendement ou duration, dont le prix n'a pas bougé depuis plus de 10 jours par rapport au reste des données, et les structures que notre système ne modélise pas de façon fiable (indexées sur l'inflation, à taux variable, à coupons progressifs).",
      ] },
      { id: "limits", h2: "Limites et risques", paras: [
        "Les données peuvent comporter des erreurs ou des retards : vérifiez toujours prix et rendement auprès de votre banque ou courtier avant d'agir. 10BONDS est un outil de recherche et de comparaison : il ne connaît pas votre situation et ne fournit ni conseil en investissement ni recommandation personnalisée. Une obligation peut perdre de la valeur et un émetteur peut faire défaut.",
      ] },
    ],
  },
  de: {
    title: "Methodik: So wählen wir Anleihen aus · 10BONDS",
    description: "Wie 10BONDS Anleihen auswählt und sortiert: Datenquellen, Berechnung von Rendite und Duration, Ausschlüsse und Grenzen.",
    h1: "Methodik",
    lead: "Wie wir die angezeigten Anleihen auswählen, woher die Daten stammen und was wir nicht garantieren können.",
    sections: [
      { id: "ranking", h2: "So funktioniert die Auswahl", paras: [
        "Sie geben zwei Kriterien vor: eine Duration und eine Zielrendite bis Fälligkeit. Wir nehmen Euro-Anleihen mit einer Duration innerhalb von ±20 % Ihrer Wahl (bei 13 Jahren: 10,4 bis 15,6), und erweitern das Fenster in Halbjahresschritten, bis mindestens 10 verschiedene Emittenten enthalten sind.",
        "Daraus wählen wir 10 Anleihen, eine je Emittent, mit der besten Rendite nach erwarteten Verlusten: Rendite minus historische jährliche Ausfallrate des Ratings (langfristige Durchschnitte öffentlicher historischer Ausfallstudien für dieselbe Laufzeit) mal 60 % Verlust bei Ausfall. Unterhalb des Maximums wählen wir das geringste durchschnittliche Risiko, das Ihr Ziel noch erreicht: Ein niedrigeres Ziel ergibt eine sicherere Liste. Bei gleichem Risiko gewinnt die höhere Nettorendite. Die Durchschnittsrendite erreicht mindestens Ihr Ziel und die durchschnittliche Duration bleibt nahe Ihrer Wahl. Mit dem dritten Regler wählen Sie das höchste akzeptierte Risiko, von 1 (am niedrigsten) bis 10 (am höchsten).",
        "Die höchste wählbare Zielrendite je Duration ist der Durchschnitt der 10 renditestärksten Emittenten: Darüber könnte keine Liste aus 10 Anleihen das Ziel erreichen.",
      ] },
      { id: "sources", h2: "Datenquellen", paras: [
        "Das Datensystem von 10BONDS berechnet täglich Renditen und Durationen aus Marktpreisen und kopiert das Ergebnis in eine separate Datenbank, die diese Website nur lesen kann. Jede Seite zeigt den Datenstand.",
        "Das Risiko von 1 (am geringsten) bis 10 (am höchsten) ist eine interne Einschätzung von 10BONDS, nur zur Information: Es ist kein Kreditrating. Prüfen Sie offizielle Ratings immer bei den Ratingagenturen, beim Emittenten und bei Ihrem Finanzberater.",
      ] },
      { id: "calculations", h2: "Berechnungen", paras: [
        "Die Rendite bis Fälligkeit ist brutto: der Zinssatz, bei dem der heutige Kurs dem Barwert von Kupons und Rückzahlung entspricht, unter der Annahme, dass die Anleihe bis zur Fälligkeit gehalten wird und der Emittent alles zahlt. Die Duration ist die modifizierte Duration, also die ungefähre prozentuale Kursänderung bei einer Zinsänderung um einen Prozentpunkt.",
        "Auf den Vergleichsseiten unterscheiden wir Staaten, Förderbanken und Unternehmen anhand des Emittentennamens; das Land ist der in den Daten angegebene Sitz des Emittenten.",
      ] },
      { id: "exclusions", h2: "Was wir ausschließen", paras: [
        "Anleihen ohne Risikobewertung oder im Zahlungsausfall, nicht in Euro, bereits fällig, ohne Rendite oder Duration, mit Kursen, die mehr als 10 Tage hinter den übrigen Daten zurückliegen, sowie Strukturen, die unser System nicht verlässlich abbildet (inflationsindexiert, variabel verzinst, mit steigenden Kupons).",
      ] },
      { id: "limits", h2: "Grenzen und Risiken", paras: [
        "Die Daten können Fehler oder Verzögerungen enthalten: Prüfen Sie Kurs und Rendite vor jeder Order bei Ihrer Bank oder Ihrem Broker. 10BONDS ist ein Recherche- und Vergleichswerkzeug: Es kennt Ihre Situation nicht und bietet keine Anlageberatung oder persönliche Empfehlung. Anleihen können an Wert verlieren, Emittenten können ausfallen.",
      ] },
    ],
  },
};
