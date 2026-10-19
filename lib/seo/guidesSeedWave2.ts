import type { SeedGuide } from "./guidesSeed";

// The guides the translation matrix still showed as missing or as outline drafts (19 Oct 2026, Livio asked for every
// topic in every language): "buy OAT" and "bonds vs deposit" in Italian, French and German. Written for each market
// (local deposit schemes, taxes and accounts), not translated word for word. No yields, prices or ISINs are quoted.

const ctaIt = (text: string) => `<p><strong>Prova subito:</strong> <a href="/it">${text}</a>. Due cursori, dieci obbligazioni, nessun impegno.</p>`;
const ctaFr = (text: string) => `<p><strong>Essayez :</strong> <a href="/fr">${text}</a>. Deux curseurs, dix obligations, sans engagement.</p>`;
const ctaDe = (text: string) => `<p><strong>Jetzt ausprobieren:</strong> <a href="/de">${text}</a>. Zwei Regler, zehn Anleihen, unverbindlich.</p>`;

const notaIt = `<p><em>Le informazioni hanno finalità esclusivamente informative ed educative. Non costituiscono una raccomandazione di investimento personalizzata. Aliquote e regole fiscali vanno verificate sulle fonti ufficiali e possono cambiare.</em></p>`;
const notaFr = `<p><em>Ces informations sont fournies à titre informatif et pédagogique. Elles ne constituent pas une recommandation d'investissement personnalisée. Les taux et règles fiscales sont à vérifier sur les sources officielles et peuvent évoluer.</em></p>`;
const notaDe = `<p><em>Die Informationen dienen ausschließlich der Information und Bildung. Sie sind keine Anlageberatung und keine Empfehlung zum Kauf oder Verkauf. Steuersätze und Regeln bitte bei offiziellen Quellen prüfen; sie können sich ändern.</em></p>`;

