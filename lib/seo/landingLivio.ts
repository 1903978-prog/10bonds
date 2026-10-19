import type { Locale } from "./locales";

// Livio's 16 Italian landing pages (19 Oct 2026), one per tracked Italian keyword. His own text, approved by him:
// kept word for word, only turned into HTML. His notes to us ("Elemento SEO essenziale", "Nota tecnica") are not
// page text and are left out. Guides (/it/guide/...) go into the guide store; the others sit on the comparison
// pages, the calculator and the broker page, next to the live data they describe.

export type Landing = { n: number; keyword: string; path: string; seoTitle: string; metaDescription: string; h1: string; bodyHtml: string };

export const LIVIO_LANDINGS: Landing[] = [
  {
    n: 1,
    keyword: "Rendimenti BTP",
    path: "/it/obbligazioni/btp",
    seoTitle: "Rendimenti BTP: Tassi, Scadenze e Confronto",
    metaDescription: "Consulta e confronta i rendimenti dei BTP italiani per scadenza, cedola e prezzo. Scopri le differenze tra rendimento lordo, netto e duration.",
    h1: "Rendimenti BTP: come confrontare i titoli di Stato italiani",
    bodyHtml: `<p>I rendimenti dei BTP rappresentano uno dei principali indicatori utilizzati dagli investitori per confrontare i titoli di Stato italiani. Ma non tutti i BTP offrono lo stesso rendimento, anche quando sono emessi dallo stesso Stato.</p>
<p>Il rendimento dipende soprattutto da <strong>prezzo di mercato, cedola, scadenza residua e struttura finanziaria del titolo</strong>.</p>
<h2 id="come-leggere-i-rendimenti-btp">Come leggere i rendimenti BTP</h2>
<p>Il rendimento effettivo a scadenza, o Yield to Maturity (YTM), tiene conto del prezzo pagato e dei flussi finanziari previsti fino al rimborso.</p>
<p>Un BTP acquistato sotto la pari può avere un rendimento a scadenza superiore alla cedola nominale. Viceversa, un BTP acquistato sopra la pari può avere un rendimento inferiore alla cedola.</p>
<p>Per effettuare un confronto corretto, è utile considerare:</p>
<ul><li>Rendimento effettivo lordo e netto.</li><li>Prezzo di mercato e valore nominale.</li><li>Scadenza residua.</li><li>Duration e sensibilità ai tassi.</li><li>Costi di negoziazione e liquidità.</li></ul>
<h2 id="btp-a-breve-e-lunga-scadenza">BTP a breve e lunga scadenza</h2>
<p>I titoli con scadenza ravvicinata presentano generalmente una sensibilità alle variazioni dei tassi inferiore rispetto ai titoli di durata molto elevata, a parità di altre condizioni.</p>
<p>Un rendimento superiore non significa necessariamente che un titolo sia più conveniente: occorre considerare il rischio e le condizioni dell'investimento.</p>
<h2 id="confronta-i-rendimenti">Confronta i rendimenti</h2>
<p>Utilizza la nostra tabella BTP per confrontare i titoli disponibili in base alle informazioni di mercato aggiornate.</p>
<p><a class="cta" href="/it">Confronta le obbligazioni per rischio e durata</a></p>
<p><em>I rendimenti dipendono dalle quotazioni e non costituiscono una garanzia di risultato.</em></p>`,
  },
  {
    n: 2,
    keyword: "BTP rendimento netto",
    path: "/it/calcolatori/rendimento-netto-btp",
    seoTitle: "BTP Rendimento Netto: Calcolo, Tasse ed Esempi",
    metaDescription: "Come calcolare il rendimento netto di un BTP? Scopri l'effetto delle tasse al 12,5%, delle cedole, del prezzo di acquisto e delle commissioni.",
    h1: "BTP rendimento netto: come calcolarlo correttamente",
    bodyHtml: `<p>Il rendimento netto di un BTP indica il rendimento dell'investimento dopo aver considerato il trattamento fiscale applicabile. Per valutare il risultato economico complessivo occorre inoltre includere i costi di acquisto e gestione.</p>
<p>In Italia, i BTP beneficiano generalmente di un'aliquota fiscale agevolata del <strong>12,5%</strong> sui redditi soggetti al relativo regime.</p>
<h2 id="esempio-di-calcolo-della-cedola-netta">Esempio di calcolo della cedola netta</h2>
<p>Consideriamo un BTP con:</p>
<ul><li>Valore nominale: €10.000.</li><li>Cedola annua lorda: 4%.</li><li>Cedola annua lorda in euro: €400.</li><li>Imposta ipotizzata: €50.</li><li>Cedola annua netta: €350.</li></ul>
<p>La cedola netta rappresenta quindi il 3,5% del capitale nominale.</p>
<p><strong>Attenzione:</strong> la cedola netta non coincide necessariamente con il rendimento effettivo netto a scadenza.</p>
<h2 id="perche-il-prezzo-di-acquisto-e-importante">Perché il prezzo di acquisto è importante?</h2>
<p>Se un BTP viene acquistato sotto la pari, la differenza tra il prezzo pagato e il valore di rimborso può contribuire al rendimento complessivo.</p>
<p>Se viene acquistato sopra la pari, tale differenza può invece ridurlo.</p>
<p>Il calcolo effettivo richiede di considerare tutti i flussi finanziari, le date dei pagamenti, il trattamento fiscale e le commissioni.</p>
<h2 id="come-confrontare-i-rendimenti-netti">Come confrontare i rendimenti netti</h2>
<p>Due obbligazioni con rendimento lordo identico possono avere rendimenti netti differenti, soprattutto quando sono soggette a regimi fiscali diversi.</p>
<p><a class="cta" href="#calcolatore">Calcola il rendimento netto di un BTP</a></p>
<p><em>Il trattamento fiscale effettivo dipende dalla situazione dell'investitore e dalle caratteristiche del titolo.</em></p>`,
  },
  {
    n: 3,
    keyword: "BTP: guida completa",
    path: "/it/guide/btp",
    seoTitle: "BTP: Cosa Sono, Come Funzionano e Quali Rischi Hanno",
    metaDescription: "Guida ai BTP italiani: cedole, scadenze, rendimento, tassazione, prezzi e rischi. Scopri come funzionano i titoli di Stato.",
    h1: "BTP: cosa sono e come funzionano i Buoni del Tesoro Poliennali",
    bodyHtml: `<p>I <strong>BTP, Buoni del Tesoro Poliennali</strong>, sono titoli di debito emessi dallo Stato italiano per finanziare il debito pubblico.</p>
<p>Chi acquista un BTP diventa creditore dello Stato italiano e acquisisce il diritto ai pagamenti previsti dalle condizioni di emissione.</p>
<h2 id="come-funzionano-le-cedole">Come funzionano le cedole</h2>
<p>I BTP tradizionali a tasso fisso prevedono normalmente cedole semestrali e il rimborso del valore nominale alla scadenza, salvo eventi di credito.</p>
<p>Esistono anche diverse categorie di BTP, tra cui strumenti indicizzati all'inflazione e prodotti destinati in particolare agli investitori retail.</p>
<h2 id="perche-il-prezzo-di-un-btp-cambia">Perché il prezzo di un BTP cambia?</h2>
<p>Il prezzo dei BTP già emessi varia sul mercato secondario.</p>
<p>In generale, quando i rendimenti di mercato aumentano, il prezzo di un'obbligazione a tasso fisso tende a diminuire. Quando i rendimenti diminuiscono, il prezzo tende ad aumentare.</p>
<p>Questo effetto è generalmente più pronunciato nei titoli con duration elevata.</p>
<h2 id="quali-sono-i-rischi-principali">Quali sono i rischi principali?</h2>
<ul><li>Rischio di credito dello Stato emittente.</li><li>Rischio di prezzo in caso di vendita anticipata.</li><li>Rischio di inflazione.</li><li>Rischio di liquidità.</li><li>Costo opportunità rispetto ad altri investimenti.</li></ul>
<h2 id="come-confrontare-btp-differenti">Come confrontare BTP differenti?</h2>
<p>Il solo tasso cedolare non è sufficiente. Bisogna considerare anche il rendimento a scadenza, la duration, il prezzo e la liquidità.</p>
<p><a class="cta" href="/it/obbligazioni/btp">Esplora i rendimenti dei BTP e confrontali con altre obbligazioni</a></p>`,
  },
  {
    n: 4,
    keyword: "BTP o ETF obbligazionari",
    path: "/it/guide/btp-o-etf-obbligazionari",
    seoTitle: "BTP o ETF Obbligazionari? Differenze, Costi e Rischi",
    metaDescription: "BTP ed ETF obbligazionari a confronto: cedole, scadenze, diversificazione, costi e rischi. Scopri come funzionano i due strumenti.",
    h1: "BTP o ETF obbligazionari: quali sono le differenze?",
    bodyHtml: `<p>I BTP e gli ETF obbligazionari permettono di ottenere esposizione al mercato dei titoli di debito, ma funzionano in modo diverso.</p>
<p>Un BTP è una singola obbligazione emessa dallo Stato italiano. Un ETF obbligazionario è un fondo negoziato in borsa che investe in un insieme di strumenti obbligazionari.</p>
<h2 id="scadenza-e-rimborso">Scadenza e rimborso</h2>
<p>Un BTP tradizionale ha una data di scadenza e condizioni di rimborso definite.</p>
<p>Un ETF obbligazionario tradizionale, invece, generalmente mantiene un portafoglio di titoli e non prevede il rimborso dell'investimento a una scadenza unica.</p>
<p>Esistono anche ETF obbligazionari a scadenza definita, che presentano caratteristiche differenti rispetto ai fondi tradizionali.</p>
<h2 id="diversificazione">Diversificazione</h2>
<p>Acquistare un singolo BTP significa assumere un'esposizione specifica al debito dello Stato italiano.</p>
<p>Un ETF può offrire una diversificazione tra diversi emittenti e scadenze, a seconda della sua composizione.</p>
<h2 id="costi-e-rischi">Costi e rischi</h2>
<p>Nel confronto occorre verificare:</p>
<ul><li>Commissioni di negoziazione.</li><li>Costi correnti del fondo, ove applicabili.</li><li>Spread denaro-lettera.</li><li>Sensibilità ai tassi.</li><li>Rischio di credito.</li><li>Trattamento fiscale.</li></ul>
<p>Non esiste una risposta valida per tutti gli investitori: si tratta di strumenti con caratteristiche strutturali differenti.</p>
<p><a class="cta" href="/it">Approfondisci il rendimento e il rischio delle singole obbligazioni</a></p>`,
  },
  {
    n: 5,
    keyword: "BTP o obbligazioni corporate",
    path: "/it/guide/btp-o-obbligazioni-corporate",
    seoTitle: "BTP vs Obbligazioni Corporate: Rendimenti e Rischi",
    metaDescription: "Confronto tra BTP e obbligazioni societarie: rating, rendimento a scadenza, tassazione, duration e rischio di credito.",
    h1: "BTP o obbligazioni corporate: confronto tra rendimento e rischio",
    bodyHtml: `<p>Le obbligazioni possono essere emesse dagli Stati oppure dalle imprese.</p>
<p>I BTP sono titoli di Stato italiani. Le obbligazioni corporate sono titoli di debito emessi da società per raccogliere finanziamenti.</p>
<h2 id="da-cosa-dipende-il-rendimento">Da cosa dipende il rendimento?</h2>
<p>Il rendimento richiesto dal mercato dipende da diversi fattori, tra cui rischio di credito, scadenza, liquidità e struttura contrattuale.</p>
<p>Un'obbligazione societaria può offrire un rendimento superiore a quello di un BTP con duration simile, ma tale differenza può riflettere rischi differenti.</p>
<h2 id="il-ruolo-del-rating">Il ruolo del rating</h2>
<p>Il rating esprime una valutazione della qualità creditizia dell'emittente o di una specifica emissione.</p>
<p>Le obbligazioni corporate possono appartenere alla categoria investment grade oppure speculative grade.</p>
<p>Nel confronto è importante considerare anche seniority, eventuali garanzie, clausole di rimborso anticipato e liquidità.</p>
<h2 id="la-differenza-fiscale">La differenza fiscale</h2>
<p>Per gli investitori soggetti al regime italiano ordinario, i BTP beneficiano generalmente dell'aliquota del 12,5%, mentre molte obbligazioni corporate sono soggette all'aliquota del 26%.</p>
<p>Questo può influenzare il confronto dei rendimenti netti.</p>
<h2 id="un-confronto-omogeneo">Un confronto omogeneo</h2>
<p>Per valutare le differenze è opportuno analizzare titoli con scadenza, duration e valuta comparabili, mantenendo visibile il diverso rischio creditizio.</p>
<p><a class="cta" href="/it">Confronta BTP e obbligazioni corporate per durata e rischio</a></p>`,
  },
  {
    n: 6,
    keyword: "Come calcolare il rendimento a scadenza",
    path: "/it/guide/rendimento-a-scadenza",
    seoTitle: "Rendimento a Scadenza Obbligazioni: Calcolo YTM",
    metaDescription: "Scopri come calcolare il rendimento effettivo a scadenza (YTM) di un'obbligazione, con formule, esempi e differenze rispetto alla cedola.",
    h1: "Come calcolare il rendimento a scadenza di un'obbligazione",
    bodyHtml: `<p>Il <strong>rendimento effettivo a scadenza</strong>, noto anche come Yield to Maturity (YTM), è uno degli indicatori principali per confrontare obbligazioni con cedole, prezzi e scadenze differenti.</p>
<p>Il rendimento a scadenza è il tasso di attualizzazione che rende uguale il valore attuale dei flussi finanziari futuri al prezzo dell'obbligazione.</p>
<h2 id="cedola-e-rendimento-a-scadenza-la-differenza">Cedola e rendimento a scadenza: la differenza</h2>
<p>Immaginiamo un'obbligazione con:</p>
<ul><li>Valore nominale: €1.000.</li><li>Cedola annuale: €40.</li><li>Prezzo di acquisto: €950.</li><li>Scadenza residua: cinque anni.</li></ul>
<p>La cedola nominale è pari al 4% del valore nominale.</p>
<p>Il rendimento a scadenza, però, considera anche la differenza tra €950 pagati e €1.000 rimborsati alla scadenza.</p>
<p>Se assumiamo cedole annuali, rimborso integrale e nessun costo aggiuntivo, il rendimento lordo effettivo a scadenza è circa il 5,16%.</p>
<h2 id="come-si-calcola-il-ytm">Come si calcola il YTM?</h2>
<p>Il calcolo risolve l'equazione che uguaglia il prezzo ai flussi futuri attualizzati.</p>
<p>Per un'obbligazione a cedola fissa, i flussi comprendono le cedole e il rimborso finale.</p>
<p>Nella pratica occorre considerare anche frequenza cedolare, convenzioni di calcolo, date effettive e rateo maturato.</p>
<h2 id="perche-utilizzare-il-rendimento-a-scadenza">Perché utilizzare il rendimento a scadenza?</h2>
<p>Permette di confrontare obbligazioni con caratteristiche contrattuali differenti, ma non elimina le differenze di rischio.</p>
<p>Il YTM non rappresenta un rendimento garantito: presuppone che i flussi previsti vengano effettivamente pagati e che il titolo sia mantenuto fino alla scadenza.</p>
<p><a class="cta" href="/it">Confronta rendimento a scadenza e durata delle obbligazioni</a></p>`,
  },
  {
    n: 7,
    keyword: "Duration obbligazioni",
    path: "/it/guide/duration-obbligazioni",
    seoTitle: "Duration Obbligazioni: Significato, Formula ed Esempi",
    metaDescription: "Cos'è la duration di un'obbligazione? Scopri come misura il rischio di tasso, la differenza con la scadenza e gli effetti sui prezzi.",
    h1: "Duration obbligazioni: cos'è e perché è importante",
    bodyHtml: `<p>La duration è uno degli indicatori più utilizzati per analizzare la sensibilità del prezzo di un'obbligazione alle variazioni dei rendimenti di mercato.</p>
<p>Non va confusa con la scadenza residua.</p>
<h2 id="scadenza-e-duration-qual-e-la-differenza">Scadenza e duration: qual è la differenza?</h2>
<p>La scadenza rappresenta il tempo che manca al rimborso contrattuale del capitale.</p>
<p>La duration di Macaulay misura invece il tempo medio ponderato dei flussi finanziari attualizzati.</p>
<p>La duration modificata misura approssimativamente la sensibilità percentuale del prezzo alle variazioni del rendimento.</p>
<h2 id="esempio-pratico">Esempio pratico</h2>
<p>Consideriamo un'obbligazione con duration modificata pari a cinque anni.</p>
<p>Se il rendimento di mercato aumenta di un punto percentuale, il prezzo potrebbe diminuire approssimativamente del 5%.</p>
<p>Se il rendimento diminuisce di un punto percentuale, il prezzo potrebbe aumentare approssimativamente del 5%.</p>
<p>Si tratta di un'approssimazione valida per variazioni relativamente contenute: la relazione effettiva dipende anche dalla convessità.</p>
<h2 id="perche-la-duration-e-utile">Perché la duration è utile?</h2>
<p>Permette di confrontare il rischio di tasso di obbligazioni con caratteristiche diverse.</p>
<p>Due obbligazioni con la stessa scadenza possono avere duration differenti perché pagano cedole diverse.</p>
<p>Viceversa, due titoli con scadenze differenti possono presentare duration relativamente simili.</p>
<h2 id="come-interpretare-la-duration">Come interpretare la duration</h2>
<p>In generale, una duration più elevata significa una sensibilità maggiore alle variazioni dei rendimenti di mercato.</p>
<p>Questo non coincide con il rischio di insolvenza dell'emittente, che deve essere analizzato separatamente.</p>
<p><a class="cta" href="/it">Confronta obbligazioni per duration, rendimento e rischio</a></p>`,
  },
  {
    n: 8,
    keyword: "Migliori broker obbligazioni",
    path: "/it/broker-obbligazioni",
    seoTitle: "Broker Obbligazioni: Commissioni e Servizi a Confronto",
    metaDescription: "Confronta broker per acquistare BTP e obbligazioni corporate: commissioni, costi di custodia, mercati disponibili e servizi di negoziazione.",
    h1: "Broker obbligazioni: come confrontare commissioni e servizi",
    bodyHtml: `<p>La scelta dell'intermediario può influenzare i costi effettivi di negoziazione delle obbligazioni.</p>
<p>Quando si confrontano broker e banche, è utile andare oltre la sola commissione pubblicizzata e valutare quali mercati e titoli siano effettivamente accessibili.</p>
<h2 id="quali-costi-verificare">Quali costi verificare?</h2>
<p>I principali elementi sono:</p>
<ul><li>Commissione di acquisto e vendita.</li><li>Commissione minima per operazione.</li><li>Costi di custodia e mantenimento del conto.</li><li>Eventuali spese di mercato e regolamento.</li><li>Costi di conversione valutaria.</li><li>Spread denaro-lettera.</li></ul>
<h2 id="esempio-di-confronto-commissionale">Esempio di confronto commissionale</h2>
<p>Immaginiamo due strutture tariffarie ipotetiche:</p>
<p><strong>Broker A:</strong> commissione dello 0,20% con minimo €5.</p>
<p><strong>Broker B:</strong> commissione fissa di €10.</p>
<p>Per una transazione da €2.000, la commissione applicabile del Broker A sarebbe €5, mentre quella del Broker B sarebbe €10.</p>
<p>Su una transazione da €20.000, il Broker A applicherebbe €40, contro €10 del Broker B.</p>
<p>L'esempio mostra perché il confronto dipende dall'importo negoziato.</p>
<p>I costi effettivi possono inoltre variare per mercato, account e tipologia di obbligazione.</p>
<h2 id="tutti-i-broker-offrono-le-stesse-obbligazioni">Tutti i broker offrono le stesse obbligazioni?</h2>
<p>No. La disponibilità può differire per mercato, ISIN, controvalore minimo, valuta e condizioni operative.</p>
<p>Un broker può consentire la negoziazione di BTP italiani ma offrire una scelta più limitata di obbligazioni corporate internazionali.</p>
<h2 id="come-effettuare-il-confronto">Come effettuare il confronto</h2>
<p>La nostra sezione dedicata permette di esaminare le strutture tariffarie dei broker utilizzando informazioni documentate e indicando la data dell'ultima verifica.</p>
<p><a class="cta" href="#cost-table">Consulta il confronto delle commissioni dei broker obbligazionari</a></p>
<p><em>Le eventuali collaborazioni commerciali vengono indicate separatamente e non modificano la metodologia di confronto.</em></p>`,
  },
  {
    n: 9,
    keyword: "Migliori obbligazioni 2026",
    path: "/it/obbligazioni/migliori-obbligazioni",
    seoTitle: "Obbligazioni 2026: Confronto Rendimenti e Rating",
    metaDescription: "Quali obbligazioni confrontare nel 2026? Analizza rendimento a scadenza, rating, duration e caratteristiche dei titoli di Stato e corporate.",
    h1: "Migliori obbligazioni 2026: come confrontare rendimento e rischio",
    bodyHtml: `<p>La ricerca delle migliori obbligazioni nel 2026 richiede un confronto tra rendimenti disponibili, qualità creditizia, duration e scadenza residua.</p>
<p>Non esiste un singolo titolo universalmente migliore: obbligazioni diverse possono presentare combinazioni differenti di rischio e rendimento.</p>
<h2 id="le-principali-categorie-da-confrontare">Le principali categorie da confrontare</h2>
<p><strong>Titoli di Stato italiani:</strong> includono BTP con diverse scadenze e strutture cedolari.</p>
<p><strong>Titoli di Stato europei:</strong> comprendono obbligazioni emesse da Germania, Francia e altri paesi.</p>
<p><strong>Obbligazioni corporate investment grade:</strong> sono emesse da imprese o gruppi con rating appartenenti alla categoria investment grade.</p>
<p><strong>Obbligazioni speculative grade:</strong> possono offrire rendimenti più elevati, accompagnati generalmente da maggiore rischio di credito.</p>
<h2 id="quali-indicatori-utilizzare">Quali indicatori utilizzare?</h2>
<p>Un confronto efficace dovrebbe considerare:</p>
<ul><li>Rendimento effettivo a scadenza.</li><li>Duration.</li><li>Rating creditizio.</li><li>Tipo di emittente.</li><li>Valuta.</li><li>Liquidità e condizioni contrattuali.</li></ul>
<h2 id="perche-il-rendimento-da-solo-non-basta">Perché il rendimento da solo non basta</h2>
<p>Un'obbligazione che offre un rendimento del 6% può avere rischi significativamente differenti rispetto a un titolo con rendimento del 4%.</p>
<p>Il maggiore rendimento può riflettere un rischio di credito più elevato, una scadenza più lunga, una struttura subordinata o una liquidità inferiore.</p>
<h2 id="confronta-le-obbligazioni-disponibili">Confronta le obbligazioni disponibili</h2>
<p>Il nostro strumento organizza le obbligazioni sulla base di criteri verificabili, permettendo di analizzare le differenze tra strumenti con caratteristiche comparabili.</p>
<p><a class="cta" href="/it">Esplora il confronto delle obbligazioni per rischio e durata</a></p>
<p><em>Le informazioni costituiscono analisi comparative e non indicazioni personalizzate di investimento.</em></p>`,
  },
  {
    n: 10,
    keyword: "Migliori obbligazioni a 5 anni",
    path: "/it/obbligazioni/duration-5-anni",
    seoTitle: "Obbligazioni a 5 Anni: Rendimenti, Rating e Duration",
    metaDescription: "Confronta le obbligazioni con scadenza residua di circa 5 anni. Analizza rendimenti, rating, duration e differenze tra titoli di Stato e corporate.",
    h1: "Obbligazioni a 5 anni: confronto di rendimenti e rischio",
    bodyHtml: `<p>Le obbligazioni con un orizzonte residuo di circa cinque anni rappresentano una categoria frequentemente analizzata da chi desidera confrontare titoli a durata intermedia.</p>
<p>Per effettuare un confronto significativo, è importante distinguere tra <strong>scadenza residua di cinque anni</strong> e <strong>duration pari a cinque anni</strong>.</p>
<p>Non sono la stessa cosa.</p>
<h2 id="scadenza-di-cinque-anni">Scadenza di cinque anni</h2>
<p>Un'obbligazione con scadenza residua di cinque anni prevede il rimborso contrattuale del capitale tra circa cinque anni, salvo eventi di credito o condizioni contrattuali particolari.</p>
<p>La sua duration può essere inferiore, soprattutto in presenza di cedole relativamente elevate.</p>
<h2 id="quali-obbligazioni-confrontare">Quali obbligazioni confrontare?</h2>
<p>Nella categoria possono rientrare:</p>
<ul><li>BTP italiani.</li><li>Titoli di Stato di altri paesi europei.</li><li>Obbligazioni corporate investment grade.</li><li>Obbligazioni con rating inferiore all'investment grade.</li></ul>
<h2 id="rendimento-e-rischio">Rendimento e rischio</h2>
<p>Due titoli con scadenza residua comparabile possono offrire rendimenti molto differenti.</p>
<p>Per comprendere questa differenza occorre valutare il rating, la struttura dell'emissione, la valuta e la liquidità.</p>
<p>Il confronto dovrebbe distinguere chiaramente il rendimento lordo dal rischio associato all'emittente.</p>
<h2 id="come-utilizzare-il-confronto">Come utilizzare il confronto</h2>
<p>Esamina i titoli disponibili nel database e confronta le caratteristiche di ciascuna emissione.</p>
<p><a class="cta" href="#tabella">Visualizza le obbligazioni con duration intorno a 5 anni</a></p>
<p><em>La selezione è basata su criteri finanziari oggettivi e non implica una valutazione dell'adeguatezza per il singolo investitore.</em></p>`,
  },
  {
    n: 11,
    keyword: "Obbligazioni alto rendimento",
    path: "/it/guide/obbligazioni-alto-rendimento",
    seoTitle: "Obbligazioni Alto Rendimento: Yield e Rischi",
    metaDescription: "Scopri cosa sono le obbligazioni ad alto rendimento, come confrontare yield e rating e quali rischi valutare prima di investire.",
    h1: "Obbligazioni ad alto rendimento: caratteristiche e rischi",
    bodyHtml: `<p>Le obbligazioni ad alto rendimento attirano l'attenzione degli investitori perché offrono una remunerazione potenzialmente superiore rispetto a titoli con rischio creditizio inferiore.</p>
<p>Tuttavia, un rendimento elevato deve sempre essere interpretato nel contesto del rischio assunto.</p>
<h2 id="cosa-significa-alto-rendimento">Cosa significa alto rendimento?</h2>
<p>Nel linguaggio finanziario, l'espressione <em>high yield</em> identifica comunemente obbligazioni con rating inferiore all'investment grade.</p>
<p>Nel linguaggio corrente, invece, può indicare semplicemente obbligazioni che offrono rendimenti superiori a quelli di altri strumenti comparabili.</p>
<p>Le due definizioni non devono essere confuse.</p>
<h2 id="perche-alcune-obbligazioni-rendono-di-piu">Perché alcune obbligazioni rendono di più?</h2>
<p>Tra le possibili ragioni:</p>
<ul><li>Maggiore rischio di insolvenza.</li><li>Rating creditizio più basso.</li><li>Scadenza più lunga.</li><li>Subordinazione del titolo.</li><li>Liquidità limitata.</li><li>Valuta differente.</li><li>Clausole di rimborso anticipato.</li></ul>
<h2 id="l-importanza-del-rischio-di-default">L'importanza del rischio di default</h2>
<p>Il rendimento a scadenza indicato dal mercato presuppone che l'emittente rispetti i pagamenti previsti.</p>
<p>Se si verifica un default, la perdita effettiva dipende anche dal tasso di recupero del capitale e dalla struttura dell'obbligazione.</p>
<h2 id="come-effettuare-confronti-omogenei">Come effettuare confronti omogenei</h2>
<p>Per analizzare titoli ad alto rendimento è utile confrontare obbligazioni con duration, valuta e caratteristiche contrattuali simili.</p>
<p><a class="cta" href="/it/obbligazioni/alto-rendimento">Confronta rendimento, rating e duration delle obbligazioni</a></p>
<p><em>I rendimenti elevati non costituiscono garanzia di maggior guadagno e possono accompagnarsi a perdite significative.</em></p>`,
  },
  {
    n: 12,
    keyword: "Obbligazioni corporate euro",
    path: "/it/obbligazioni/corporate",
    seoTitle: "Obbligazioni Corporate in Euro: Rendimenti e Rating",
    metaDescription: "Confronta le obbligazioni societarie denominate in euro. Scopri rendimento a scadenza, rating, duration e rischi di credito.",
    h1: "Obbligazioni corporate in euro: come confrontarle",
    bodyHtml: `<p>Le obbligazioni corporate denominate in euro sono strumenti di debito emessi da aziende che intendono finanziarsi attraverso il mercato obbligazionario.</p>
<p>Possono essere emesse da società industriali, gruppi energetici, aziende di telecomunicazioni, banche e operatori di numerosi altri settori.</p>
<h2 id="quali-sono-le-principali-caratteristiche">Quali sono le principali caratteristiche?</h2>
<p>Ogni obbligazione corporate presenta condizioni specifiche:</p>
<ul><li>Emittente.</li><li>Valuta di denominazione.</li><li>Scadenza.</li><li>Cedola e struttura dei flussi.</li><li>Rating, quando disponibile.</li><li>Seniority ed eventuali garanzie.</li><li>Condizioni di rimborso anticipato.</li></ul>
<h2 id="investment-grade-e-speculative-grade">Investment grade e speculative grade</h2>
<p>Le obbligazioni investment grade hanno rating generalmente compresi tra AAA e BBB− nella scala S&amp;P.</p>
<p>I titoli con rating inferiore rientrano nella categoria speculative grade.</p>
<p>Anche all'interno della stessa classe di rating possono esistere differenze importanti di rendimento e rischio.</p>
<h2 id="come-confrontare-le-obbligazioni-corporate">Come confrontare le obbligazioni corporate?</h2>
<p>Il rendimento a scadenza rappresenta un punto di partenza, ma è necessario verificare anche la duration e le condizioni dell'emissione.</p>
<p>Le obbligazioni subordinate o richiamabili anticipatamente possono richiedere metriche aggiuntive rispetto al semplice YTM.</p>
<h2 id="l-importanza-della-liquidita">L'importanza della liquidità</h2>
<p>Non tutte le emissioni societarie sono negoziate con la stessa frequenza.</p>
<p>La differenza tra prezzo di acquisto e vendita può incidere sul risultato effettivo.</p>
<p><a class="cta" href="#tabella">Esplora le obbligazioni corporate denominate in euro</a></p>`,
  },
  {
    n: 13,
    keyword: "Obbligazioni investment grade",
    path: "/it/guide/obbligazioni-investment-grade",
    seoTitle: "Obbligazioni Investment Grade: Rating e Rischi",
    metaDescription: "Cosa sono le obbligazioni investment grade? Scopri le classi di rating AAA–BBB, i rischi di default e come confrontare i rendimenti.",
    h1: "Obbligazioni investment grade: significato, rating e rischio",
    bodyHtml: `<p>Le obbligazioni investment grade sono strumenti di debito caratterizzati da un merito creditizio relativamente elevato secondo le classificazioni delle principali agenzie di rating.</p>
<p>Il termine non significa che l'investimento sia privo di rischio.</p>
<h2 id="quali-rating-sono-investment-grade">Quali rating sono investment grade?</h2>
<p>Nella scala Standard &amp; Poor's, la categoria investment grade comprende generalmente i rating da AAA a BBB−.</p>
<table><thead><tr><th scope="col">Rating S&amp;P</th><th scope="col">Categoria</th></tr></thead><tbody><tr><td>AAA</td><td>Investment grade</td></tr><tr><td>AA+, AA, AA−</td><td>Investment grade</td></tr><tr><td>A+, A, A−</td><td>Investment grade</td></tr><tr><td>BBB+, BBB, BBB−</td><td>Investment grade</td></tr><tr><td>BB+ e inferiori</td><td>Speculative grade</td></tr></tbody></table>
<h2 id="cosa-indica-il-rating">Cosa indica il rating?</h2>
<p>Il rating rappresenta un'opinione sulla qualità creditizia di un emittente o di uno specifico strumento di debito.</p>
<p>Non indica direttamente quale rendimento sia più interessante, né garantisce che l'emittente non possa diventare insolvente.</p>
<h2 id="due-obbligazioni-bbb-possono-essere-differenti">Due obbligazioni BBB possono essere differenti?</h2>
<p>Sì. Due obbligazioni con rating BBB possono avere duration, seniority, settore, valuta e liquidità differenti.</p>
<p>Anche le prospettive creditizie possono cambiare nel tempo.</p>
<h2 id="rating-e-probabilita-di-default">Rating e probabilità di default</h2>
<p>Le probabilità storiche di default variano in funzione del rating e dell'orizzonte temporale considerato.</p>
<p>Una valutazione a cinque anni non può essere confrontata direttamente con una probabilità riferita a dieci anni senza una metodologia coerente.</p>
<h2 id="come-confrontare-le-obbligazioni-investment-grade">Come confrontare le obbligazioni investment grade</h2>
<p>È utile considerare rendimento a scadenza, rating, duration e condizioni contrattuali dello strumento.</p>
<p><a class="cta" href="/it/obbligazioni/investment-grade">Confronta obbligazioni per rating, rendimento e durata</a></p>`,
  },
  {
    n: 14,
    keyword: "Obbligazioni rendimento 5%",
    path: "/it/obbligazioni/rendimento-5-percento",
    seoTitle: "Obbligazioni al 5%: Rendimento Lordo e Rischi",
    metaDescription: "Cosa significa un'obbligazione con rendimento del 5%? Scopri differenze tra cedola e yield, rating, duration e rischio di default.",
    h1: "Obbligazioni con rendimento del 5%: cosa valutare",
    bodyHtml: `<p>Le obbligazioni con rendimento del 5% sono spesso ricercate da investitori interessati a una remunerazione superiore rispetto a quella offerta da altri strumenti obbligazionari.</p>
<p>Tuttavia, prima di confrontare questi strumenti, è necessario comprendere cosa rappresenti esattamente il 5%.</p>
<h2 id="cedola-del-5-o-rendimento-a-scadenza-del-5">Cedola del 5% o rendimento a scadenza del 5%?</h2>
<p>Sono due concetti differenti.</p>
<p>La cedola del 5% indica un pagamento contrattuale calcolato sul valore nominale del titolo.</p>
<p>Il rendimento a scadenza del 5% considera invece il prezzo di acquisto, le cedole e il rimborso finale.</p>
<p>Un'obbligazione con cedola del 5% acquistata sopra la pari potrebbe avere un rendimento effettivo inferiore al 5%.</p>
<h2 id="quali-rischi-possono-accompagnare-un-rendimento-del-5">Quali rischi possono accompagnare un rendimento del 5%?</h2>
<p>Un rendimento elevato rispetto a strumenti comparabili può riflettere:</p>
<ul><li>Un rischio di credito maggiore.</li><li>Una duration più elevata.</li><li>Una liquidità inferiore.</li><li>Una struttura subordinata.</li><li>Esposizione valutaria.</li><li>Clausole contrattuali particolari.</li></ul>
<h2 id="lordo-e-netto">Lordo e netto</h2>
<p>Un rendimento lordo a scadenza del 5% non corrisponde necessariamente al 5% netto.</p>
<p>Il trattamento fiscale e i costi di negoziazione possono ridurre il risultato economico effettivo.</p>
<h2 id="come-verificare-la-disponibilita">Come verificare la disponibilità</h2>
<p>La presenza di obbligazioni con rendimento a scadenza vicino al 5% cambia con le condizioni di mercato.</p>
<p>Per verificare quali emissioni soddisfino questa condizione è necessario utilizzare dati aggiornati e confrontare strumenti omogenei.</p>
<p><a class="cta" href="#tabella">Esplora le obbligazioni per rendimento e rischio</a></p>
<p><em>Il 5% è un parametro di ricerca e non un obiettivo di rendimento garantito.</em></p>`,
  },
  {
    n: 15,
    keyword: "Obbligazioni scadenza 2031",
    path: "/it/obbligazioni/scadenza-2031",
    seoTitle: "Obbligazioni Scadenza 2031: Rendimenti e Confronto",
    metaDescription: "Confronta obbligazioni con scadenza nel 2031: BTP, titoli di Stato europei e corporate, rendimento a scadenza, rating e duration.",
    h1: "Obbligazioni con scadenza nel 2031: come confrontarle",
    bodyHtml: `<p>Le obbligazioni con scadenza nel 2031 comprendono titoli di Stato e strumenti societari che prevedono il rimborso contrattuale del capitale durante quell'anno, salvo eventi di credito o specifiche condizioni di emissione.</p>
<p>Questi strumenti possono presentare rendimenti, cedole e rischi differenti anche quando il periodo di rimborso è simile.</p>
<h2 id="quali-categorie-comprendono">Quali categorie comprendono?</h2>
<p>Tra le principali categorie:</p>
<ul><li>BTP italiani con scadenza nel 2031.</li><li>Titoli di Stato europei.</li><li>Obbligazioni corporate investment grade.</li><li>Obbligazioni speculative grade.</li></ul>
<h2 id="le-principali-variabili-da-confrontare">Le principali variabili da confrontare</h2>
<p>La prima informazione è la data esatta di scadenza.</p>
<p>Un titolo rimborsato a gennaio 2031 non ha la stessa durata residua di un titolo rimborsato a dicembre 2031.</p>
<p>Altre informazioni importanti sono:</p>
<ul><li>Rendimento effettivo a scadenza.</li><li>Prezzo di mercato.</li><li>Cedola.</li><li>Rating creditizio.</li><li>Duration.</li><li>Liquidità.</li></ul>
<h2 id="attenzione-alle-obbligazioni-richiamabili">Attenzione alle obbligazioni richiamabili</h2>
<p>Alcune obbligazioni prevedono clausole che consentono all'emittente di rimborsare il titolo anticipatamente.</p>
<p>Per questi strumenti può essere necessario considerare, oltre al rendimento alla scadenza finale, anche il rendimento alla prima data di richiamo e altre metriche appropriate.</p>
<h2 id="come-confrontare-le-obbligazioni-del-2031">Come confrontare le obbligazioni del 2031</h2>
<p>È possibile utilizzare un elenco aggiornato delle emissioni con scadenza nell'anno, verificando le differenze tra rischio e rendimento.</p>
<p><a class="cta" href="#tabella">Consulta le obbligazioni con scadenza nel 2031</a></p>
<p><em>Il rendimento indicato presuppone il rispetto dei flussi contrattuali applicabili.</em></p>`,
  },
  {
    n: 16,
    keyword: "Rischio credito obbligazioni",
    path: "/it/guide/rischio-di-credito-obbligazioni",
    seoTitle: "Rischio di Credito Obbligazioni: Rating e Default",
    metaDescription: "Come valutare il rischio di credito delle obbligazioni? Scopri rating, probabilità di default, recovery rate e differenze tra emittenti.",
    h1: "Rischio di credito delle obbligazioni: come valutarlo",
    bodyHtml: `<p>Il rischio di credito rappresenta la possibilità che un emittente non riesca a rispettare integralmente o puntualmente gli obblighi di pagamento previsti da un titolo di debito.</p>
<p>È uno degli elementi fondamentali per analizzare le obbligazioni.</p>
<h2 id="che-cos-e-il-default">Che cos'è il default?</h2>
<p>Il default si verifica quando un emittente incorre in un evento di insolvenza o in un'altra condizione qualificata come default secondo le definizioni applicabili.</p>
<p>Gli investitori possono subire ritardi nei pagamenti, ristrutturazioni del debito o perdite sul capitale.</p>
<h2 id="come-si-misura-il-rischio-di-credito">Come si misura il rischio di credito?</h2>
<p>Tra gli indicatori più utilizzati:</p>
<p><strong>Rating:</strong> valutazione della qualità creditizia attribuita da agenzie specializzate.</p>
<p><strong>Probability of Default (PD):</strong> probabilità stimata che si verifichi un default entro un determinato periodo.</p>
<p><strong>Loss Given Default (LGD):</strong> percentuale di perdita stimata in caso di default.</p>
<p><strong>Credit spread:</strong> differenziale di rendimento rispetto a un riferimento appropriato, che può incorporare anche liquidità e altri premi di rischio.</p>
<h2 id="esempio-di-perdita-attesa">Esempio di perdita attesa</h2>
<p>Supponiamo un portafoglio con:</p>
<ul><li>Probabilità di default annuale stimata: 2%.</li><li>Perdita in caso di default: 60%.</li></ul>
<p>La perdita attesa semplificata è:</p>
<p><strong>2% × 60% = 1,2%</strong></p>
<p>Questo è un esempio probabilistico, non una previsione della perdita effettiva di uno specifico investimento.</p>
<h2 id="la-probabilita-di-default-cambia-con-la-durata">La probabilità di default cambia con la durata?</h2>
<p>Sì. Una PD a un anno non è direttamente equivalente alla probabilità cumulata su cinque o dieci anni.</p>
<p>Per confrontare titoli con scadenze differenti bisogna utilizzare ipotesi e orizzonti temporali coerenti.</p>
<h2 id="perche-il-rating-non-basta">Perché il rating non basta?</h2>
<p>Due obbligazioni con rating simile possono avere strutture contrattuali, priorità di rimborso, liquidità e duration differenti.</p>
<p>La valutazione del rischio richiede quindi più indicatori.</p>
<p><a class="cta" href="/it">Confronta obbligazioni per rating, rischio e durata</a></p>`,
  },
];

/** Livio's landing text for a page, by its path (e.g. "/it/obbligazioni/btp"). */
export const landingFor = (path: string): Landing | null => LIVIO_LANDINGS.find((x) => x.path === path) ?? null;

/** Splits an article into its lead (before the first heading) and the rest, so live data can sit in between. */
export function splitLead(html: string): [string, string] {
  const i = html.indexOf("<h2");
  return i < 0 ? [html, ""] : [html.slice(0, i), html.slice(i)];
}

export const isLandingLocale = (l: Locale) => l === "it";
