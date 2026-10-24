import type { Locale } from "./locales";

// The owner's 16 Italian landing pages (19 Oct 2026), one per tracked Italian keyword. His own text, approved by him:
// kept word for word, only turned into HTML. His notes to us ("Elemento SEO essenziale", "Nota tecnica") are not
// page text and are left out. Guides (/it/guide/...) go into the guide store; the others sit on the comparison
// pages, the calculator and the broker page, next to the live data they describe.

export type Landing = { n: number; keyword: string; path: string; seoTitle: string; metaDescription: string; h1: string; bodyHtml: string };

export const OWNER_LANDINGS: Landing[] = [
  {
    n: 1,
    keyword: "Rendimenti BTP",
    path: "/it/obbligazioni/btp",
    seoTitle: "Rendimenti BTP: Tassi, Scadenze e Confronto",
    metaDescription: "Consulta e confronta i rendimenti dei BTP italiani per scadenza, cedola e prezzo. Scopri le differenze tra rendimento lordo, netto e duration.",
    h1: "Rendimenti BTP: come confrontare i titoli di Stato italiani",
    bodyHtml: `<p>Stesso Stato, stessa firma, rendimenti diversi: i BTP sono fratelli che si somigliano meno di quanto dica il cognome. Il rendimento resta l'indicatore più usato per confrontare i titoli di Stato italiani, ma due emissioni del Tesoro possono pagare cifre lontane tra loro.</p>
<p>Contano soprattutto <strong>prezzo di mercato, cedola, scadenza residua e struttura finanziaria del titolo</strong>.</p>
<h2 id="come-leggere-i-rendimenti-btp">Come leggere i rendimenti BTP</h2>
<p>Il numero da guardare è il rendimento effettivo a scadenza, lo Yield to Maturity (YTM), che mette insieme il prezzo pagato e i flussi previsti fino al rimborso.</p>
<p>La regola è semplice. Comprato sotto la pari, un BTP può rendere a scadenza più della cedola nominale; comprato sopra la pari, meno. La cedola è il cartellino, il rendimento a scadenza lo scontrino.</p>
<p>Per un confronto che regga, conviene tenere sotto gli occhi:</p>
<ul><li>Rendimento effettivo lordo e netto.</li><li>Prezzo di mercato e valore nominale.</li><li>Scadenza residua.</li><li>Duration e sensibilità ai tassi.</li><li>Costi di negoziazione e liquidità.</li></ul>
<h2 id="btp-a-breve-e-lunga-scadenza">BTP a breve e lunga scadenza</h2>
<p>A parità di altre condizioni, i titoli a scadenza ravvicinata soffrono meno le variazioni dei tassi rispetto a quelli molto lunghi: il primo è un'utilitaria che in curva non sbanda, il secondo ha più cavalli e lo si sente sul bagnato.</p>
<p>E un rendimento più alto non rende di per sé un titolo più conveniente: va pesato contro il rischio e le condizioni dell'investimento.</p>
<h2 id="confronta-i-rendimenti">Confronta i rendimenti</h2>
<p>La nostra tabella BTP mette in fila i titoli disponibili con le informazioni di mercato aggiornate.</p>
<p><a class="cta" href="/it">Confronta le obbligazioni per rischio e durata</a></p>
<p><em>I rendimenti dipendono dalle quotazioni e non sono una garanzia di risultato.</em></p>`,
  },
  {
    n: 2,
    keyword: "BTP rendimento netto",
    path: "/it/calcolatori/rendimento-netto-btp",
    seoTitle: "BTP Rendimento Netto: Calcolo, Tasse ed Esempi",
    metaDescription: "Come calcolare il rendimento netto di un BTP? Scopri l'effetto delle tasse al 12,5%, delle cedole, del prezzo di acquisto e delle commissioni.",
    h1: "BTP rendimento netto: come calcolarlo correttamente",
    bodyHtml: `<p>Il lordo si legge sui listini, il netto resta in tasca. Il rendimento netto di un BTP misura il risultato dopo il trattamento fiscale applicabile; per il quadro completo vanno aggiunti i costi di acquisto e di gestione.</p>
<p>In Italia i BTP godono in genere di un'aliquota agevolata del <strong>12,5%</strong> sui redditi soggetti al relativo regime: uno dei rari casi in cui il fisco fa lo sconto.</p>
<h2 id="esempio-di-calcolo-della-cedola-netta">Esempio di calcolo della cedola netta</h2>
<p>Prendiamo un BTP con:</p>
<ul><li>Valore nominale: €10.000.</li><li>Cedola annua lorda: 4%.</li><li>Cedola annua lorda in euro: €400.</li><li>Imposta ipotizzata: €50.</li><li>Cedola annua netta: €350.</li></ul>
<p>La cedola netta vale dunque il 3,5% del capitale nominale. Aritmetica da scuola media.</p>
<p><strong>Attenzione:</strong> cedola netta e rendimento effettivo netto a scadenza non coincidono necessariamente.</p>
<h2 id="perche-il-prezzo-di-acquisto-e-importante">Perché il prezzo di acquisto è importante?</h2>
<p>Perché racconta ciò che la cedola tace. Se il BTP si compra sotto la pari, lo scarto tra prezzo pagato e valore di rimborso può aggiungersi al rendimento complessivo.</p>
<p>Sopra la pari, lo stesso scarto lavora al contrario e può ridurlo.</p>
<p>Il conto vero richiede tutti i flussi finanziari, le date dei pagamenti, il trattamento fiscale e le commissioni.</p>
<h2 id="come-confrontare-i-rendimenti-netti">Come confrontare i rendimenti netti</h2>
<p>Due obbligazioni con identico rendimento lordo possono arrivare a rendimenti netti diversi, soprattutto se soggette a regimi fiscali differenti. Gemelle alla partenza, sconosciute all'arrivo.</p>
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
    bodyHtml: `<p>Prestare soldi allo Stato è più semplice che prestarli a un cognato, e meglio documentato. Lo strumento sono i <strong>BTP, Buoni del Tesoro Poliennali</strong>: titoli di debito con cui lo Stato italiano finanzia il debito pubblico.</p>
<p>Chi li compra diventa creditore dello Stato, con diritto ai pagamenti fissati dalle condizioni di emissione.</p>
<h2 id="come-funzionano-le-cedole">Come funzionano le cedole</h2>
<p>Il BTP tradizionale a tasso fisso paga di norma una cedola ogni sei mesi e rimborsa il valore nominale alla scadenza, salvo eventi di credito. Ritmo da metronomo.</p>
<p>La famiglia è però più ampia: ci sono BTP indicizzati all'inflazione e prodotti pensati soprattutto per i risparmiatori retail.</p>
<h2 id="perche-il-prezzo-di-un-btp-cambia">Perché il prezzo di un BTP cambia?</h2>
<p>Dopo l'emissione, i BTP si scambiano sul mercato secondario, dove il prezzo si muove.</p>
<p>Funziona come un'altalena: se i rendimenti di mercato salgono, il prezzo di un'obbligazione a tasso fisso tende a scendere; se scendono, tende a salire.</p>
<p>Il dondolio è di solito più ampio per i titoli con duration elevata.</p>
<h2 id="quali-sono-i-rischi-principali">Quali sono i rischi principali?</h2>
<ul><li>Rischio di credito dello Stato emittente.</li><li>Rischio di prezzo in caso di vendita anticipata.</li><li>Rischio di inflazione.</li><li>Rischio di liquidità.</li><li>Costo opportunità rispetto ad altri investimenti.</li></ul>
<h2 id="come-confrontare-btp-differenti">Come confrontare BTP differenti?</h2>
<p>Scegliere un BTP dal solo tasso cedolare è come scegliere un'auto dal colore della carrozzeria. Servono anche rendimento a scadenza, duration, prezzo e liquidità.</p>
<p><a class="cta" href="/it/obbligazioni/btp">Esplora i rendimenti dei BTP e confrontali con altre obbligazioni</a></p>`,
  },
  {
    n: 4,
    keyword: "BTP o ETF obbligazionari",
    path: "/it/guide/btp-o-etf-obbligazionari",
    seoTitle: "BTP o ETF Obbligazionari? Differenze, Costi e Rischi",
    metaDescription: "BTP ed ETF obbligazionari a confronto: cedole, scadenze, diversificazione, costi e rischi. Scopri come funzionano i due strumenti.",
    h1: "BTP o ETF obbligazionari: quali sono le differenze?",
    bodyHtml: `<p>BTP ed ETF obbligazionari portano entrambi al mercato dei titoli di debito, ma per strade diverse.</p>
<p>Un BTP è una singola obbligazione dello Stato italiano: un debitore, un contratto. Un ETF obbligazionario è un fondo quotato in borsa che investe in un paniere di obbligazioni. Piatto unico contro menu degustazione.</p>
<h2 id="scadenza-e-rimborso">Scadenza e rimborso</h2>
<p>Il BTP tradizionale ha una data di scadenza e condizioni di rimborso nero su bianco.</p>
<p>L'ETF obbligazionario tradizionale, invece, mantiene di norma un portafoglio di titoli e non restituisce l'investimento a una scadenza unica: nessun giorno cerchiato sul calendario.</p>
<p>Esistono anche ETF obbligazionari a scadenza definita, con caratteristiche diverse dai fondi tradizionali.</p>
<h2 id="diversificazione">Diversificazione</h2>
<p>Un singolo BTP concentra l'esposizione sul debito dello Stato italiano: tutte le uova in un paniere, per quanto robusto.</p>
<p>Un ETF può distribuirla tra più emittenti e scadenze, a seconda della composizione.</p>
<h2 id="costi-e-rischi">Costi e rischi</h2>
<p>Il confronto va fatto voce per voce, come con una bolletta:</p>
<ul><li>Commissioni di negoziazione.</li><li>Costi correnti del fondo, ove applicabili.</li><li>Spread denaro-lettera.</li><li>Sensibilità ai tassi.</li><li>Rischio di credito.</li><li>Trattamento fiscale.</li></ul>
<p>Una risposta valida per tutti non c'è: sono strumenti con caratteristiche strutturali differenti.</p>
<p><a class="cta" href="/it">Approfondisci rendimento e rischio delle singole obbligazioni</a></p>`,
  },
  {
    n: 5,
    keyword: "BTP o obbligazioni corporate",
    path: "/it/guide/btp-o-obbligazioni-corporate",
    seoTitle: "BTP vs Obbligazioni Corporate: Rendimenti e Rischi",
    metaDescription: "Confronto tra BTP e obbligazioni societarie: rating, rendimento a scadenza, tassazione, duration e rischio di credito.",
    h1: "BTP o obbligazioni corporate: confronto tra rendimento e rischio",
    bodyHtml: `<p>Al mercato obbligazionario non bussano solo gli Stati: anche le imprese prendono il numero.</p>
<p>I BTP sono titoli di Stato italiani; le obbligazioni corporate sono titoli di debito con cui le società raccolgono finanziamenti. Stessa forma, debitori diversi.</p>
<h2 id="da-cosa-dipende-il-rendimento">Da cosa dipende il rendimento?</h2>
<p>Il rendimento che il mercato pretende dipende da rischio di credito, scadenza, liquidità e struttura contrattuale, tra gli altri fattori.</p>
<p>Una societaria può rendere più di un BTP di duration simile, ma quel differenziale raramente è un regalo: spesso riflette rischi diversi.</p>
<h2 id="il-ruolo-del-rating">Il ruolo del rating</h2>
<p>Il rating è un giudizio sulla qualità creditizia dell'emittente o di una singola emissione: la pagella del debitore.</p>
<p>Le corporate possono essere investment grade oppure speculative grade.</p>
<p>Nel confronto pesano anche seniority, garanzie, clausole di rimborso anticipato e liquidità: dettagli, finché non smettono di esserlo.</p>
<h2 id="la-differenza-fiscale">La differenza fiscale</h2>
<p>Qui il fisco non è neutrale. Per chi ricade nel regime italiano ordinario, i BTP godono in genere dell'aliquota del 12,5%, mentre molte obbligazioni corporate pagano il 26%.</p>
<p>Il confronto tra rendimenti netti ne risente.</p>
<h2 id="un-confronto-omogeneo">Un confronto omogeneo</h2>
<p>Meglio confrontare titoli con scadenza, duration e valuta comparabili, tenendo in vista il diverso rischio creditizio. Mele con mele, anche se una ha la buccia più sottile.</p>
<p><a class="cta" href="/it">Confronta BTP e obbligazioni corporate per durata e rischio</a></p>`,
  },
  {
    n: 6,
    keyword: "Come calcolare il rendimento a scadenza",
    path: "/it/guide/rendimento-a-scadenza",
    seoTitle: "Rendimento a Scadenza Obbligazioni: Calcolo YTM",
    metaDescription: "Scopri come calcolare il rendimento effettivo a scadenza (YTM) di un'obbligazione, con formule, esempi e differenze rispetto alla cedola.",
    h1: "Come calcolare il rendimento a scadenza di un'obbligazione",
    bodyHtml: `<p>La cedola è la promessa stampata sul titolo; il rendimento a scadenza dice quanto vale al prezzo pagato. Il <strong>rendimento effettivo a scadenza</strong>, o Yield to Maturity (YTM), è uno degli indicatori chiave per confrontare obbligazioni con cedole, prezzi e scadenze diverse.</p>
<p>Tecnicamente è il tasso di attualizzazione che eguaglia il valore attuale dei flussi futuri al prezzo dell'obbligazione. In breve, il tasso che fa quadrare i conti.</p>
<h2 id="cedola-e-rendimento-a-scadenza-la-differenza">Cedola e rendimento a scadenza: la differenza</h2>
<p>Prendiamo un'obbligazione con:</p>
<ul><li>Valore nominale: €1.000.</li><li>Cedola annuale: €40.</li><li>Prezzo di acquisto: €950.</li><li>Scadenza residua: cinque anni.</li></ul>
<p>La cedola nominale vale il 4% del nominale.</p>
<p>Il rendimento a scadenza però conta anche lo scarto tra i €950 pagati e i €1.000 rimborsati: uno sconto all'ingresso che si incassa all'uscita.</p>
<p>Con cedole annuali, rimborso integrale e nessun costo aggiuntivo, il rendimento lordo effettivo a scadenza è circa il 5,16%.</p>
<h2 id="come-si-calcola-il-ytm">Come si calcola il YTM?</h2>
<p>Si cerca il tasso che pareggia il prezzo con i flussi futuri attualizzati.</p>
<p>Per un'obbligazione a cedola fissa, i flussi sono le cedole più il rimborso finale.</p>
<p>In pratica contano anche frequenza cedolare, convenzioni di calcolo, date effettive e rateo maturato: qui il foglio di calcolo si guadagna lo stipendio.</p>
<h2 id="perche-utilizzare-il-rendimento-a-scadenza">Perché utilizzare il rendimento a scadenza?</h2>
<p>Misura con lo stesso metro obbligazioni contrattualmente diverse. Stesso metro, però, non vuol dire stesso rischio.</p>
<p>Il YTM non è garantito: presuppone che i flussi previsti vengano pagati e che il titolo sia tenuto fino alla scadenza.</p>
<p><a class="cta" href="/it">Confronta rendimento a scadenza e durata delle obbligazioni</a></p>`,
  },
  {
    n: 7,
    keyword: "Duration obbligazioni",
    path: "/it/guide/duration-obbligazioni",
    seoTitle: "Duration Obbligazioni: Significato, Formula ed Esempi",
    metaDescription: "Cos'è la duration di un'obbligazione? Scopri come misura il rischio di tasso, la differenza con la scadenza e gli effetti sui prezzi.",
    h1: "Duration obbligazioni: cos'è e perché è importante",
    bodyHtml: `<p>Se il prezzo di un'obbligazione fosse una barca, la duration direbbe quanto rolla all'arrivo dell'onda dei tassi. È tra gli indicatori più usati per misurare la sensibilità del prezzo ai rendimenti di mercato.</p>
<p>E non è la scadenza residua, benché le due si scambino spesso.</p>
<h2 id="scadenza-e-duration-qual-e-la-differenza">Scadenza e duration: qual è la differenza?</h2>
<p>La scadenza è il tempo che manca al rimborso contrattuale del capitale: una data sul calendario.</p>
<p>La duration di Macaulay misura il tempo medio ponderato dei flussi finanziari attualizzati.</p>
<p>La duration modificata misura, in via approssimata, la sensibilità percentuale del prezzo alle variazioni del rendimento. Conta nei giorni agitati.</p>
<h2 id="esempio-pratico">Esempio pratico</h2>
<p>Prendiamo un'obbligazione con duration modificata di cinque anni.</p>
<p>Se il rendimento di mercato sale di un punto percentuale, il prezzo potrebbe calare di circa il 5%.</p>
<p>Se scende di un punto, il prezzo potrebbe salire di circa il 5%.</p>
<p>L'approssimazione regge per variazioni contenute; la relazione effettiva dipende anche dalla convessità, curvatura che i manuali adorano e quasi tutti ignorano.</p>
<h2 id="perche-la-duration-e-utile">Perché la duration è utile?</h2>
<p>Dà un metro comune per il rischio di tasso di obbligazioni diverse.</p>
<p>Due titoli con la stessa scadenza possono avere duration differenti perché pagano cedole diverse.</p>
<p>E due titoli con scadenze diverse possono avere duration simili.</p>
<h2 id="come-interpretare-la-duration">Come interpretare la duration</h2>
<p>In generale, più alta la duration, più forte la reazione ai rendimenti di mercato.</p>
<p>Non dice nulla, però, sul rischio di insolvenza dell'emittente, da analizzare a parte. La duration misura il mare, non lo scafo.</p>
<p><a class="cta" href="/it">Confronta obbligazioni per duration, rendimento e rischio</a></p>`,
  },
  {
    n: 8,
    keyword: "Migliori broker obbligazioni",
    path: "/it/broker-obbligazioni",
    seoTitle: "Broker Obbligazioni: Commissioni e Servizi a Confronto",
    metaDescription: "Confronta broker per acquistare BTP e obbligazioni corporate: commissioni, costi di custodia, mercati disponibili e servizi di negoziazione.",
    h1: "Broker obbligazioni: come confrontare commissioni e servizi",
    bodyHtml: `<p>La commissione in vetrina somiglia al prezzo del volo low cost prima del bagaglio: utile, raramente definitivo. La scelta dell'intermediario può incidere sui costi effettivi di negoziazione delle obbligazioni.</p>
<p>Nel confrontare broker e banche conviene guardare oltre la commissione pubblicizzata e verificare quali mercati e titoli siano davvero accessibili.</p>
<h2 id="quali-costi-verificare">Quali costi verificare?</h2>
<p>Le voci principali:</p>
<ul><li>Commissione di acquisto e vendita.</li><li>Commissione minima per operazione.</li><li>Costi di custodia e mantenimento del conto.</li><li>Eventuali spese di mercato e regolamento.</li><li>Costi di conversione valutaria.</li><li>Spread denaro-lettera.</li></ul>
<h2 id="esempio-di-confronto-commissionale">Esempio di confronto commissionale</h2>
<p>Due tariffe ipotetiche, inventate per l'occasione:</p>
<p><strong>Broker A:</strong> commissione dello 0,20% con minimo €5.</p>
<p><strong>Broker B:</strong> commissione fissa di €10.</p>
<p>Su un'operazione da €2.000, il Broker A applicherebbe €5 e il Broker B €10.</p>
<p>Su €20.000 la classifica si ribalta: €40 per il Broker A, €10 per il Broker B.</p>
<p>Morale: quale tariffa costi meno dipende dall'importo. Non c'è un vincitore assoluto, solo un vincitore per taglia.</p>
<p>I costi effettivi possono poi variare per mercato, conto e tipologia di obbligazione.</p>
<h2 id="tutti-i-broker-offrono-le-stesse-obbligazioni">Tutti i broker offrono le stesse obbligazioni?</h2>
<p>No. La disponibilità cambia per mercato, ISIN, controvalore minimo, valuta e condizioni operative.</p>
<p>Un broker può offrire i BTP italiani e una scelta più ridotta di obbligazioni corporate internazionali. Lo scaffale non è uguale in tutti i negozi.</p>
<h2 id="come-effettuare-il-confronto">Come effettuare il confronto</h2>
<p>Nella nostra sezione dedicata esaminiamo le tariffe dei broker su informazioni documentate, indicando la data dell'ultima verifica.</p>
<p><a class="cta" href="#cost-table">Consulta il confronto delle commissioni dei broker obbligazionari</a></p>
<p><em>Le eventuali collaborazioni commerciali sono indicate separatamente e non modificano la metodologia di confronto.</em></p>`,
  },
  {
    n: 9,
    keyword: "Migliori obbligazioni 2026",
    path: "/it/obbligazioni/migliori-obbligazioni",
    seoTitle: "Obbligazioni 2026: Confronto Rendimenti e Rating",
    metaDescription: "Quali obbligazioni confrontare nel 2026? Analizza rendimento a scadenza, rating, duration e caratteristiche dei titoli di Stato e corporate.",
    h1: "Migliori obbligazioni 2026: come confrontare rendimento e rischio",
    bodyHtml: `<p>«Quali sono le migliori obbligazioni del 2026?» è una domanda legittima con una risposta scomoda: dipende. Per avvicinarsi servono rendimenti disponibili, qualità creditizia, duration e scadenza residua, messi a confronto.</p>
<p>Il titolo migliore in assoluto non esiste, come la scarpa migliore senza conoscere il piede: obbligazioni diverse combinano rischio e rendimento in modi diversi.</p>
<h2 id="le-principali-categorie-da-confrontare">Le principali categorie da confrontare</h2>
<p><strong>Titoli di Stato italiani:</strong> BTP con scadenze e strutture cedolari diverse.</p>
<p><strong>Titoli di Stato europei:</strong> obbligazioni di Germania, Francia e altri paesi.</p>
<p><strong>Obbligazioni corporate investment grade:</strong> emesse da imprese o gruppi con rating nella categoria investment grade.</p>
<p><strong>Obbligazioni speculative grade:</strong> possono rendere di più, di norma in cambio di un rischio di credito maggiore.</p>
<h2 id="quali-indicatori-utilizzare">Quali indicatori utilizzare?</h2>
<p>Un confronto serio passa in rassegna:</p>
<ul><li>Rendimento effettivo a scadenza.</li><li>Duration.</li><li>Rating creditizio.</li><li>Tipo di emittente.</li><li>Valuta.</li><li>Liquidità e condizioni contrattuali.</li></ul>
<h2 id="perche-il-rendimento-da-solo-non-basta">Perché il rendimento da solo non basta</h2>
<p>Un'obbligazione al 6% non è un'obbligazione al 4% con due punti in regalo: i rischi possono essere profondamente diversi.</p>
<p>Il rendimento in più può pagare un rischio di credito maggiore, una scadenza più lunga, una struttura subordinata o una liquidità inferiore. Il mercato non fa beneficenza.</p>
<h2 id="confronta-le-obbligazioni-disponibili">Confronta le obbligazioni disponibili</h2>
<p>Il nostro strumento ordina le obbligazioni secondo criteri verificabili, per esaminare le differenze tra strumenti comparabili.</p>
<p><a class="cta" href="/it">Esplora il confronto delle obbligazioni per rischio e durata</a></p>
<p><em>Le informazioni sono analisi comparative, non indicazioni di investimento personalizzate.</em></p>`,
  },
  {
    n: 10,
    keyword: "Migliori obbligazioni a 5 anni",
    path: "/it/obbligazioni/duration-5-anni",
    seoTitle: "Obbligazioni a 5 Anni: Rendimenti, Rating e Duration",
    metaDescription: "Confronta le obbligazioni con scadenza residua di circa 5 anni. Analizza rendimenti, rating, duration e differenze tra titoli di Stato e corporate.",
    h1: "Obbligazioni a 5 anni: confronto di rendimenti e rischio",
    bodyHtml: `<p>Cinque anni: abbastanza perché l'economia cambi umore, troppo pochi per dimenticarsi di un'obbligazione in portafoglio. I titoli con circa cinque anni di vita residua sono tra i più osservati da chi confronta obbligazioni a durata intermedia.</p>
<p>Prima, però, va separato ciò che spesso si confonde: <strong>scadenza residua di cinque anni</strong> e <strong>duration pari a cinque anni</strong>.</p>
<p>Non sono la stessa cosa, e non è pedanteria.</p>
<h2 id="scadenza-di-cinque-anni">Scadenza di cinque anni</h2>
<p>Un'obbligazione con scadenza residua di cinque anni rimborsa il capitale fra circa cinque anni, salvo eventi di credito o condizioni contrattuali particolari.</p>
<p>La sua duration può essere più bassa, specie con cedole relativamente elevate: parte del denaro torna prima del traguardo.</p>
<h2 id="quali-obbligazioni-confrontare">Quali obbligazioni confrontare?</h2>
<p>Sotto questo ombrello stanno:</p>
<ul><li>BTP italiani.</li><li>Titoli di Stato di altri paesi europei.</li><li>Obbligazioni corporate investment grade.</li><li>Obbligazioni con rating inferiore all'investment grade.</li></ul>
<h2 id="rendimento-e-rischio">Rendimento e rischio</h2>
<p>Due titoli con scadenza simile possono rendere in modo molto diverso. Stessa data, storie diverse.</p>
<p>Per capire perché bisogna guardare rating, struttura dell'emissione, valuta e liquidità.</p>
<p>Un buon confronto tiene separati il rendimento lordo e il rischio dell'emittente, senza che il primo faccia dimenticare il secondo.</p>
<h2 id="come-utilizzare-il-confronto">Come utilizzare il confronto</h2>
<p>Esamina i titoli del database e confronta le caratteristiche di ogni emissione.</p>
<p><a class="cta" href="#tabella">Visualizza le obbligazioni con duration intorno a 5 anni</a></p>
<p><em>La selezione si basa su criteri finanziari oggettivi e non implica una valutazione di adeguatezza per il singolo investitore.</em></p>`,
  },
  {
    n: 11,
    keyword: "Obbligazioni alto rendimento",
    path: "/it/guide/obbligazioni-alto-rendimento",
    seoTitle: "Obbligazioni Alto Rendimento: Yield e Rischi",
    metaDescription: "Scopri cosa sono le obbligazioni ad alto rendimento, come confrontare yield e rating e quali rischi valutare prima di investire.",
    h1: "Obbligazioni ad alto rendimento: caratteristiche e rischi",
    bodyHtml: `<p>Il rendimento alto ha il fascino del tavolo libero nel ristorante pieno: tutti lo notano, pochi si chiedono perché sia libero. Le obbligazioni ad alto rendimento attirano perché offrono una remunerazione potenzialmente superiore a quella di titoli con minore rischio creditizio.</p>
<p>Ma un rendimento elevato va sempre letto insieme al rischio che lo accompagna.</p>
<h2 id="cosa-significa-alto-rendimento">Cosa significa alto rendimento?</h2>
<p>In finanza, <em>high yield</em> indica di solito le obbligazioni con rating inferiore all'investment grade.</p>
<p>Nel parlare comune può invece voler dire obbligazioni che rendono più di strumenti comparabili.</p>
<p>Le due cose vanno tenute distinte.</p>
<h2 id="perche-alcune-obbligazioni-rendono-di-piu">Perché alcune obbligazioni rendono di più?</h2>
<p>Raramente per generosità. Tra le ragioni:</p>
<ul><li>Maggiore rischio di insolvenza.</li><li>Rating creditizio più basso.</li><li>Scadenza più lunga.</li><li>Subordinazione del titolo.</li><li>Liquidità limitata.</li><li>Valuta differente.</li><li>Clausole di rimborso anticipato.</li></ul>
<h2 id="l-importanza-del-rischio-di-default">L'importanza del rischio di default</h2>
<p>Il rendimento a scadenza quotato dà per scontato che l'emittente onori i pagamenti previsti. È un'ipotesi, non una promessa.</p>
<p>In caso di default, la perdita effettiva dipende anche dal tasso di recupero e dalla struttura dell'obbligazione.</p>
<h2 id="come-effettuare-confronti-omogenei">Come effettuare confronti omogenei</h2>
<p>Conviene confrontare titoli con duration, valuta e caratteristiche contrattuali simili, o si finisce a giudicare maratoneta e velocista dal solo tempo finale.</p>
<p><a class="cta" href="/it/obbligazioni/alto-rendimento">Confronta rendimento, rating e duration delle obbligazioni</a></p>
<p><em>Un rendimento elevato non garantisce un guadagno maggiore e può accompagnarsi a perdite significative.</em></p>`,
  },
  {
    n: 12,
    keyword: "Obbligazioni corporate euro",
    path: "/it/obbligazioni/corporate",
    seoTitle: "Obbligazioni Corporate in Euro: Rendimenti e Rating",
    metaDescription: "Confronta le obbligazioni societarie denominate in euro. Scopri rendimento a scadenza, rating, duration e rischi di credito.",
    h1: "Obbligazioni corporate in euro: come confrontarle",
    bodyHtml: `<p>Quando un'azienda cerca capitali senza bussare solo alla banca, si rivolge al mercato obbligazionario. Le obbligazioni corporate in euro sono questo: debito con cui le imprese si finanziano presso gli investitori.</p>
<p>Le emettono società industriali, gruppi energetici, telecomunicazioni, banche e molti altri settori. Un condominio affollato, con inquilini assai diversi.</p>
<h2 id="quali-sono-le-principali-caratteristiche">Quali sono le principali caratteristiche?</h2>
<p>Ogni emissione ha la sua carta d'identità:</p>
<ul><li>Emittente.</li><li>Valuta di denominazione.</li><li>Scadenza.</li><li>Cedola e struttura dei flussi.</li><li>Rating, quando disponibile.</li><li>Seniority ed eventuali garanzie.</li><li>Condizioni di rimborso anticipato.</li></ul>
<h2 id="investment-grade-e-speculative-grade">Investment grade e speculative grade</h2>
<p>Le obbligazioni investment grade hanno in genere rating tra AAA e BBB− nella scala S&amp;P.</p>
<p>Sotto si entra nello speculative grade.</p>
<p>Anche nella stessa classe di rating, rendimento e rischio possono differire molto: la stessa lettera non fa due gemelli.</p>
<h2 id="come-confrontare-le-obbligazioni-corporate">Come confrontare le obbligazioni corporate?</h2>
<p>Il rendimento a scadenza è il punto di partenza, non d'arrivo: servono anche duration e condizioni dell'emissione.</p>
<p>Per le subordinate o le richiamabili anticipatamente il semplice YTM può non bastare, e servono metriche aggiuntive.</p>
<h2 id="l-importanza-della-liquidita">L'importanza della liquidità</h2>
<p>Non tutte le emissioni societarie si scambiano con la stessa frequenza; alcune sembrano in letargo.</p>
<p>E lo scarto tra prezzo di acquisto e di vendita può erodere il risultato effettivo.</p>
<p><a class="cta" href="#tabella">Esplora le obbligazioni corporate denominate in euro</a></p>`,
  },
  {
    n: 13,
    keyword: "Obbligazioni investment grade",
    path: "/it/guide/obbligazioni-investment-grade",
    seoTitle: "Obbligazioni Investment Grade: Rating e Rischi",
    metaDescription: "Cosa sono le obbligazioni investment grade? Scopri le classi di rating AAA–BBB, i rischi di default e come confrontare i rendimenti.",
    h1: "Obbligazioni investment grade: significato, rating e rischio",
    bodyHtml: `<p>«Investment grade» suona come un timbro di garanzia. Non lo è. Sono obbligazioni con un merito creditizio relativamente elevato secondo le classificazioni delle principali agenzie di rating.</p>
<p>Ma non sono prive di rischio: è un grado, non un'immunità.</p>
<h2 id="quali-rating-sono-investment-grade">Quali rating sono investment grade?</h2>
<p>Nella scala Standard &amp; Poor's, l'investment grade va in genere da AAA a BBB−. Più sotto comincia un altro campionato.</p>
<table><thead><tr><th scope="col">Rating S&amp;P</th><th scope="col">Categoria</th></tr></thead><tbody><tr><td>AAA</td><td>Investment grade</td></tr><tr><td>AA+, AA, AA−</td><td>Investment grade</td></tr><tr><td>A+, A, A−</td><td>Investment grade</td></tr><tr><td>BBB+, BBB, BBB−</td><td>Investment grade</td></tr><tr><td>BB+ e inferiori</td><td>Speculative grade</td></tr></tbody></table>
<h2 id="cosa-indica-il-rating">Cosa indica il rating?</h2>
<p>Il rating è un'opinione sulla qualità creditizia di un emittente o di un singolo strumento di debito. Autorevole, ma pur sempre un'opinione.</p>
<p>Non dice quale rendimento sia più interessante, né esclude che l'emittente diventi insolvente.</p>
<h2 id="due-obbligazioni-bbb-possono-essere-differenti">Due obbligazioni BBB possono essere differenti?</h2>
<p>Sì, e parecchio. Due BBB possono differire per duration, seniority, settore, valuta e liquidità: stessa sigla, carattere diverso.</p>
<p>E le prospettive creditizie cambiano nel tempo.</p>
<h2 id="rating-e-probabilita-di-default">Rating e probabilità di default</h2>
<p>Le probabilità storiche di default variano con il rating e con l'orizzonte temporale.</p>
<p>Un dato a cinque anni non si accosta a uno a dieci senza una metodologia coerente: sarebbe come paragonare lo stipendio mensile di uno con quello annuale di un altro.</p>
<h2 id="come-confrontare-le-obbligazioni-investment-grade">Come confrontare le obbligazioni investment grade</h2>
<p>Vanno guardati insieme rendimento a scadenza, rating, duration e condizioni contrattuali dello strumento.</p>
<p><a class="cta" href="/it/obbligazioni/investment-grade">Confronta obbligazioni per rating, rendimento e durata</a></p>`,
  },
  {
    n: 14,
    keyword: "Obbligazioni rendimento 5%",
    path: "/it/obbligazioni/rendimento-5-percento",
    seoTitle: "Obbligazioni al 5%: Rendimento Lordo e Rischi",
    metaDescription: "Cosa significa un'obbligazione con rendimento del 5%? Scopri differenze tra cedola e yield, rating, duration e rischio di default.",
    h1: "Obbligazioni con rendimento del 5%: cosa valutare",
    bodyHtml: `<p>Il 5% è una cifra tonda che attira come una vetrina illuminata. Le obbligazioni con rendimento del 5% sono molto cercate da chi vuole una remunerazione superiore a quella di altri strumenti obbligazionari.</p>
<p>Prima di confrontarle, però, bisogna capire cosa rappresenti esattamente quel 5%. Stesso numero, significati diversi.</p>
<h2 id="cedola-del-5-o-rendimento-a-scadenza-del-5">Cedola del 5% o rendimento a scadenza del 5%?</h2>
<p>Due concetti distinti, facili da confondere.</p>
<p>La cedola del 5% è un pagamento contrattuale calcolato sul valore nominale.</p>
<p>Il rendimento a scadenza del 5% tiene conto invece di prezzo di acquisto, cedole e rimborso finale.</p>
<p>Un'obbligazione con cedola del 5% comprata sopra la pari potrebbe quindi rendere effettivamente meno del 5%. Il cartellino dice una cosa, lo scontrino un'altra.</p>
<h2 id="quali-rischi-possono-accompagnare-un-rendimento-del-5">Quali rischi possono accompagnare un rendimento del 5%?</h2>
<p>Un rendimento alto rispetto a strumenti comparabili può riflettere:</p>
<ul><li>Un rischio di credito maggiore.</li><li>Una duration più elevata.</li><li>Una liquidità inferiore.</li><li>Una struttura subordinata.</li><li>Esposizione valutaria.</li><li>Clausole contrattuali particolari.</li></ul>
<h2 id="lordo-e-netto">Lordo e netto</h2>
<p>Un 5% lordo a scadenza non equivale per forza a un 5% netto.</p>
<p>Fisco e costi di negoziazione passano a riscuotere prima dell'investitore e possono ridurre il risultato effettivo.</p>
<h2 id="come-verificare-la-disponibilita">Come verificare la disponibilità</h2>
<p>Quante obbligazioni rendano a scadenza intorno al 5% dipende dal mercato, che cambia senza chiedere permesso.</p>
<p>Per sapere quali emissioni soddisfino la condizione servono dati aggiornati e un confronto tra strumenti omogenei.</p>
<p><a class="cta" href="#tabella">Esplora le obbligazioni per rendimento e rischio</a></p>
<p><em>Il 5% è un parametro di ricerca, non un obiettivo di rendimento garantito.</em></p>`,
  },
  {
    n: 15,
    keyword: "Obbligazioni scadenza 2031",
    path: "/it/obbligazioni/scadenza-2031",
    seoTitle: "Obbligazioni Scadenza 2031: Rendimenti e Confronto",
    metaDescription: "Confronta obbligazioni con scadenza nel 2031: BTP, titoli di Stato europei e corporate, rendimento a scadenza, rating e duration.",
    h1: "Obbligazioni con scadenza nel 2031: come confrontarle",
    bodyHtml: `<p>Il 2031 sembra lontano finché non compare in un calendario delle scadenze. Le obbligazioni in scadenza nel 2031 comprendono titoli di Stato e societari che prevedono il rimborso contrattuale del capitale in quell'anno, salvo eventi di credito o specifiche condizioni di emissione.</p>
<p>Lo stesso anno di rimborso non le rende parenti: rendimenti, cedole e rischi possono differire.</p>
<h2 id="quali-categorie-comprendono">Quali categorie comprendono?</h2>
<p>Le famiglie principali:</p>
<ul><li>BTP italiani con scadenza nel 2031.</li><li>Titoli di Stato europei.</li><li>Obbligazioni corporate investment grade.</li><li>Obbligazioni speculative grade.</li></ul>
<h2 id="le-principali-variabili-da-confrontare">Le principali variabili da confrontare</h2>
<p>Primo dato: la data esatta di scadenza. «2031» è un'indicazione, non un appuntamento.</p>
<p>Un titolo rimborsato a gennaio 2031 non ha la stessa vita residua di uno rimborsato a dicembre 2031.</p>
<p>Contano poi:</p>
<ul><li>Rendimento effettivo a scadenza.</li><li>Prezzo di mercato.</li><li>Cedola.</li><li>Rating creditizio.</li><li>Duration.</li><li>Liquidità.</li></ul>
<h2 id="attenzione-alle-obbligazioni-richiamabili">Attenzione alle obbligazioni richiamabili</h2>
<p>Alcune obbligazioni permettono all'emittente di rimborsare in anticipo: la scadenza sul prospetto diventa un limite massimo più che una certezza.</p>
<p>Per questi titoli può servire, oltre al rendimento alla scadenza finale, anche il rendimento alla prima data di richiamo e altre metriche appropriate.</p>
<h2 id="come-confrontare-le-obbligazioni-del-2031">Come confrontare le obbligazioni del 2031</h2>
<p>Si parte da un elenco aggiornato delle emissioni in scadenza nell'anno, verificando il rapporto tra rischio e rendimento.</p>
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
    bodyHtml: `<p>Ogni obbligazione è una promessa di pagamento. Il rischio di credito è la possibilità che l'emittente non la mantenga, rispettando solo in parte o in ritardo gli obblighi previsti dal titolo di debito.</p>
<p>È un pilastro dell'analisi obbligazionaria: trascurarlo è come comprare casa senza guardare le fondamenta.</p>
<h2 id="che-cos-e-il-default">Che cos'è il default?</h2>
<p>Il default scatta quando un emittente incorre in un evento di insolvenza o in un'altra condizione che le definizioni applicabili qualificano come default.</p>
<p>Per gli investitori può significare pagamenti in ritardo, ristrutturazioni del debito o perdite sul capitale.</p>
<h2 id="come-si-misura-il-rischio-di-credito">Come si misura il rischio di credito?</h2>
<p>La cassetta degli attrezzi contiene soprattutto:</p>
<p><strong>Rating:</strong> giudizio sulla qualità creditizia espresso da agenzie specializzate.</p>
<p><strong>Probability of Default (PD):</strong> probabilità stimata di default entro un certo periodo.</p>
<p><strong>Loss Given Default (LGD):</strong> perdita percentuale stimata in caso di default.</p>
<p><strong>Credit spread:</strong> differenziale di rendimento rispetto a un riferimento appropriato, che può incorporare anche premi per la liquidità e altri rischi.</p>
<h2 id="esempio-di-perdita-attesa">Esempio di perdita attesa</h2>
<p>Immaginiamo un portafoglio con:</p>
<ul><li>Probabilità di default annuale stimata: 2%.</li><li>Perdita in caso di default: 60%.</li></ul>
<p>La perdita attesa, in versione semplificata:</p>
<p><strong>2% × 60% = 1,2%</strong></p>
<p>È un esempio probabilistico, non la previsione della perdita di un investimento specifico. La statistica descrive la folla, non il singolo.</p>
<h2 id="la-probabilita-di-default-cambia-con-la-durata">La probabilità di default cambia con la durata?</h2>
<p>Sì. Una PD a un anno non equivale alla probabilità cumulata su cinque o dieci anni: più lungo il tragitto, più occasioni per un incidente.</p>
<p>Per confrontare scadenze diverse servono ipotesi e orizzonti temporali coerenti.</p>
<h2 id="perche-il-rating-non-basta">Perché il rating non basta?</h2>
<p>Due obbligazioni con rating simile possono avere strutture contrattuali, priorità di rimborso, liquidità e duration differenti. Stessa pagella, studenti diversi.</p>
<p>Servono quindi più indicatori: il rating apre l'analisi, non la chiude.</p>
<p><a class="cta" href="/it">Confronta obbligazioni per rating, rischio e durata</a></p>`,
  },
];

/** The owner's landing text for a page, by its path (e.g. "/it/obbligazioni/btp"). */
export const landingFor = (path: string): Landing | null => OWNER_LANDINGS.find((x) => x.path === path) ?? null;

/** Splits an article into its lead (before the first heading) and the rest, so live data can sit in between. */
export function splitLead(html: string): [string, string] {
  const i = html.indexOf("<h2");
  return i < 0 ? [html, ""] : [html.slice(0, i), html.slice(i)];
}

export const isLandingLocale = (l: Locale) => l === "it";
