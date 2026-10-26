import type { SeedGuide } from "./guidesSeed";

// The guides the translation matrix still showed as missing or as outline drafts (19 Oct 2026, the owner asked for every
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
<p><strong>In breve:</strong> le OAT (Obligations Assimilables du Trésor) sono i titoli di Stato della Francia, e per un italiano comprarle non è più complicato che comprare un BTP. Serve un conto titoli presso una banca o un broker che dia accesso al mercato dove sono quotate; il prezzo è quello del momento.</p>
<p>Chi tiene solo debito italiano ha messo tutte le uova nello stesso paniere, per quanto di casa. Le OAT aggiungono un secondo emittente sovrano dell'area euro, sempre in euro, quindi senza rischio di cambio.</p>
<h2 id="cosa-sono">Cosa sono le OAT</h2>
<p>A emetterle è l'Agence France Trésor, per finanziare lo Stato francese, con scadenze che vanno da pochi anni a oltre trenta. La OAT classica è un oggetto sobrio: paga una <strong>cedola fissa annuale</strong> (il BTP la paga ogni sei mesi) e a scadenza restituisce il valore nominale. Accanto alle classiche ci sono le OAT indicizzate all'inflazione francese (OATi) o europea (OAT€i). Seguono un'altra logica, e metterle accanto a un rendimento nominale significa confrontare mele e pere.</p>
<h2 id="dove">Dove si comprano</h2>
<p>Alle aste dello Stato francese il privato non è invitato: sono riservate agli operatori specialisti. Si compra quindi sul <strong>mercato secondario</strong>, che per le OAT vuol dire soprattutto Euronext Paris, anche se alcuni intermediari le offrono su altre sedi. Prima di comprare, tre domande all'intermediario evitano sorprese:</p>
<ul>
<li>su quale mercato si trova il titolo e quanto costa la commissione;</li>
<li>qual è il <strong>lotto minimo</strong> di acquisto, che dipende da intermediario e sede;</li>
<li>se l'ordine si inserisce online o bisogna ancora telefonare, come ai tempi della lira.</li>
</ul>
<h2 id="prezzo">Prezzo e rendimento</h2>
<p>Il prezzo si legge come quello di un BTP, in percentuale del nominale: 98 vuol dire pagare 980 euro per riceverne 1.000 alla scadenza. La cedola, da sola, racconta mezza storia. Per confrontare titoli diversi serve il <a href="/it/guide/rendimento-a-scadenza">rendimento a scadenza</a>, che mette insieme cedola, prezzo pagato e tempo che manca al rimborso. Nel frattempo il prezzo si muove con i tassi, e di quanto lo dice la <a href="/it/guide/duration-obbligazioni">duration</a>.</p>
<p>A parità di scadenza, di solito le OAT rendono meno dei BTP e più dei Bund tedeschi: il mercato colloca il rischio di credito della Francia a metà strada fra i due. Centro classifica, aggiornato ogni giorno. Il confronto aggiornato è nella pagina dei <a href="/it/obbligazioni/titoli-di-stato-francesi">rendimenti delle OAT</a>.</p>
<h2 id="tasse">Tassazione in Italia</h2>
<p>Qui arriva la parte piacevole, almeno per gli standard del fisco. Per un residente in Italia, interessi e plusvalenze dei titoli di Stato dei Paesi che scambiano informazioni fiscali con l'Italia, Francia compresa, sono tassati al <strong>12,5%</strong> come quelli dei BTP, e non al 26%. Con il regime amministrato ci pensa l'intermediario italiano. Il bollo annuale sul conto titoli si paga comunque. Le regole vanno verificate sul sito dell'Agenzia delle Entrate o con il proprio intermediario.</p>
<h2 id="rischi">Rischi da conoscere</h2>
<ul>
<li><strong>Rischio di tasso</strong>: chi vende prima della scadenza, dopo un rialzo dei tassi, può incassare meno di quanto ha pagato.</li>
<li><strong>Rischio di credito</strong>: basso, ma non pari a zero; il rating della Francia può cambiare.</li>
<li><strong>Liquidità</strong>: su alcune sedi o su alcune scadenze la distanza fra prezzo di acquisto e prezzo di vendita può essere ampia.</li>
</ul>
<h2 id="faq">Domande frequenti</h2>
<h3>Le OAT hanno rischio di cambio?</h3>
<p>No. Le OAT classiche sono denominate in euro, esattamente come i BTP.</p>
<h3>Posso confrontare OAT e BTP nello stesso strumento?</h3>
<p>Sì. 10BONDS mette a confronto migliaia di obbligazioni in euro, titoli di Stato inclusi, per scadenza e rendimento.</p>
${ctaIt("metti a confronto OAT, BTP e altre obbligazioni per scadenza")}
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
<p><strong>En bref :</strong> les OAT sont les obligations de l'État français, et un particulier peut fort bien les acheter lui-même. Cela se passe sur le marché secondaire, via un compte-titres, comme pour une action, au prix du jour. Nul besoin de passer par un fonds.</p>
<p>En direct, vous connaissez dès l'achat le rendement obtenu si vous gardez le titre jusqu'à l'échéance. Un fonds obligataire ne le peut pas : il n'a pas d'échéance. C'est un coureur sans ligne d'arrivée.</p>
<h2 id="ou">Où acheter des OAT</h2>
<p>Les adjudications de l'Agence France Trésor se tiennent en petit comité : seuls les Spécialistes en Valeurs du Trésor y participent. Le particulier achète donc sur le <strong>marché secondaire</strong>, Euronext Paris pour l'essentiel. Il lui faut un <strong>compte-titres ordinaire</strong> chez une banque ou un courtier qui ouvre l'accès au marché obligataire. Inutile de chercher du côté du PEA : les OAT n'y sont pas éligibles.</p>
<p>Avant de passer un ordre, vérifiez auprès de votre intermédiaire :</p>
<ul>
<li>les frais de courtage sur les obligations, qui ne sont pas toujours ceux des actions ;</li>
<li>le montant minimum d'achat, propre à chaque intermédiaire ;</li>
<li>la façon de passer l'ordre : en ligne, ou seulement par téléphone, à l'ancienne.</li>
</ul>
<h2 id="prix">Prix, coupon et rendement</h2>
<p>Le prix d'une OAT s'exprime en pourcentage du nominal : un cours de 97 signifie que vous payez 970 € pour en récupérer 1 000 à l'échéance. Les OAT classiques versent un <strong>coupon annuel fixe</strong>. À l'achat, on règle aussi le coupon couru depuis le dernier versement. Le vendeur, lui, ne fait pas crédit.</p>
<p>Pour comparer deux OAT, ou une OAT avec une obligation d'entreprise, le coupon ne suffit pas. Le chiffre qui compte est le <a href="/fr/guides/calcul-rendement-obligation">rendement à l'échéance</a>. La <a href="/fr/guides/duration-obligations">duration</a>, elle, mesure de combien le prix bouge quand les taux bougent. Les rendements par échéance sont rassemblés sur la page <a href="/fr/obligations/oat">OAT aujourd'hui</a>.</p>
<h2 id="fiscalite">Fiscalité</h2>
<p>Pour un résident fiscal français, coupons et plus-values d'une OAT logée en compte-titres relèvent en principe du prélèvement forfaitaire unique, de 31,4 % en 2026, sauf option pour le barème progressif. Ces règles évoluent au gré des lois de finances, avec une régularité de métronome : vérifiez-les sur impots.gouv.fr ou auprès de votre conseiller.</p>
<h2 id="risques">Les risques</h2>
<ul>
<li><strong>Risque de taux</strong> : si vous revendez avant l'échéance après une hausse des taux, vous pouvez récupérer moins que le prix payé.</li>
<li><strong>Risque de crédit</strong> : faible, mais pas nul ; la note de la France peut évoluer.</li>
<li><strong>Liquidité</strong> : sur certaines lignes et pour de petits montants, l'écart entre prix d'achat et prix de vente peut être large.</li>
</ul>
<h2 id="faq">Questions fréquentes</h2>
<h3>Faut-il préférer une OAT en direct ou un fonds en euros ?</h3>
<p>Ce sont deux objets très différents. Le fonds en euros garantit le capital par l'assureur et lisse les rendements dans le temps. L'OAT en direct a un prix qui varie, mais un rendement connu d'avance si on la conserve jusqu'à l'échéance.</p>
<h3>Puis-je comparer les OAT à d'autres obligations ?</h3>
<p>Oui. 10BONDS compare des milliers d'obligations en euros, OAT comprises, par échéance et par rendement.</p>
${ctaFr("comparez les OAT aux autres obligations, échéance par échéance")}
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
<p><strong>Kurz gesagt:</strong> OAT (Obligations Assimilables du Trésor) sind die Staatsanleihen Frankreichs. Wer in Deutschland eine Bundesanleihe kaufen kann, kann auch eine OAT kaufen: über das eigene Wertpapierdepot, an der Börse, zum aktuellen Kurs.</p>
<p>Der Reiz liegt in einer kleinen, feinen Differenz: Bei gleicher Laufzeit bieten OAT in der Regel etwas mehr Rendite als Bundesanleihen, und sie lauten ebenfalls auf Euro. Kein Währungsrisiko also, nur ein Schuldner auf der anderen Rheinseite.</p>
<h2 id="was">Was sind OAT?</h2>
<p>Herausgeber ist die Agence France Trésor, die Finanzagentur des französischen Staates. Die Laufzeiten reichen von wenigen Jahren bis über dreißig Jahre. Klassische OAT sind unspektakulär im besten Sinne: Sie zahlen einen <strong>festen jährlichen Kupon</strong>, wie Bundesanleihen, und am Ende gibt es den Nennwert zurück. Daneben existieren die inflationsindexierten OATi und OAT€i. Sie hängen an der Inflation; wer sie mit einer nominalen Rendite vergleicht, vergleicht Äpfel mit Birnen.</p>
<h2 id="wo">Wo kann man OAT kaufen?</h2>
<p>Zu den Auktionen des französischen Staates haben nur Spezialisten Zutritt; Privatanleger kaufen am <strong>Sekundärmarkt</strong>. Der Heimatmarkt ist Euronext Paris, doch viele OAT sind auch an deutschen Börsenplätzen handelbar. Nach Paris reisen muss niemand. Vor der Order lohnt ein Blick auf:</p>
<ul>
<li>den Börsenplatz und die Ordergebühren Ihrer Bank oder Ihres Brokers;</li>
<li>die <strong>Mindestanlage</strong>, die je nach Anbieter und Börsenplatz unterschiedlich ausfällt;</li>
<li>die Spanne zwischen Geld- und Briefkurs, die an kleineren Börsenplätzen gern breiter ist.</li>
</ul>
<h2 id="kurs">Kurs und Rendite</h2>
<p>Der Kurs wird in Prozent des Nennwerts notiert: Bei 97 zahlen Sie 970 € und bekommen 1.000 € zurück. Hinzu kommen die Stückzinsen seit dem letzten Kupon. Für den Vergleich zählt die <a href="/de/ratgeber/rendite-bis-faelligkeit">Rendite bis Fälligkeit</a>; der Kupon allein sagt so viel wie eine PS-Zahl ohne Preisschild. Wie empfindlich der Kurs auf Zinsänderungen reagiert, zeigt die <a href="/de/ratgeber/duration-anleihen">Duration</a>.</p>
<p>Den Renditeaufschlag der OAT gegenüber <a href="/de/anleihen/bundesanleihen">Bundesanleihen</a> nennt der Markt OAT-Bund-Spread. Dieses tägliche Zeugnis zeigt, wie der Markt die Kreditqualität Frankreichs im Vergleich zu Deutschland einschätzt. Aktuelle Renditen je Laufzeit stehen auf der Seite <a href="/de/anleihen/franzoesische-staatsanleihen">französische Staatsanleihen</a>.</p>
<h2 id="steuern">Steuern</h2>
<p>Im deutschen Depot behandelt das Finanzamt die OAT wie einen alten Bekannten. Für Anleger mit Wohnsitz in Deutschland unterliegen Zinsen und Kursgewinne aus OAT der <strong>Abgeltungsteuer</strong> (25 % zuzüglich Solidaritätszuschlag und gegebenenfalls Kirchensteuer), genau wie bei Bundesanleihen. Die Bank führt die Steuer ab, und der Sparer-Pauschbetrag gilt auch hier. Details bitte beim Finanzamt oder einem Steuerberater prüfen.</p>
<h2 id="risiken">Risiken</h2>
<ul>
<li><strong>Zinsänderungsrisiko</strong>: Wer vor Fälligkeit verkauft, nachdem die Zinsen gestiegen sind, kann Verlust machen.</li>
<li><strong>Kreditrisiko</strong>: gering, aber höher als bei Bundesanleihen; Frankreichs Rating kann sich ändern.</li>
<li><strong>Liquidität</strong>: Bei kleinen Beträgen und an Nebenbörsen können die Kursspannen breit ausfallen.</li>
</ul>
<h2 id="faq">Häufige Fragen</h2>
<h3>Haben OAT ein Währungsrisiko?</h3>
<p>Nein. Klassische OAT lauten auf Euro, der Wechselkurs spielt keine Rolle.</p>
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
<p><strong>In breve:</strong> il conto deposito vincolato offre un tasso fisso per un periodo fisso, e il capitale è protetto dal Fondo di garanzia dei depositi fino a 100.000 euro per banca. Un BTP o un'obbligazione offre una cedola e un rendimento noto se la tieni fino a scadenza, ma nel frattempo il prezzo oscilla e la sicurezza dipende da chi l'ha emessa.</p>
<p>A prima vista sono parenti stretti: in entrambi i casi presti denaro per un certo tempo e in cambio ricevi un interesse. Come spesso accade fra parenti, però, le differenze vengono fuori nei dettagli: garanzie, tasse e che cosa succede se i soldi ti servono prima del previsto.</p>
<h2 id="garanzie">Garanzie e rischio</h2>
<p>Il denaro sul conto deposito è coperto dal <strong>Fondo Interbancario di Tutela dei Depositi</strong> fino a 100.000 euro per depositante e per banca. L'obbligazione non ha questa rete sotto: vale quanto vale chi l'ha emessa. Per un BTP conta la solidità dello Stato italiano, per un'obbligazione societaria quella dell'azienda. Il rating è una buona bussola per orientarsi sul <a href="/it/guide/rischio-di-credito-obbligazioni">rischio di credito</a>.</p>
<h2 id="tasse">Tassazione</h2>
<p>Qui il fisco ha le sue preferenze, e non le nasconde. Gli interessi del conto deposito pagano il <strong>26%</strong>. Le cedole dei BTP e dei titoli di Stato dei Paesi che scambiano informazioni con l'Italia pagano il <strong>12,5%</strong>, mentre le obbligazioni societarie tornano al 26%. Risultato: a parità di tasso lordo, il titolo di Stato lascia più soldi in tasca. Sia il conto deposito sia il conto titoli scontano l'imposta di bollo annuale.</p>
<h2 id="uscire">Se ti servono i soldi prima</h2>
<p>Il conto <strong>vincolato</strong> fa onore al suo nome: di solito non si può svincolare, oppure lo si può fare rinunciando a parte degli interessi, a seconda del contratto. Il BTP invece si vende in Borsa in qualsiasi giorno di mercato, ma al prezzo del momento. Se nel frattempo i tassi sono saliti, il prezzo è sceso e la vendita può chiudersi in perdita. Di quanto, lo dice la <a href="/it/guide/duration-obbligazioni">duration</a>.</p>
<h2 id="rendimento">Come confrontare il rendimento</h2>
<p>Sul conto deposito i numeri da guardare sono due: il tasso annuo lordo e la durata del vincolo. Su un'obbligazione il numero giusto è il <a href="/it/guide/rendimento-a-scadenza">rendimento a scadenza</a>, che tiene conto anche del prezzo pagato. La regola è confrontare sempre al netto delle tasse e alla stessa durata; altrimenti si finisce per paragonare il caffè al banco con quello al tavolo e stupirsi del conto.</p>
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
<p>Fino a 100.000 euro per banca è protetto dal fondo di garanzia. Un BTP questa copertura non ce l'ha, ma alle spalle ha lo Stato che lo emette.</p>
<h3>Posso usare entrambi?</h3>
<p>Sì, e molti risparmiatori lo fanno: una parte resta sul conto deposito, un'altra va in titoli con scadenze diverse.</p>
${ctaIt("scopri quali obbligazioni rendono di più alla scadenza che ti serve")}
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
<p><strong>En bref :</strong> le compte à terme verse un taux fixe pendant une durée fixe, et l'argent bénéficie de la garantie des dépôts jusqu'à 100 000 € par banque. Une obligation verse un coupon et offre un rendement connu si on la conserve jusqu'à l'échéance, mais son prix varie en chemin et sa sécurité dépend de l'émetteur.</p>
<p>Sur le papier, les deux se ressemblent comme des cousins : vous prêtez votre argent pour un temps, on vous paie des intérêts. Les écarts apparaissent quand on regarde la garantie, la fiscalité et, surtout, ce qui se passe si vous avez besoin de l'argent avant la fin.</p>
<h2 id="garantie">Garantie et risque</h2>
<p>Les dépôts, comptes à terme compris, sont couverts par le <strong>Fonds de Garantie des Dépôts et de Résolution (FGDR)</strong> jusqu'à 100 000 € par déposant et par établissement. L'obligation ne bénéficie pas de ce filet : elle vaut exactement ce que vaut son émetteur. Une OAT repose sur la solidité de l'État français, une obligation d'entreprise sur celle de la société. La notation aide à jauger ce <a href="/fr/guides/risque-de-credit-obligataire">risque de crédit</a>.</p>
<h2 id="livrets">Et les livrets réglementés ?</h2>
<p>Le Livret A et le LDDS cumulent deux qualités rares : l'argent reste disponible à tout moment et les intérêts échappent à l'impôt. La contrepartie, c'est un taux fixé par l'État et un montant plafonné. Une fois le plafond atteint, le livret a fait sa part du travail, et le choix se joue entre compte à terme, obligations et autres placements.</p>
<h2 id="fiscalite">Fiscalité</h2>
<p>Sur ce terrain, c'est presque match nul. Les intérêts d'un compte à terme comme les coupons d'une obligation détenue en compte-titres relèvent en principe du prélèvement forfaitaire unique, de 31,4 % en 2026, sauf option pour le barème progressif. À taux brut égal, la fiscalité est donc proche ; elle reste à vérifier sur impots.gouv.fr.</p>
<h2 id="sortie">Si vous avez besoin de l'argent avant</h2>
<p>Un compte à terme peut souvent être clôturé avant l'échéance, mais le contrat prévoit alors des intérêts réduits : la banque vous laisse partir, pas avec tout ce qu'elle avait promis. Une obligation se revend en Bourse n'importe quel jour de marché, au prix du moment. Si les taux ont monté entre-temps, ce prix a baissé, et la <a href="/fr/guides/duration-obligations">duration</a> indique de combien.</p>
<h2 id="comparer">Comment comparer</h2>
<p>Côté compte à terme, deux chiffres suffisent : le taux annuel brut et la durée de blocage. Côté obligation, le bon indicateur est le <a href="/fr/guides/calcul-rendement-obligation">rendement à l'échéance</a>, qui intègre le prix payé. Comparez toujours à durée égale et après impôt, faute de quoi vous chronométrez un sprint contre un marathon.</p>
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
<p>Jusqu'à 100 000 € par banque, il est couvert par le FGDR. Une OAT ne bénéficie pas de cette garantie, mais c'est l'État qui l'émet.</p>
<h3>Peut-on combiner les deux ?</h3>
<p>Oui, et c'est même courant : beaucoup d'épargnants gardent une réserve disponible et placent le reste en obligations à différentes échéances.</p>
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
<p><strong>Kurz gesagt:</strong> Festgeld bringt einen festen Zins für eine feste Zeit und ist im Rahmen der gesetzlichen Einlagensicherung bis 100.000 € pro Bank geschützt. Eine Anleihe bringt einen Kupon und eine bekannte Rendite, sofern Sie sie bis zur Fälligkeit halten. Unterwegs schwankt allerdings ihr Kurs, und sicher ist sie genau so sehr wie ihr Emittent.</p>
<p>Im Kern tun Sie in beiden Fällen dasselbe: Sie verleihen Geld auf Zeit und bekommen Zinsen dafür. Die Unterschiede stecken, wie so oft, im Kleingedruckten, nämlich bei Sicherheit, Verfügbarkeit und Auswahl.</p>
<h2 id="sicherheit">Sicherheit</h2>
<p>Festgeld fällt unter die <strong>gesetzliche Einlagensicherung</strong>: 100.000 € pro Kunde und Bank in der EU. Viele deutsche Banken gehören zusätzlich freiwilligen Sicherungssystemen an, Gürtel und Hosenträger gewissermaßen. Eine Anleihe kennt keine Einlagensicherung. Eine <a href="/de/ratgeber/bundesanleihen">Bundesanleihe</a> hängt an der Bonität des Bundes, eine Unternehmensanleihe an der des Unternehmens. Beim Einschätzen dieses <a href="/de/ratgeber/kreditrisiko-anleihen">Kreditrisikos</a> hilft das Rating.</p>
<h2 id="verfuegbarkeit">Verfügbarkeit</h2>
<p>Festgeld heißt nicht ohne Grund so: Es ist in der Regel bis zum Laufzeitende gebunden, eine vorzeitige Kündigung ist meist nicht vorgesehen. Anleihen lassen sich dagegen an jedem Börsentag verkaufen, allerdings zum aktuellen Kurs. Sind die Zinsen gestiegen, ist der Kurs gefallen, und der Verkauf kann mit Verlust enden. Wie stark, zeigt die <a href="/de/ratgeber/duration-anleihen">Duration</a>.</p>
<h2 id="steuern">Steuern</h2>
<p>Beim Zins selbst macht das Finanzamt keinen Unterschied. Zinsen aus Festgeld und Kupons aus Anleihen unterliegen beide der <strong>Abgeltungsteuer</strong> (25 % zuzüglich Solidaritätszuschlag und gegebenenfalls Kirchensteuer), und der Sparer-Pauschbetrag gilt für beide zusammen. Bei Anleihen kommt eine Ebene hinzu: Kursgewinne sind ebenfalls steuerpflichtig, Kursverluste lassen sich dafür verrechnen. Details bitte beim Finanzamt oder einem Steuerberater prüfen.</p>
<h2 id="rendite">Rendite vergleichen</h2>
<p>Beim Festgeld zählen zwei Zahlen: der Zinssatz pro Jahr und die Laufzeit. Bei einer Anleihe zählt die <a href="/de/ratgeber/rendite-bis-faelligkeit">Rendite bis Fälligkeit</a>, in die auch der gezahlte Kurs einfließt. Verglichen wird immer bei gleicher Laufzeit, sonst stellt man einen Monatslohn neben ein Jahresgehalt. Wo Anleihen klar punkten, ist die Auswahl: Laufzeiten von wenigen Monaten bis zu Jahrzehnten, und wer möchte, kann sich eine Rendite für lange Zeit sichern.</p>
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
<p>Bis 100.000 € pro Bank schützt es die Einlagensicherung. Eine Bundesanleihe hat diesen Schutz nicht, zurückgezahlt wird sie aber vom Bund.</p>
<h3>Kann man beides kombinieren?</h3>
<p>Ja, und viele Sparer tun genau das: Eine Reserve bleibt auf Tages- oder Festgeld, der Rest geht in Anleihen mit verschiedenen Laufzeiten.</p>
${ctaDe("finden Sie Anleihen nach Rendite und Laufzeit")}
${notaDe}`,
  },
];