export const SEED_GUIDES_WAVE2: SeedGuide[] = [
  // ---------- buy-oat ----------
  {
    locale: "it", topic: "gov", group: "buy-oat", status: "published",
    slug: "comprare-oat-titoli-stato-francesi",
    title: "Comprare OAT, i titoli di Stato francesi: come fare dall'Italia",
    seoTitle: "Comprare OAT francesi dall'Italia: come fare",
    metaDescription: "Come comprare le OAT, i titoli di Stato francesi, da un conto titoli italiano: dove si trovano, come leggere prezzo e rendimento, tassazione e rischi.",
    primaryKeyword: "comprare oat francesi",
    relatedKeywords: ["oat titoli di stato francesi", "titoli di stato francesi", "oat rendimento"],
    relatedSlugs: ["btp", "rendimento-a-scadenza", "duration-obbligazioni"],
    bodyHtml: `
<p><strong>In breve:</strong> le OAT (Obligations Assimilables du Trésor) sono i titoli di Stato della Francia. Dall'Italia si comprano come un BTP: da un conto titoli presso una banca o un broker che dà accesso al mercato dove sono quotate, al prezzo del momento.</p>
<p>Molti risparmiatori italiani guardano alle OAT per diversificare: invece di tenere solo titoli dello Stato italiano, affiancano un altro emittente sovrano dell'area euro, in euro, senza rischio di cambio.</p>
<h2 id="cosa-sono">Cosa sono le OAT</h2>
<p>Le OAT sono emesse dall'Agence France Trésor per finanziare lo Stato francese, con scadenze che vanno da pochi anni a oltre trenta. Le OAT classiche pagano una <strong>cedola fissa annuale</strong> (i BTP la pagano ogni sei mesi) e rimborsano il valore nominale a scadenza. Esistono anche OAT legate all'inflazione francese (OATi) o europea (OAT€i), che funzionano in modo diverso e non vanno confrontate direttamente con un rendimento nominale.</p>
<h2 id="dove">Dove si comprano</h2>
<p>Le aste dello Stato francese sono riservate agli operatori specialisti: il privato compra sul <strong>mercato secondario</strong>. Il mercato principale è Euronext Paris; alcuni intermediari offrono le OAT anche su altre sedi. Prima di comprare conviene chiedere al proprio intermediario:</p>
<ul>
<li>su quale mercato è disponibile il titolo e con quale commissione;</li>
<li>il <strong>lotto minimo</strong> di acquisto, che dipende dall'intermediario e dalla sede;</li>
<li>se l'ordine si inserisce online o solo per telefono.</li>
</ul>
<h2 id="prezzo">Prezzo e rendimento</h2>
<p>Come per i BTP, il prezzo è espresso in percentuale del nominale: 98 significa pagare 980 euro per 1.000 euro rimborsati a scadenza. Quello che conta per confrontare titoli diversi è il <a href="/it/guide/rendimento-a-scadenza">rendimento a scadenza</a>, che tiene insieme cedola, prezzo pagato e tempo che manca al rimborso. Il prezzo poi si muove con i tassi: quanto, lo dice la <a href="/it/guide/duration-obbligazioni">duration</a>.</p>
<p>Di solito le OAT rendono meno dei BTP e più dei Bund tedeschi a parità di scadenza, perché il mercato giudica il rischio di credito della Francia intermedio fra i due. Il confronto aggiornato è nella pagina dei <a href="/it/obbligazioni/titoli-di-stato-francesi">rendimenti delle OAT</a>.</p>
<h2 id="tasse">Tassazione in Italia</h2>
<p>Per un residente in Italia, gli interessi e le plusvalenze dei titoli di Stato dei Paesi che scambiano informazioni fiscali con l'Italia (fra cui la Francia) sono tassati al <strong>12,5%</strong>, come i BTP, invece che al 26%. Con il regime amministrato l'intermediario italiano applica l'imposta per te. Sul conto titoli si paga comunque l'imposta di bollo annuale. Le regole vanno verificate sul sito dell'Agenzia delle Entrate o con il proprio intermediario.</p>
<h2 id="rischi">Rischi da conoscere</h2>
<ul>
<li><strong>Rischio di tasso</strong>: se vendi prima della scadenza e i tassi sono saliti, puoi perdere.</li>
<li><strong>Rischio di credito</strong>: basso ma non nullo; il rating della Francia può cambiare.</li>
<li><strong>Liquidità</strong>: su alcune sedi o per alcune scadenze lo scarto fra prezzo di acquisto e di vendita può essere ampio.</li>
</ul>
<h2 id="faq">Domande frequenti</h2>
<h3>Le OAT hanno rischio di cambio?</h3>
<p>No, le OAT classiche sono in euro come i BTP.</p>
<h3>Posso confrontare OAT e BTP nello stesso strumento?</h3>
<p>Sì: 10BONDS mette a confronto migliaia di obbligazioni in euro, titoli di Stato compresi, per scadenza e rendimento.</p>
${ctaIt("confronta OAT, BTP e altre obbligazioni per scadenza")}
${notaIt}`,
  },
  {
    locale: "fr", topic: "gov", group: "buy-oat", status: "published",
    slug: "acheter-des-oat",
    title: "Acheter des OAT en direct : comment faire",
    seoTitle: "Acheter des OAT en direct : mode d'emploi",
    metaDescription: "Comment acheter des obligations assimilables du Trésor (OAT) en direct via un courtier : où, à quel prix, avec quels frais, quelle fiscalité et quels risques.",
    primaryKeyword: "acheter des oat",
    relatedKeywords: ["oat", "obligations d'état", "acheter obligations d'état"],
    relatedSlugs: ["oat-obligations-etat", "calcul-rendement-obligation", "duration-obligations"],
    bodyHtml: `
<p><strong>En bref :</strong> les OAT sont les obligations de l'État français. Un particulier peut les acheter sur le marché secondaire via un compte-titres, comme une action, au prix du jour. Il n'est pas nécessaire de passer par un fonds.</p>
<p>Détenir une OAT en direct permet de connaître dès l'achat le rendement obtenu si l'on garde le titre jusqu'à l'échéance, ce qu'un fonds obligataire ne permet pas puisqu'il n'a pas d'échéance.</p>
<h2 id="ou">Où acheter des OAT</h2>
<p>Les adjudications de l'Agence France Trésor sont réservées aux Spécialistes en Valeurs du Trésor : le particulier achète donc sur le <strong>marché secondaire</strong>, principalement Euronext Paris. Il faut un <strong>compte-titres ordinaire</strong> auprès d'une banque ou d'un courtier qui donne accès au marché obligataire. Les OAT ne sont pas éligibles au PEA.</p>
<p>Avant de passer un ordre, vérifiez auprès de votre intermédiaire :</p>
<ul>
<li>les frais de courtage sur les obligations, souvent différents de ceux des actions ;</li>
<li>le montant minimum d'achat, qui dépend de l'intermédiaire ;</li>
<li>si l'ordre se passe en ligne ou uniquement par téléphone.</li>
</ul>
<h2 id="prix">Prix, coupon et rendement</h2>
<p>Le prix d'une OAT est exprimé en pourcentage du nominal : un cours de 97 signifie payer 970 € pour 1 000 € remboursés à l'échéance. Les OAT classiques versent un <strong>coupon annuel fixe</strong>. À l'achat, on paie aussi le coupon couru depuis le dernier versement.</p>
<p>Pour comparer deux OAT, ou une OAT avec une obligation d'entreprise, le bon chiffre est le <a href="/fr/guides/calcul-rendement-obligation">rendement à l'échéance</a>. La <a href="/fr/guides/duration-obligations">duration</a> indique de combien le prix varie si les taux bougent. Les rendements par échéance sont sur la page <a href="/fr/obligations/oat">OAT aujourd'hui</a>.</p>
<h2 id="fiscalite">Fiscalité</h2>
<p>Pour un résident fiscal français, les coupons et plus-values d'une OAT détenue en compte-titres relèvent en principe du prélèvement forfaitaire unique, de 31,4 % en 2026, sauf option pour le barème progressif. Ces règles sont à vérifier sur impots.gouv.fr ou auprès de votre conseiller, car elles évoluent avec les lois de finances.</p>
<h2 id="risques">Les risques</h2>
<ul>
<li><strong>Risque de taux</strong> : en cas de revente avant l'échéance après une hausse des taux, le prix peut être inférieur au prix payé.</li>
<li><strong>Risque de crédit</strong> : faible, mais la note de la France peut évoluer.</li>
<li><strong>Liquidité</strong> : sur certaines lignes, l'écart entre prix d'achat et de vente peut être large pour de petits montants.</li>
</ul>
<h2 id="faq">Questions fréquentes</h2>
<h3>Faut-il préférer une OAT en direct ou un fonds en euros ?</h3>
<p>Ce sont deux choses différentes : le fonds en euros garantit le capital par l'assureur et lisse les rendements, l'OAT en direct a un prix qui varie mais un rendement connu si on la garde jusqu'à l'échéance.</p>
<h3>Puis-je comparer les OAT à d'autres obligations ?</h3>
<p>Oui : 10BONDS compare des milliers d'obligations en euros, OAT comprises, par échéance et par rendement.</p>
${ctaFr("comparez les OAT et les autres obligations par échéance")}
${notaFr}`,
  },
  {
    locale: "de", topic: "gov", group: "buy-oat", status: "published",
    slug: "franzoesische-staatsanleihen-kaufen",
    title: "Französische Staatsanleihen (OAT) kaufen: So geht es",
    seoTitle: "Französische Staatsanleihen (OAT) kaufen",
    metaDescription: "Wie Sie französische Staatsanleihen (OAT) über Ihr Depot kaufen: Börsenplätze, Kurs und Rendite, Abgeltungsteuer und Risiken im Vergleich zu Bundesanleihen.",
    primaryKeyword: "französische staatsanleihen kaufen",
    relatedKeywords: ["oat anleihen", "französische staatsanleihen", "oat rendite"],
    relatedSlugs: ["bundesanleihen", "rendite-bis-faelligkeit", "duration-anleihen"],
    bodyHtml: `
<p><strong>Kurz gesagt:</strong> OAT (Obligations Assimilables du Trésor) sind die Staatsanleihen Frankreichs. Anleger in Deutschland kaufen sie wie eine Bundesanleihe: über ihr Wertpapierdepot an der Börse, zum aktuellen Kurs.</p>
<p>Viele Anleger mischen OAT unter ihre Bundesanleihen, weil sie bei gleicher Laufzeit in der Regel etwas mehr Rendite bieten und ebenfalls auf Euro lauten, also kein Währungsrisiko haben.</p>
<h2 id="was">Was sind OAT?</h2>
<p>OAT gibt die Agence France Trésor aus, die Finanzagentur des französischen Staates. Die Laufzeiten reichen von wenigen Jahren bis über dreißig Jahre. Klassische OAT zahlen einen <strong>festen jährlichen Kupon</strong>, wie Bundesanleihen, und werden am Ende zum Nennwert zurückgezahlt. Daneben gibt es inflationsindexierte OATi und OAT€i, deren Zahlungen von der Inflation abhängen und die man nicht direkt mit einer nominalen Rendite vergleichen kann.</p>
<h2 id="wo">Wo kann man OAT kaufen?</h2>
<p>Die Auktionen des französischen Staates sind Spezialisten vorbehalten; Privatanleger kaufen am <strong>Sekundärmarkt</strong>. Der Heimatmarkt ist Euronext Paris, viele OAT sind aber auch an deutschen Börsenplätzen handelbar. Vor dem Kauf lohnt ein Blick auf:</p>
<ul>
<li>den Börsenplatz und die Ordergebühren Ihrer Bank oder Ihres Brokers;</li>
<li>die <strong>Mindestanlage</strong>, die je nach Anbieter und Börsenplatz unterschiedlich ist;</li>
<li>die Spanne zwischen Geld- und Briefkurs, die an kleineren Börsenplätzen breiter sein kann.</li>
</ul>
<h2 id="kurs">Kurs und Rendite</h2>
<p>Der Kurs wird in Prozent des Nennwerts angegeben: 97 bedeutet, Sie zahlen 970 € für 1.000 € Rückzahlung. Dazu kommen die Stückzinsen seit dem letzten Kupon. Für den Vergleich zählt die <a href="/de/ratgeber/rendite-bis-faelligkeit">Rendite bis Fälligkeit</a>, nicht der Kupon allein. Wie stark der Kurs auf Zinsänderungen reagiert, zeigt die <a href="/de/ratgeber/duration-anleihen">Duration</a>.</p>
<p>Der Renditeaufschlag der OAT gegenüber <a href="/de/anleihen/bundesanleihen">Bundesanleihen</a> heißt OAT-Bund-Spread. Er zeigt, wie der Markt die Kreditqualität Frankreichs im Vergleich zu Deutschland einschätzt. Aktuelle Renditen je Laufzeit finden Sie auf der Seite <a href="/de/anleihen/franzoesische-staatsanleihen">französische Staatsanleihen</a>.</p>
<h2 id="steuern">Steuern</h2>
<p>Für Anleger mit Wohnsitz in Deutschland unterliegen Zinsen und Kursgewinne aus OAT in einem deutschen Depot der <strong>Abgeltungsteuer</strong> (25 % zuzüglich Solidaritätszuschlag und gegebenenfalls Kirchensteuer), wie bei Bundesanleihen. Die Bank führt die Steuer ab; der Sparer-Pauschbetrag gilt auch hier. Details bitte beim Finanzamt oder einem Steuerberater prüfen.</p>
<h2 id="risiken">Risiken</h2>
<ul>
<li><strong>Zinsänderungsrisiko</strong>: Wer vor Fälligkeit verkauft, kann nach einem Zinsanstieg Verlust machen.</li>
<li><strong>Kreditrisiko</strong>: gering, aber höher als bei Bundesanleihen; Frankreichs Rating kann sich ändern.</li>
<li><strong>Liquidität</strong>: Bei kleinen Beträgen und Nebenbörsen können die Kursspannen breit sein.</li>
</ul>
<h2 id="faq">Häufige Fragen</h2>
<h3>Haben OAT ein Währungsrisiko?</h3>
<p>Nein, klassische OAT lauten auf Euro.</p>
<h3>Kann ich OAT mit Bundesanleihen vergleichen?</h3>
<p>Ja. 10BONDS vergleicht Tausende Euro-Anleihen, Staatsanleihen eingeschlossen, nach Laufzeit und Rendite.</p>
${ctaDe("vergleichen Sie OAT, Bundesanleihen und andere Anleihen nach Laufzeit")}
${notaDe}`,
  },
  // ---------- bonds-vs-deposit ----------
  {
    locale: "it", topic: "compare", group: "bonds-vs-deposit", status: "published",
    slug: "obbligazioni-o-conto-deposito",
    title: "BTP e obbligazioni o conto deposito: cosa cambia",
    seoTitle: "BTP o conto deposito? Differenze a confronto",
    metaDescription: "BTP e obbligazioni o conto deposito vincolato: rendimento, garanzie, tassazione, costi e possibilità di uscire prima, spiegati in modo semplice.",
    primaryKeyword: "btp o conto deposito",
    relatedKeywords: ["conto deposito", "obbligazioni o conto deposito", "conto deposito vincolato"],
    relatedSlugs: ["btp", "rendimento-a-scadenza", "rischio-di-credito-obbligazioni"],
    bodyHtml: `
<p><strong>In breve:</strong> il conto deposito vincolato ti dà un tasso fisso per un periodo fisso, con il capitale protetto dal Fondo di garanzia dei depositi fino a 100.000 euro per banca. Un BTP o un'obbligazione ti dà una cedola e un rendimento noto se la tieni fino a scadenza, ma il prezzo oscilla e la sicurezza dipende da chi l'ha emessa.</p>
<p>Le due scelte sembrano simili, perché in entrambi i casi presti soldi per un certo tempo in cambio di un interesse. Le differenze stanno nelle garanzie, nelle tasse e in cosa succede se ti servono i soldi prima.</p>
<h2 id="garanzie">Garanzie e rischio</h2>
<p>Il denaro sul conto deposito è coperto dal <strong>Fondo Interbancario di Tutela dei Depositi</strong> fino a 100.000 euro per depositante e per banca. Un'obbligazione non ha questa garanzia: è sicura quanto il suo emittente. Un BTP dipende dalla solidità dello Stato italiano, un'obbligazione societaria da quella dell'azienda. Il rating aiuta a capire il <a href="/it/guide/rischio-di-credito-obbligazioni">rischio di credito</a>.</p>
<h2 id="tasse">Tassazione</h2>
<p>Gli interessi del conto deposito sono tassati al <strong>26%</strong>. Le cedole dei BTP e dei titoli di Stato dei Paesi che scambiano informazioni con l'Italia sono tassate al <strong>12,5%</strong>; le obbligazioni societarie al 26%. A parità di tasso lordo, quindi, un titolo di Stato lascia di più in tasca. Sia il conto deposito sia il conto titoli pagano l'imposta di bollo annuale.</p>
<h2 id="uscire">Se ti servono i soldi prima</h2>
<p>Il conto <strong>vincolato</strong> di solito non si può svincolare, oppure si può solo perdendo parte degli interessi: dipende dal contratto. Un BTP si può vendere in Borsa in qualsiasi giorno di mercato, ma al prezzo del momento: se i tassi sono saliti, il prezzo è sceso e puoi perdere. Quanto, lo dice la <a href="/it/guide/duration-obbligazioni">duration</a>.</p>
<h2 id="rendimento">Come confrontare il rendimento</h2>
<p>Per il conto deposito il numero da guardare è il tasso annuo lordo e la durata del vincolo. Per un'obbligazione è il <a href="/it/guide/rendimento-a-scadenza">rendimento a scadenza</a>, che tiene conto del prezzo pagato. Confronta sempre i due valori al netto delle tasse e alla stessa durata.</p>
<table>
<thead><tr><th scope="col"></th><th scope="col">Conto deposito vincolato</th><th scope="col">BTP / obbligazione</th></tr></thead>
<tbody>
<tr><td>Garanzia</td><td>Fondo di tutela fino a 100.000 € per banca</td><td>Solidità dell'emittente</td></tr>
<tr><td>Tasse sugli interessi</td><td>26%</td><td>12,5% titoli di Stato, 26% societarie</td></tr>
<tr><td>Uscita anticipata</td><td>Spesso non possibile o con penale</td><td>Vendita in Borsa al prezzo del giorno</td></tr>
<tr><td>Rendimento</td><td>Tasso fisso deciso dalla banca</td><td>Dipende dal prezzo di acquisto</td></tr>
</tbody>
</table>
<h2 id="faq">Domande frequenti</h2>
<h3>Il conto deposito è sempre più sicuro?</h3>
<p>Entro i 100.000 euro per banca è protetto dal fondo di garanzia. Un BTP non ha questa copertura, ma è garantito dallo Stato che lo emette.</p>
<h3>Posso usare entrambi?</h3>
<p>Sì, molti risparmiatori tengono una parte sul conto deposito e una parte in titoli con scadenze diverse.</p>
${ctaIt("guarda quali obbligazioni rendono di più alla scadenza che ti serve")}
${notaIt}`,
  },
  {
    locale: "fr", topic: "compare", group: "bonds-vs-deposit", status: "published",
    slug: "obligations-ou-compte-a-terme",
    title: "Obligations ou compte à terme : que choisir ?",
    seoTitle: "Obligations ou compte à terme : le comparatif",
    metaDescription: "Obligations, compte à terme ou livret : rendement, garantie des dépôts, fiscalité et disponibilité de l'argent comparés simplement.",
    primaryKeyword: "obligations ou compte à terme",
    relatedKeywords: ["compte à terme", "obligations ou livret", "placement sans risque"],
    relatedSlugs: ["oat-obligations-etat", "calcul-rendement-obligation", "risque-de-credit-obligataire"],
    bodyHtml: `
<p><strong>En bref :</strong> le compte à terme verse un taux fixe pendant une durée fixe, et l'argent est couvert par la garantie des dépôts jusqu'à 100 000 € par banque. Une obligation verse un coupon et offre un rendement connu si on la garde jusqu'à l'échéance, mais son prix varie et sa sécurité dépend de l'émetteur.</p>
<p>Dans les deux cas, vous prêtez votre argent pour un temps en échange d'intérêts. La différence tient à la garantie, à la fiscalité et à ce qui se passe si vous avez besoin de l'argent avant la fin.</p>
<h2 id="garantie">Garantie et risque</h2>
<p>Les dépôts, comptes à terme compris, sont couverts par le <strong>Fonds de Garantie des Dépôts et de Résolution (FGDR)</strong> jusqu'à 100 000 € par déposant et par établissement. Une obligation n'a pas cette garantie : elle vaut ce que vaut son émetteur. Une OAT dépend de la solidité de l'État français, une obligation d'entreprise de celle de la société. La notation aide à mesurer ce <a href="/fr/guides/risque-de-credit-obligataire">risque de crédit</a>.</p>
<h2 id="livrets">Et les livrets réglementés ?</h2>
<p>Le Livret A et le LDDS sont disponibles à tout moment et leurs intérêts sont exonérés d'impôt, mais leur taux est fixé par l'État et leur montant est plafonné. Pour l'épargne au-delà des plafonds, la question se pose entre compte à terme, obligations et autres placements.</p>
<h2 id="fiscalite">Fiscalité</h2>
<p>Les intérêts d'un compte à terme comme les coupons d'une obligation détenue en compte-titres relèvent en principe du prélèvement forfaitaire unique, de 31,4 % en 2026, sauf option pour le barème progressif. À taux brut égal, la fiscalité est donc proche ; elle est à vérifier sur impots.gouv.fr.</p>
<h2 id="sortie">Si vous avez besoin de l'argent avant</h2>
<p>Un compte à terme peut souvent être clôturé avant l'échéance, mais avec des intérêts réduits selon le contrat. Une obligation se revend en Bourse un jour de marché, au prix du moment : si les taux ont monté, ce prix a baissé. La <a href="/fr/guides/duration-obligations">duration</a> indique de combien.</p>
<h2 id="comparer">Comment comparer</h2>
<p>Pour le compte à terme, regardez le taux annuel brut et la durée de blocage. Pour une obligation, regardez le <a href="/fr/guides/calcul-rendement-obligation">rendement à l'échéance</a>, qui tient compte du prix payé. Comparez à durée égale et après impôt.</p>
<table>
<thead><tr><th scope="col"></th><th scope="col">Compte à terme</th><th scope="col">Obligation</th></tr></thead>
<tbody>
<tr><td>Garantie</td><td>FGDR jusqu'à 100 000 € par banque</td><td>Solidité de l'émetteur</td></tr>
<tr><td>Sortie anticipée</td><td>Souvent possible, avec intérêts réduits</td><td>Revente en Bourse au prix du jour</td></tr>
<tr><td>Rendement</td><td>Taux fixe décidé par la banque</td><td>Dépend du prix d'achat</td></tr>
</tbody>
</table>
<h2 id="faq">Questions fréquentes</h2>
<h3>Le compte à terme est-il toujours plus sûr ?</h3>
<p>Jusqu'à 100 000 € par banque, il est couvert par le FGDR. Une OAT n'a pas cette garantie, mais elle est émise par l'État.</p>
<h3>Peut-on combiner les deux ?</h3>
<p>Oui : beaucoup d'épargnants gardent une réserve disponible et placent le reste en obligations à différentes échéances.</p>
${ctaFr("voyez quelles obligations rapportent le plus à l'échéance qui vous convient")}
${notaFr}`,
  },
  {
    locale: "de", topic: "compare", group: "bonds-vs-deposit", status: "published",
    slug: "anleihen-oder-festgeld",
    title: "Anleihen oder Festgeld: was passt besser?",
    seoTitle: "Anleihen oder Festgeld? Der Vergleich",
    metaDescription: "Anleihen oder Festgeld: Rendite, Sicherheit, Einlagensicherung, Verfügbarkeit und Steuern im einfachen Vergleich.",
    primaryKeyword: "anleihen oder festgeld",
    relatedKeywords: ["festgeld", "anleihen", "festgeld oder bundesanleihen"],
    relatedSlugs: ["bundesanleihen", "rendite-bis-faelligkeit", "kreditrisiko-anleihen"],
    bodyHtml: `
<p><strong>Kurz gesagt:</strong> Festgeld bringt einen festen Zins für eine feste Zeit und ist im Rahmen der gesetzlichen Einlagensicherung bis 100.000 € pro Bank geschützt. Eine Anleihe bringt einen Kupon und eine bekannte Rendite, wenn Sie sie bis zur Fälligkeit halten; ihr Kurs schwankt aber, und sie ist so sicher wie ihr Emittent.</p>
<p>In beiden Fällen verleihen Sie Geld für eine bestimmte Zeit gegen Zinsen. Die Unterschiede liegen bei Sicherheit, Verfügbarkeit und Auswahl.</p>
<h2 id="sicherheit">Sicherheit</h2>
<p>Festgeld fällt unter die <strong>gesetzliche Einlagensicherung</strong>: 100.000 € pro Kunde und Bank in der EU. Viele deutsche Banken sind zusätzlich in freiwilligen Sicherungssystemen. Eine Anleihe hat keine Einlagensicherung: Eine <a href="/de/ratgeber/bundesanleihen">Bundesanleihe</a> hängt an der Bonität des Bundes, eine Unternehmensanleihe an der des Unternehmens. Das Rating hilft beim Einschätzen des <a href="/de/ratgeber/kreditrisiko-anleihen">Kreditrisikos</a>.</p>
<h2 id="verfuegbarkeit">Verfügbarkeit</h2>
<p>Festgeld ist in der Regel bis zum Ende der Laufzeit fest gebunden; eine vorzeitige Kündigung ist meist nicht vorgesehen. Anleihen lassen sich an jedem Börsentag verkaufen, aber zum aktuellen Kurs: Sind die Zinsen gestiegen, ist der Kurs gefallen, und Sie verkaufen eventuell mit Verlust. Wie stark, zeigt die <a href="/de/ratgeber/duration-anleihen">Duration</a>.</p>
<h2 id="steuern">Steuern</h2>
<p>Zinsen aus Festgeld und Kupons aus Anleihen unterliegen beide der <strong>Abgeltungsteuer</strong> (25 % zuzüglich Solidaritätszuschlag und gegebenenfalls Kirchensteuer); der Sparer-Pauschbetrag gilt für beide zusammen. Bei Anleihen sind zusätzlich Kursgewinne steuerpflichtig, Kursverluste lassen sich verrechnen. Details bitte beim Finanzamt oder einem Steuerberater prüfen.</p>
<h2 id="rendite">Rendite vergleichen</h2>
<p>Beim Festgeld zählen Zinssatz pro Jahr und Laufzeit. Bei einer Anleihe zählt die <a href="/de/ratgeber/rendite-bis-faelligkeit">Rendite bis Fälligkeit</a>, die den gezahlten Kurs berücksichtigt. Vergleichen Sie immer bei gleicher Laufzeit. Ein Vorteil der Anleihen ist die Auswahl: Laufzeiten von wenigen Monaten bis zu Jahrzehnten, und Sie können sich die Rendite für lange Zeit sichern.</p>
<table>
<thead><tr><th scope="col"></th><th scope="col">Festgeld</th><th scope="col">Anleihe</th></tr></thead>
<tbody>
<tr><td>Schutz</td><td>Einlagensicherung bis 100.000 € pro Bank</td><td>Bonität des Emittenten</td></tr>
<tr><td>Vorzeitig an das Geld</td><td>Meist nicht möglich</td><td>Verkauf an der Börse zum Tageskurs</td></tr>
<tr><td>Rendite</td><td>Fester Zins der Bank</td><td>Hängt vom Kaufkurs ab</td></tr>
<tr><td>Steuer</td><td>Abgeltungsteuer</td><td>Abgeltungsteuer, auch auf Kursgewinne</td></tr>
</tbody>
</table>
<h2 id="faq">Häufige Fragen</h2>
<h3>Ist Festgeld immer sicherer?</h3>
<p>Bis 100.000 € pro Bank ist es durch die Einlagensicherung geschützt. Eine Bundesanleihe hat diesen Schutz nicht, wird aber vom Bund zurückgezahlt.</p>
<h3>Kann man beides kombinieren?</h3>
<p>Ja. Viele Sparer halten eine Reserve auf Tages- oder Festgeld und legen den Rest in Anleihen mit verschiedenen Laufzeiten an.</p>
${ctaDe("finden Sie Anleihen nach Rendite und Laufzeit")}
${notaDe}`,
  },
];
