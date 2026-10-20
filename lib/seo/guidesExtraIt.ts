// Sections added under the owner's Italian guides (he agreed on 19 Oct 2026, so each guide reaches 600+ words). His text
// stays word for word above them; these only follow it. Educational only: no recommendation, no invented data.

export const EXTRA_IT: Record<string, string> = {
  "rendimento-a-scadenza": `
<h2 id="calcolo-passo-per-passo">Il calcolo passo per passo</h2>
<p>Riprendiamo l'esempio: prezzo €950, cedola annua €40, rimborso €1.000 tra cinque anni. Il rendimento a scadenza è il tasso <em>y</em> che soddisfa l'equazione:</p>
<p><code>950 = 40/(1+y) + 40/(1+y)² + 40/(1+y)³ + 40/(1+y)⁴ + 1.040/(1+y)⁵</code></p>
<p>Non esiste una formula diretta: si prova un tasso, si calcola il valore attuale e lo si corregge finché il risultato coincide con il prezzo. Con il 5% il valore attuale è circa €956,7, poco sopra il prezzo; con il 5,2% scende a circa €948,4. Il tasso cercato si trova quindi tra i due, intorno al 5,16%.</p>
<p>Esiste anche una <strong>formula approssimata</strong>, utile per un controllo veloce:</p>
<p><code>YTM ≈ (C + (Rimborso − Prezzo) / n) / ((Rimborso + Prezzo) / 2)</code></p>
<p>Con i numeri dell'esempio: (40 + 50/5) / 975 = 5,13%. Il risultato è vicino al valore esatto, ma per scadenze lunghe o prezzi molto lontani dalla pari lo scarto cresce.</p>
<h2 id="foglio-di-calcolo">Calcolarlo con un foglio di calcolo</h2>
<p>In Excel o in Google Fogli la funzione <code>REND</code> (in inglese <code>YIELD</code>) calcola il rendimento a scadenza partendo da data di regolamento, data di scadenza, tasso cedolare, prezzo, valore di rimborso e numero di cedole all'anno. La funzione <code>TIR.COST</code> (<code>IRR</code>) dà lo stesso risultato se si scrivono i flussi uno per riga: il prezzo pagato con il segno meno, poi le cedole e il rimborso finale.</p>
<p>Un prezzo può essere <strong>"tel quel"</strong>, cioè comprensivo della cedola maturata, oppure <strong>"secco"</strong>, senza di essa. In Italia si quota il prezzo secco, a cui al momento dell'acquisto si aggiunge il rateo di cedola maturato. Il rendimento va calcolato sul prezzo secco con le date corrette, altrimenti il risultato è distorto.</p>
<h2 id="altri-rendimenti">Rendimento corrente, a scadenza e al richiamo</h2>
<ul>
<li><strong>Rendimento corrente:</strong> cedola annua divisa per il prezzo (40/950 = 4,21%). Ignora la differenza tra prezzo e rimborso, quindi è incompleto.</li>
<li><strong>Rendimento a scadenza:</strong> considera cedole, prezzo e rimborso, nelle ipotesi descritte sopra.</li>
<li><strong>Rendimento al richiamo</strong> (yield to call): per le obbligazioni che l'emittente può rimborsare in anticipo, è il rendimento calcolato fino alla prima data di richiamo. Il dato più prudente tra i due è chiamato <em>yield to worst</em>.</li>
</ul>
<h2 id="lordo-e-netto">Rendimento lordo e netto</h2>
<p>Il rendimento a scadenza indicato dagli strumenti di confronto è di norma <strong>lordo</strong>. Per un investitore italiano in regime ordinario, sugli interessi e sulle plusvalenze si applica generalmente un'imposta del 26%, ridotta al 12,5% per i titoli di Stato italiani ed equiparati. Vanno poi considerati commissioni di acquisto e imposta di bollo sul deposito titoli. Il rendimento netto è quindi più basso di quello lordo: la situazione fiscale personale va verificata con la propria banca o con un consulente.</p>
`,

  "duration-obbligazioni": `
<h2 id="calcolo-duration">Come si calcola la duration di Macaulay</h2>
<p>La duration di Macaulay è la media delle scadenze dei flussi, ognuna pesata per il valore attuale del flusso sul prezzo totale. Prendiamo un'obbligazione a tre anni con cedola annua del 5%, acquistata alla pari (100) con un rendimento del 5%:</p>
<ul>
<li>anno 1: cedola 5, valore attuale 4,76, peso 4,76%;</li>
<li>anno 2: cedola 5, valore attuale 4,54, peso 4,54%;</li>
<li>anno 3: cedola più rimborso 105, valore attuale 90,70, peso 90,70%.</li>
</ul>
<p>La duration di Macaulay è 1 × 0,0476 + 2 × 0,0454 + 3 × 0,9070 ≈ <strong>2,86 anni</strong>, un po' meno della scadenza di tre anni perché le cedole arrivano prima del rimborso. La duration modificata si ottiene dividendo per (1 + rendimento): 2,86 / 1,05 ≈ 2,72. Un aumento dei rendimenti di un punto ridurrebbe quindi il prezzo di circa il 2,7%.</p>
<h2 id="cosa-fa-cambiare">Cosa fa cambiare la duration</h2>
<ul>
<li><strong>Scadenza:</strong> più è lontana, più la duration è alta, a parità di altre condizioni.</li>
<li><strong>Cedola:</strong> cedole più alte restituiscono prima una parte del capitale e abbassano la duration. Un titolo senza cedola (zero coupon) ha una duration di Macaulay uguale alla scadenza.</li>
<li><strong>Livello dei rendimenti:</strong> con rendimenti più alti i flussi lontani pesano meno e la duration scende leggermente.</li>
<li><strong>Passare del tempo:</strong> avvicinandosi alla scadenza la duration diminuisce.</li>
</ul>
<h2 id="convessita">La convessità</h2>
<p>La regola "duration × variazione dei tassi" è una retta, mentre la relazione vera tra prezzo e rendimento è una curva. Per un'obbligazione a tasso fisso senza opzioni, la curva fa sì che il prezzo salga un po' di più quando i tassi scendono e scenda un po' di meno quando i tassi salgono, rispetto alla stima lineare. Questo effetto si chiama convessità e diventa rilevante per variazioni ampie dei tassi o per duration molto lunghe.</p>
<h2 id="duration-e-orizzonte">Duration e orizzonte dell'investitore</h2>
<p>Chi tiene un'obbligazione fino alla scadenza, se l'emittente paga regolarmente, riceve i flussi previsti indipendentemente dalle oscillazioni intermedie del prezzo. Chi pensa di vendere prima, invece, è esposto alle variazioni di prezzo misurate dalla duration. Confrontare la duration con il proprio orizzonte temporale aiuta a capire quanta parte del risultato può dipendere dall'andamento dei tassi.</p>
<p>La duration riguarda solo il rischio di tasso: il rischio che l'emittente non paghi va valutato a parte, con il rating e le altre misure descritte nella guida sul <a href="/it/guide/rischio-di-credito-obbligazioni">rischio di credito</a>.</p>
`,

  "obbligazioni-investment-grade": `
<h2 id="agenzie-e-scale">Le agenzie e le loro scale</h2>
<p>Le tre agenzie più diffuse usano scale simili ma con simboli diversi. Il confine dell'investment grade corrisponde a BBB− per S&amp;P e Fitch e a Baa3 per Moody's.</p>
<table><thead><tr><th scope="col">S&amp;P / Fitch</th><th scope="col">Moody's</th><th scope="col">Categoria</th></tr></thead><tbody>
<tr><td>AAA</td><td>Aaa</td><td>Investment grade</td></tr>
<tr><td>AA+ / AA / AA−</td><td>Aa1 / Aa2 / Aa3</td><td>Investment grade</td></tr>
<tr><td>A+ / A / A−</td><td>A1 / A2 / A3</td><td>Investment grade</td></tr>
<tr><td>BBB+ / BBB / BBB−</td><td>Baa1 / Baa2 / Baa3</td><td>Investment grade</td></tr>
<tr><td>BB+ e inferiori</td><td>Ba1 e inferiori</td><td>Speculative grade</td></tr>
</tbody></table>
<p>Lo stesso emittente può ricevere giudizi diversi dalle varie agenzie. Inoltre un'agenzia può valutare l'emittente nel suo complesso e, separatamente, una singola emissione, che può avere un rating più basso se è subordinata.</p>
<h2 id="outlook-e-revisioni">Outlook e revisioni del rating</h2>
<p>Accanto al rating le agenzie indicano spesso un <strong>outlook</strong> (positivo, stabile o negativo), cioè la direzione in cui il giudizio potrebbe muoversi nei mesi successivi, e possono mettere un rating "sotto osservazione". Il rating non è fisso: viene rivisto quando cambiano i conti o le condizioni dell'emittente.</p>
<h2 id="fallen-angels">Il passaggio da BBB− a BB+</h2>
<p>Il gradino più delicato è quello che separa BBB− da BB+. Un emittente declassato sotto questa soglia viene chiamato <em>fallen angel</em>. Alcuni investitori istituzionali e alcuni indici possono detenere solo titoli investment grade: quando un'obbligazione esce dalla categoria, possono essere costretti a venderla, e questo può pesare sul prezzo anche se la situazione dell'emittente non è cambiata molto.</p>
<h2 id="rendimento-e-spread">Rendimento e spread nell'investment grade</h2>
<p>Dentro l'investment grade il rendimento richiesto cresce in genere scendendo di rating: a parità di scadenza, un BBB offre di norma più di un AA, perché il mercato chiede un premio per il maggiore rischio di credito. Questo premio è lo <strong>spread di credito</strong>, la differenza di rendimento rispetto a un titolo di riferimento con scadenza simile. Lo spread cambia nel tempo: tende ad allargarsi nelle fasi di tensione e a restringersi quando i mercati sono più tranquilli.</p>
<h2 id="cosa-verificare">Cosa verificare oltre al rating</h2>
<ul>
<li>la <strong>seniority</strong>: un titolo senior viene rimborsato prima di uno subordinato in caso di difficoltà;</li>
<li>le <strong>clausole di rimborso anticipato</strong>, che possono accorciare la vita del titolo;</li>
<li>la <strong>valuta</strong>: un titolo in dollari espone anche al cambio;</li>
<li>la <strong>liquidità</strong> sul mercato su cui è negoziato.</li>
</ul>
<p>Per vedere come il rating si traduce in probabilità storiche di default, consulta la tabella sulla <a href="/it/guide/probabilita-default-rating">probabilità di default per rating</a>.</p>
`,

  "rischio-di-credito-obbligazioni": `
<h2 id="tasso-di-recupero">Il tasso di recupero</h2>
<p>Il default non significa necessariamente perdere tutto il capitale. La parte recuperata dagli obbligazionisti, chiamata <strong>tasso di recupero</strong>, è il complemento della perdita in caso di default (LGD): una LGD del 60% corrisponde a un recupero del 40%. Il recupero dipende soprattutto da:</p>
<ul>
<li><strong>seniority:</strong> i titoli senior vengono soddisfatti prima di quelli subordinati;</li>
<li><strong>garanzie:</strong> un'obbligazione garantita da beni specifici tende a recuperare di più;</li>
<li><strong>valore dell'emittente</strong> al momento della crisi e durata della procedura.</li>
</ul>
<h2 id="spread-di-credito">Lo spread di credito</h2>
<p>Lo spread è la differenza tra il rendimento di un'obbligazione e quello di un riferimento con scadenza simile, per esempio un titolo di Stato considerato a basso rischio o un tasso swap. In parte compensa la perdita attesa; in parte remunera la liquidità e l'incertezza. Per questo lo spread osservato è di solito più alto della sola perdita attesa calcolata con probabilità di default e LGD.</p>
<p>Esempio semplificato: se un titolo rende il 4,5% e un titolo di Stato con la stessa scadenza rende il 3%, lo spread è di 1,5 punti percentuali, cioè 150 punti base.</p>
<h2 id="rischio-di-credito-e-prezzo">Il rischio di credito si vede anche nel prezzo</h2>
<p>Il rischio di credito non si manifesta solo con il default. Se la qualità dell'emittente peggiora, oppure se il rating viene ridotto, il mercato chiede uno spread più alto e il prezzo dell'obbligazione scende, anche se tutte le cedole continuano a essere pagate. Chi vende prima della scadenza può quindi subire una perdita legata al credito senza che si verifichi alcun default.</p>
<h2 id="titoli-di-stato">Titoli di Stato e rischio di credito</h2>
<p>Anche gli Stati hanno un rischio di credito. Per i titoli di Stato si valutano, tra l'altro, il livello del debito pubblico, la crescita economica, la stabilità politica e la valuta in cui il debito è emesso. Le statistiche sui default degli Stati sono diverse da quelle delle società e non vanno confuse.</p>
<h2 id="diversificazione">Il ruolo della diversificazione</h2>
<p>La perdita attesa è una media: su un singolo titolo il risultato è "tutto o quasi" (il titolo paga oppure va in default). Distribuire il capitale tra più emittenti, settori e Paesi riduce l'impatto di un singolo default sul totale, anche se non elimina il rischio di credito complessivo, che tende a crescere in tutte le obbligazioni insieme nelle fasi di crisi economica.</p>
<p>Per i tassi storici di default di ogni rating, consulta la tabella sulla <a href="/it/guide/probabilita-default-rating">probabilità di default per rating</a>.</p>
`,

  "obbligazioni-alto-rendimento": `
<h2 id="spread-high-yield">Lo spread degli high yield</h2>
<p>Il rendimento di un'obbligazione high yield si può scomporre in due parti: il rendimento di un titolo di riferimento con scadenza simile e uno <strong>spread di credito</strong> che remunera il rischio aggiuntivo. Più il rating è basso, più lo spread tende a essere alto. Lo spread cambia nel tempo: nelle fasi di tensione sui mercati si allarga e i prezzi scendono, nelle fasi più tranquille si restringe.</p>
<h2 id="rendimento-atteso">Rendimento promesso e rendimento atteso</h2>
<p>Il rendimento a scadenza è il risultato nel caso in cui l'emittente paghi tutto. Il rendimento <em>atteso</em> tiene conto anche della probabilità di default e della perdita in caso di default. Un esempio semplificato, a un anno:</p>
<ul>
<li>rendimento a scadenza: 7%;</li>
<li>probabilità di default nell'anno: 3%;</li>
<li>perdita in caso di default: 60% del capitale.</li>
</ul>
<p>La perdita attesa è circa 3% × 60% = 1,8%, quindi il rendimento atteso è più vicino al 5% che al 7%. Il calcolo serve a capire il meccanismo, non a prevedere il risultato di un titolo specifico. I tassi storici di default per ogni rating sono nella tabella sulla <a href="/it/guide/probabilita-default-rating">probabilità di default per rating</a>.</p>
<h2 id="caratteristiche-tipiche">Caratteristiche frequenti nelle emissioni high yield</h2>
<ul>
<li><strong>Rimborso anticipato (call):</strong> molte emissioni possono essere rimborsate dall'emittente prima della scadenza, a prezzi prestabiliti. Se i tassi scendono, l'emittente può rimborsare e l'investitore deve reinvestire a condizioni peggiori.</li>
<li><strong>Covenant:</strong> clausole che limitano ciò che l'emittente può fare, per esempio contrarre altro debito. La loro forza varia molto da un'emissione all'altra.</li>
<li><strong>Taglio minimo:</strong> alcune emissioni hanno un lotto minimo elevato (per esempio 100.000 euro), che le rende poco accessibili ai piccoli investitori.</li>
<li><strong>Liquidità:</strong> gli scambi possono essere rari e la differenza tra prezzo denaro e lettera ampia.</li>
</ul>
<h2 id="concentrazione">Concentrazione e diversificazione</h2>
<p>Con le obbligazioni ad alto rendimento il risultato di un singolo titolo può essere molto diverso dalla media. Per questo il peso di ogni emittente sul totale conta: un singolo default pesa meno se il capitale è distribuito tra più emittenti e settori. 10BONDS, per esempio, mostra al massimo un'obbligazione per emittente nei suoi elenchi.</p>
<h2 id="domande">Domande da porsi prima di confrontare</h2>
<ul>
<li>Qual è il rating dell'emissione e quello dell'emittente?</li>
<li>Il titolo è senior o subordinato?</li>
<li>Può essere rimborsato in anticipo, e a quali condizioni?</li>
<li>Il rendimento più alto dipende dal rischio di credito, dalla scadenza, dalla valuta o dalla scarsa liquidità?</li>
</ul>
`,

  btp: `
<h2 id="tipologie-btp">Le principali tipologie di BTP</h2>
<ul>
<li><strong>BTP a tasso fisso:</strong> cedola fissa pagata ogni sei mesi e rimborso del valore nominale alla scadenza.</li>
<li><strong>BTP€i:</strong> capitale e cedole sono indicizzati all'inflazione dell'area euro (indice armonizzato dei prezzi al consumo, esclusi i tabacchi).</li>
<li><strong>BTP Italia:</strong> indicizzati all'inflazione italiana (indice FOI senza tabacchi), pensati soprattutto per i risparmiatori.</li>
<li><strong>BTP Valore e BTP Più:</strong> emissioni dedicate ai risparmiatori individuali, con cedole crescenti nel tempo e, a seconda dell'emissione, premi o opzioni di rimborso anticipato per chi le sottoscrive al collocamento.</li>
</ul>
<p>Le caratteristiche precise di ogni emissione sono pubblicate dal Ministero dell'Economia e delle Finanze nella scheda del titolo.</p>
<h2 id="rendimenti-btp">Come si leggono i rendimenti dei BTP</h2>
<p>Per un BTP già in circolazione il rendimento che conta è il <strong>rendimento effettivo a scadenza</strong>, calcolato sul prezzo di mercato: un BTP comprato sotto 100 rende più della sua cedola, uno comprato sopra 100 rende meno. Confrontando i rendimenti dei BTP con scadenze diverse si ottiene la <strong>curva dei rendimenti</strong>: di solito le scadenze più lunghe offrono rendimenti più alti, ma non è sempre così. Lo <strong>spread BTP-Bund</strong> è invece la differenza tra il rendimento del BTP decennale e quello del titolo tedesco con scadenza simile, ed è spesso usato come misura del rischio percepito sull'Italia. I rendimenti dei singoli BTP di oggi sono nella <a href="/it/obbligazioni/btp">tabella dei rendimenti BTP</a>.</p>
<h2 id="rendimento-netto">Il rendimento netto di un BTP</h2>
<p>Per un investitore italiano in regime ordinario, cedole e plusvalenze dei BTP sono tassate di norma al <strong>12,5%</strong>, contro il 26% della maggior parte delle obbligazioni societarie. Esempio semplificato: con un rendimento lordo del 3,5%, il rendimento netto dopo l'imposta del 12,5% è circa il 3,06% (3,5 × 0,875), prima di commissioni e imposta di bollo sul deposito titoli. Per fare il calcolo con i tuoi numeri usa il <a href="/it/calcolatori/rendimento-netto-btp">calcolatore del rendimento netto dei BTP</a>.</p>
<h2 id="come-si-comprano">Come si comprano</h2>
<p>I BTP si possono sottoscrivere all'emissione, tramite le aste del Tesoro o i collocamenti dedicati ai risparmiatori, oppure comprare sul mercato secondario, in particolare sul MOT di Borsa Italiana, tramite la propria banca o un intermediario online. Il taglio minimo è normalmente di 1.000 euro di valore nominale. Sul secondario il prezzo è quello di mercato del momento, a cui si aggiunge il rateo della cedola maturata.</p>
`,

  "btp-o-obbligazioni-corporate": `
<h2 id="esempio-netto">Un esempio sul rendimento netto</h2>
<p>Prendiamo due titoli con scadenza e duration simili: un BTP con rendimento lordo a scadenza del 3,4% e un'obbligazione societaria con rendimento lordo del 4,2%. Con le aliquote ordinarie italiane:</p>
<ul>
<li>BTP: 3,4% × (1 − 12,5%) ≈ <strong>2,98%</strong> netto;</li>
<li>obbligazione societaria: 4,2% × (1 − 26%) ≈ <strong>3,11%</strong> netto.</li>
</ul>
<p>La differenza lorda di 0,8 punti si riduce a circa 0,13 punti dopo le imposte. Il confronto andrebbe poi completato con commissioni, liquidità e, soprattutto, con il diverso rischio di credito. L'esempio è illustrativo: i numeri reali dipendono dai titoli e dalla situazione fiscale personale.</p>
<h2 id="aliquota-12-5">Quali titoli hanno l'aliquota del 12,5%</h2>
<p>L'aliquota agevolata non riguarda solo i BTP. Si applica in generale ai titoli di Stato italiani (BOT, BTP, CCT e simili), ai titoli di Stati inclusi nella lista dei Paesi che consentono un adeguato scambio di informazioni con l'Italia e alle obbligazioni di organismi sovranazionali come la Banca Europea per gli Investimenti. Le obbligazioni delle società, comprese le banche, sono tassate di norma al 26%.</p>
<h2 id="rischio-di-credito">Rischio di credito: Stato ed emittenti privati</h2>
<p>Il rischio di un BTP è legato alla capacità di rimborso dello Stato italiano. Il rischio di un'obbligazione corporate è legato ai conti della singola società e alla posizione del titolo nella sua struttura del debito. Esistono società con rating più alto dello Stato in cui hanno sede e società con rating molto più basso. Per questo il rating dell'emissione è un elemento essenziale del confronto.</p>
<h2 id="spread">Lo spread tra corporate e BTP</h2>
<p>La differenza di rendimento tra un'obbligazione societaria e un BTP con scadenza simile è una forma di spread di credito. Cambia nel tempo e tende ad aumentare nelle fasi di tensione economica, quando gli investitori chiedono un premio maggiore per il rischio delle imprese. Uno spread molto ampio può indicare un rischio elevato percepito dal mercato.</p>
<h2 id="liquidita">Liquidità e taglio minimo</h2>
<p>I BTP sono in genere tra i titoli più scambiati del mercato obbligazionario italiano. Molte obbligazioni societarie hanno invece scambi meno frequenti, una differenza più ampia tra prezzo di acquisto e di vendita e, in alcuni casi, un lotto minimo elevato. Chi potrebbe aver bisogno di vendere prima della scadenza dovrebbe tenerne conto.</p>
`,

  "btp-o-etf-obbligazionari": `
<h2 id="esempio-costi">Un esempio sui costi</h2>
<p>Su un investimento di 10.000 euro mantenuto per cinque anni, un ETF con costi correnti dello 0,15% annuo costa circa 15 euro l'anno, quindi circa 75 euro in cinque anni, oltre alle commissioni di acquisto e vendita. Un BTP tenuto fino alla scadenza non ha costi correnti: si pagano le commissioni di acquisto e, come per l'ETF, l'imposta di bollo sul deposito titoli. I costi reali variano da prodotto a prodotto e da intermediario a intermediario: i numeri servono solo a mostrare il confronto.</p>
<h2 id="tassazione">La tassazione</h2>
<p>Per un investitore italiano in regime ordinario, cedole e plusvalenze dei BTP sono tassate di norma al 12,5%. Per un ETF obbligazionario l'aliquota sui proventi è generalmente del 26%, ridotta in proporzione alla quota di titoli di Stato ed equiparati presenti nel fondo. C'è poi una differenza importante: nell'ETF le plusvalenze sono di norma redditi di capitale, mentre le minusvalenze sono redditi diversi, e quindi le minusvalenze accumulate in passato non si possono compensare con i guadagni realizzati su un ETF. Conviene verificare la propria situazione con l'intermediario o con un consulente fiscale.</p>
<h2 id="rischio-di-tasso">Rischio di tasso: scadenza fissa e duration costante</h2>
<p>Un BTP si avvicina alla scadenza giorno dopo giorno: la sua duration scende e, alla scadenza, il rimborso del valore nominale è previsto dal contratto. Un ETF obbligazionario tradizionale, invece, vende i titoli che si avvicinano alla scadenza e ne compra di nuovi, mantenendo una duration più o meno costante. Questo significa che il valore dell'ETF resta esposto alle variazioni dei tassi per tutto il tempo in cui lo si detiene, senza una data in cui il capitale "torna" a un valore prefissato.</p>
<h2 id="replica">Come un ETF replica l'indice</h2>
<p>Un ETF obbligazionario segue un indice. La replica può essere <strong>fisica</strong>, con l'acquisto di tutti o di una parte dei titoli dell'indice, oppure <strong>sintetica</strong>, tramite contratti derivati. Prima di un confronto conviene leggere il documento informativo (KID) e la scheda dell'ETF: indice di riferimento, duration media, rating medio, valuta, costi correnti e politica sulle cedole (distribuzione o accumulo).</p>
<h2 id="domande">Domande utili per il confronto</h2>
<ul>
<li>Serve una data di rimborso precisa, o è sufficiente un'esposizione continuativa al mercato obbligazionario?</li>
<li>Quanto conta la diversificazione tra emittenti rispetto all'esposizione a un solo Stato?</li>
<li>Qual è l'orizzonte temporale e quanto può pesare il rischio di tasso nel periodo?</li>
</ul>
`,

  "probabilita-default-rating": `
<h2 id="esempio-portafoglio">Un esempio su un portafoglio</h2>
<p>Immaginiamo dieci obbligazioni BBB di emittenti diversi, ognuna con scadenza a cinque anni. Con un tasso di default cumulato medio dell'1,40% a cinque anni, il numero di default atteso nel gruppo è circa 0,14: in media meno di un default ogni settanta obbligazioni di questo tipo. Ma la media non dice quanto sarà fortunato o sfortunato un singolo portafoglio, e i default tendono a concentrarsi negli stessi periodi di crisi economica.</p>
<p>Se un'obbligazione va in default, la perdita dipende da quanto si recupera: con un recupero del 40%, perdere un titolo su dieci costerebbe circa il 6% del portafoglio prima delle cedole già incassate.</p>
`,
};
