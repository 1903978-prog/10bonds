/** The Disclaimer page (/disclaimer), in the four site languages. The binding text is in the Terms (lib/terms.ts). */
export type DisclaimerLang = "en" | "it" | "fr" | "de";
export type DisclaimerSection = { id?: string; title: string; paragraphs: string[] };
export type Disclaimer = { title: string; intro: string; sections: DisclaimerSection[]; full: string; terms: string };

export const DISCLAIMER_LANGS: DisclaimerLang[] = ["en", "it", "fr", "de"];

export function disclaimerLang(v: string | string[] | undefined): DisclaimerLang {
  const s = Array.isArray(v) ? v[0] : v;
  return DISCLAIMER_LANGS.includes(s as DisclaimerLang) ? (s as DisclaimerLang) : "en";
}

export const DISCLAIMER: Record<DisclaimerLang, Disclaimer> = {
  en: {
    title: "Disclaimer",
    intro:
      "10BONDS, operated by SQUARE ONE OÜ (Estonia), is a bond discovery and ranking tool. Everything it shows is general information, offered as it is, to help you research. It is not built for trading and is not financial, investment, tax, legal or accounting advice.",
    sections: [
      {
        title: "Not advice, not a broker",
        paragraphs: [
          "10BONDS and SQUARE ONE OÜ are not investment advisers, financial advisers, brokers or banks. No list, ranking or figure is a recommendation, offer or invitation to buy, sell or keep any bond or other financial product, and we express no view on whether any investment is wise or suitable. Showing a bond is not an endorsement of it or of its issuer.",
        ],
      },
      {
        title: "Your decision, your responsibility",
        paragraphs: [
          "A bond shown here may not fit your profile, goals or expectations. Only you can judge whether it suits your situation, time horizon and appetite for risk. Do not use 10BONDS as the only basis for an investment decision. SQUARE ONE OÜ accepts no liability for any loss arising from investments or trades in the products mentioned.",
        ],
      },
      {
        title: "Data: previous day, not real time",
        paragraphs: [
          "Our data is refreshed once a night from third-party and public sources. It is not live and usually reflects prices at the close of the previous trading day, or earlier. We do not check the data and have no duty to do so. It may be incomplete, delayed, interrupted or wrong, and we make no promise about its accuracy or completeness. Always confirm the price with your broker or bank before you trade.",
        ],
      },
      {
        title: "Filters and brokers",
        paragraphs: [
          "Filters and results are provided as they are, for information only. 10BONDS is not affiliated with, and is not paid by, any broker or bank. We do not guarantee that a bond listed here can be bought through any particular broker, or that you are eligible to buy it.",
        ],
      },
      {
        id: "risk-score",
        title: "The risk score is not a credit rating",
        paragraphs: [
          "The risk score from 1 (lowest) to 10 (highest) is 10BONDS' own internal assessment, provided for information only. It is not a credit rating, is not an average of agency ratings, and 10BONDS is not a credit rating agency. It suggests no strategy. Check official ratings with the rating agencies, the issuer and your financial adviser, and do not rely on the 10BONDS risk score.",
        ],
      },
      {
        title: "No execution",
        paragraphs: ["10BONDS does not hold money, place orders or manage portfolios."],
      },
    ],
    full: "Full text:",
    terms: "Terms of Use and Risk Disclosure",
  },
  it: {
    title: "Avvertenze",
    intro:
      "10BONDS, gestito da SQUARE ONE OÜ (Estonia), è uno strumento per trovare e ordinare obbligazioni. Tutto ciò che mostra è informazione generale, fornita così com'è, per aiutarti nelle tue ricerche. Non è pensato per fare trading e non è consulenza finanziaria, di investimento, fiscale, legale o contabile.",
    sections: [
      {
        title: "Non è consulenza, non è un broker",
        paragraphs: [
          "10BONDS e SQUARE ONE OÜ non sono consulenti finanziari o di investimento, broker né banche. Nessuna lista, classifica o cifra è una raccomandazione, un'offerta o un invito a comprare, vendere o tenere un'obbligazione o altro prodotto finanziario, e non esprimiamo alcun parere sull'opportunità o adeguatezza di un investimento. Mostrare un'obbligazione non significa approvarla né approvare il suo emittente.",
        ],
      },
      {
        title: "La decisione è tua",
        paragraphs: [
          "Un'obbligazione mostrata qui può non essere adatta al tuo profilo, ai tuoi obiettivi o alle tue aspettative. Solo tu puoi valutare se è adatta alla tua situazione, al tuo orizzonte temporale e alla tua propensione al rischio. Non usare 10BONDS come unica base per una decisione di investimento. SQUARE ONE OÜ non risponde di alcuna perdita derivante da investimenti o operazioni sui prodotti citati.",
        ],
      },
      {
        title: "Dati: del giorno prima, non in tempo reale",
        paragraphs: [
          "I dati vengono aggiornati una volta per notte da fonti terze e pubbliche. Non sono in tempo reale e di solito riflettono i prezzi alla chiusura della seduta precedente, o anteriori. Non verifichiamo i dati e non abbiamo alcun obbligo di farlo. Possono essere incompleti, in ritardo, interrotti o errati, e non garantiamo che siano esatti o completi. Verifica sempre il prezzo con il tuo broker o la tua banca prima di operare.",
        ],
      },
      {
        title: "Filtri e broker",
        paragraphs: [
          "Filtri e risultati sono forniti così come sono, solo a scopo informativo. 10BONDS non è affiliato a nessun broker o banca e non ne riceve compensi. Non garantiamo che un'obbligazione presente qui sia acquistabile presso un determinato broker, né che tu possa acquistarla.",
        ],
      },
      {
        id: "risk-score",
        title: "Il rischio non è un rating",
        paragraphs: [
          "Il rischio da 1 (più basso) a 10 (più alto) è una valutazione interna di 10BONDS, solo informativa. Non è un rating di credito né una media dei rating delle agenzie, e 10BONDS non è un'agenzia di rating. Non suggerisce alcuna strategia. Verifica i rating ufficiali con le agenzie di rating, l'emittente e il tuo consulente finanziario, e non fare affidamento sul rischio di 10BONDS.",
        ],
      },
      {
        title: "Nessuna esecuzione",
        paragraphs: ["10BONDS non detiene denaro, non esegue ordini e non gestisce portafogli."],
      },
    ],
    full: "Testo completo (in inglese):",
    terms: "Termini d'uso e informativa sui rischi",
  },
  fr: {
    title: "Avertissement",
    intro:
      "10BONDS, exploité par SQUARE ONE OÜ (Estonie), est un outil de recherche et de classement d'obligations. Tout ce qu'il affiche est une information générale, fournie en l'état, pour vous aider dans vos recherches. Il n'est pas conçu pour le trading et ne constitue pas un conseil financier, d'investissement, fiscal, juridique ou comptable.",
    sections: [
      {
        title: "Ni conseil, ni courtier",
        paragraphs: [
          "10BONDS et SQUARE ONE OÜ ne sont ni conseillers en investissement ou financiers, ni courtiers, ni banques. Aucune liste, aucun classement ni aucun chiffre n'est une recommandation, une offre ou une invitation à acheter, vendre ou conserver une obligation ou un autre produit financier, et nous n'émettons aucun avis sur l'opportunité ou l'adéquation d'un investissement. Afficher une obligation ne revient pas à la cautionner, ni son émetteur.",
        ],
      },
      {
        title: "Votre décision, votre responsabilité",
        paragraphs: [
          "Une obligation affichée ici peut ne pas convenir à votre profil, à vos objectifs ou à vos attentes. Vous seul pouvez juger si elle correspond à votre situation, à votre horizon et à votre goût du risque. N'utilisez pas 10BONDS comme seule base d'une décision d'investissement. SQUARE ONE OÜ décline toute responsabilité pour les pertes liées à des investissements ou opérations sur les produits mentionnés.",
        ],
      },
      {
        title: "Données : de la veille, pas en temps réel",
        paragraphs: [
          "Nos données sont mises à jour une fois par nuit à partir de sources tierces et publiques. Elles ne sont pas en temps réel et reflètent en général les prix à la clôture de la séance précédente, ou plus anciens. Nous ne vérifions pas les données et n'en avons aucune obligation. Elles peuvent être incomplètes, retardées, interrompues ou erronées, et nous ne garantissons ni leur exactitude ni leur exhaustivité. Vérifiez toujours le prix auprès de votre courtier ou de votre banque avant d'agir.",
        ],
      },
      {
        title: "Filtres et courtiers",
        paragraphs: [
          "Les filtres et les résultats sont fournis en l'état, à titre informatif uniquement. 10BONDS n'est affilié à aucun courtier ni à aucune banque et n'en reçoit aucune rémunération. Nous ne garantissons pas qu'une obligation affichée ici soit disponible chez un courtier donné, ni que vous puissiez l'acheter.",
        ],
      },
      {
        id: "risk-score",
        title: "Le risque n'est pas une notation",
        paragraphs: [
          "Le risque de 1 (le plus faible) à 10 (le plus élevé) est une évaluation interne de 10BONDS, à titre informatif uniquement. Ce n'est pas une notation de crédit ni une moyenne des notations des agences, et 10BONDS n'est pas une agence de notation. Il ne suggère aucune stratégie. Vérifiez les notations officielles auprès des agences de notation, de l'émetteur et de votre conseiller financier, et ne vous fiez pas au risque de 10BONDS.",
        ],
      },
      {
        title: "Aucune exécution",
        paragraphs: ["10BONDS ne détient pas d'argent, ne passe pas d'ordres et ne gère pas de portefeuilles."],
      },
    ],
    full: "Texte complet (en anglais) :",
    terms: "Conditions d'utilisation et avertissement sur les risques",
  },
  de: {
    title: "Haftungsausschluss",
    intro:
      "10BONDS, betrieben von der SQUARE ONE OÜ (Estland), ist ein Werkzeug zum Finden und Sortieren von Anleihen. Alles, was es zeigt, ist allgemeine Information, so bereitgestellt, wie sie ist, als Hilfe bei Ihrer Recherche. Es ist nicht für den Handel gedacht und keine Finanz-, Anlage-, Steuer-, Rechts- oder Buchhaltungsberatung.",
    sections: [
      {
        title: "Keine Beratung, kein Broker",
        paragraphs: [
          "10BONDS und die SQUARE ONE OÜ sind weder Anlage- oder Finanzberater noch Broker oder Banken. Keine Liste, keine Rangfolge und keine Zahl ist eine Empfehlung, ein Angebot oder eine Aufforderung, eine Anleihe oder ein anderes Finanzprodukt zu kaufen, zu verkaufen oder zu halten, und wir äußern keine Meinung dazu, ob eine Anlage sinnvoll oder geeignet ist. Dass eine Anleihe angezeigt wird, ist keine Befürwortung der Anleihe oder ihres Emittenten.",
        ],
      },
      {
        title: "Ihre Entscheidung, Ihre Verantwortung",
        paragraphs: [
          "Eine hier gezeigte Anleihe passt möglicherweise nicht zu Ihrem Profil, Ihren Zielen oder Erwartungen. Nur Sie können beurteilen, ob sie zu Ihrer Lage, Ihrem Anlagehorizont und Ihrer Risikobereitschaft passt. Nutzen Sie 10BONDS nicht als einzige Grundlage für eine Anlageentscheidung. Die SQUARE ONE OÜ haftet nicht für Verluste aus Anlagen oder Geschäften in den genannten Produkten.",
        ],
      },
      {
        title: "Daten: vom Vortag, nicht in Echtzeit",
        paragraphs: [
          "Unsere Daten werden einmal pro Nacht aus Drittquellen und öffentlichen Quellen aktualisiert. Sie sind nicht in Echtzeit und zeigen in der Regel die Kurse zum Schluss des vorherigen Handelstags oder ältere. Wir prüfen die Daten nicht und sind dazu nicht verpflichtet. Sie können unvollständig, verzögert, unterbrochen oder falsch sein, und wir übernehmen keine Gewähr für ihre Richtigkeit oder Vollständigkeit. Prüfen Sie den Kurs immer bei Ihrem Broker oder Ihrer Bank, bevor Sie handeln.",
        ],
      },
      {
        title: "Filter und Broker",
        paragraphs: [
          "Filter und Ergebnisse werden so bereitgestellt, wie sie sind, nur zur Information. 10BONDS ist mit keinem Broker und keiner Bank verbunden und wird von ihnen nicht bezahlt. Wir garantieren nicht, dass eine hier gezeigte Anleihe bei einem bestimmten Broker erhältlich ist oder dass Sie sie kaufen dürfen.",
        ],
      },
      {
        id: "risk-score",
        title: "Das Risiko ist kein Rating",
        paragraphs: [
          "Das Risiko von 1 (am geringsten) bis 10 (am höchsten) ist eine interne Einschätzung von 10BONDS, nur zur Information. Es ist kein Kreditrating und kein Durchschnitt von Agenturratings, und 10BONDS ist keine Ratingagentur. Es legt keine Strategie nahe. Prüfen Sie offizielle Ratings bei den Ratingagenturen, beim Emittenten und bei Ihrem Finanzberater und verlassen Sie sich nicht auf das Risiko von 10BONDS.",
        ],
      },
      {
        title: "Keine Ausführung",
        paragraphs: ["10BONDS verwahrt kein Geld, führt keine Aufträge aus und verwaltet keine Portfolios."],
      },
    ],
    full: "Vollständiger Text (auf Englisch):",
    terms: "Nutzungsbedingungen und Risikohinweise",
  },
};
