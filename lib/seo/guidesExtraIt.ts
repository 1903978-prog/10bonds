// Sections added under the owner's Italian guides (he agreed on 19 Oct 2026, so each guide reaches 600+ words). His text
// stays word for word above them; these only follow it. Educational only: no recommendation, no invented data.

export const EXTRA_IT: Record<string, string> = {
  "rendimento-a-scadenza": `
<h2 id="calcolo-passo-per-passo">Il calcolo passo per passo</h2>
<p>Torniamo al nostro titolo: lo si paga €950, stacca una cedola annua di €40 e tra cinque anni restituisce €1.000. Il rendimento a scadenza è quel tasso <em>y</em>, uno solo, che fa quadrare i conti in questa equazione:</p>
<p><code>950 = 40/(1+y) + 40/(1+y)² + 40/(1+y)³ + 40/(1+y)⁴ + 1.040/(1+y)⁵</code></p>
<p>Una formula diretta non c'è. Si procede per tentativi, come chi regola la doccia: si sceglie un tasso, si calcola il valore attuale, si corregge finché non combacia con il prezzo. Al 5% il valore attuale vale circa €956,7, appena sopra il prezzo; al 5,2% scende a circa €948,4. La risposta sta nel mezzo, intorno al 5,16%.</p>
<p>Per una verifica sul retro di una busta esiste una <strong>formula approssimata</strong>:</p>
<p><code>YTM ≈ (C + (Rimborso − Prezzo) / n) / ((Rimborso + Prezzo) / 2)</code></p>
<p>Applicata ai nostri numeri dà (40 + 50/5) / 975 = 5,13%. Vicino al valore esatto, ma l'approssimazione perde colpi dove servirebbe di più: con scadenze lunghe o prezzi lontani dalla pari lo scarto cresce.</p>
<h2 id="foglio-di-calcolo">Calcolarlo con un foglio di calcolo</h2>
<p>In Excel o Google Fogli la funzione <code>REND</code> (in inglese <code>YIELD</code>) dà il rendimento a scadenza partendo da data di regolamento, data di scadenza, tasso cedolare, prezzo, valore di rimborso e numero di cedole all'anno. In alternativa, <code>TIR.COST</code> (<code>IRR</code>) arriva allo stesso risultato in modo più artigianale: i flussi uno per riga, il prezzo pagato con il segno meno, poi cedole e rimborso.</p>
<p>Un dettaglio che inganna molti: il prezzo può essere <strong>"tel quel"</strong>, cioè comprensivo della cedola maturata, oppure <strong>"secco"</strong>, che ne è privo. In Italia si quota il prezzo secco e, al momento dell'acquisto, si aggiunge il rateo di cedola maturato. Il rendimento va calcolato sul prezzo secco e con le date giuste; sbagliare una delle due cose produce un numero preciso al centesimo e sbagliato nella sostanza.</p>
<h2 id="altri-rendimenti">Rendimento corrente, a scadenza e al richiamo</h2>
<ul>
<li><strong>Rendimento corrente:</strong> la cedola annua divisa per il prezzo (40/950 = 4,21%). Comodo, ma racconta mezza storia: ignora del tutto la differenza tra prezzo pagato e rimborso.</li>
<li><strong>Rendimento a scadenza:</strong> mette insieme cedole, prezzo e rimborso, a patto che valgano le ipotesi descritte sopra.</li>
<li><strong>Rendimento al richiamo</strong> (yield to call): per le obbligazioni che l'emittente ha facoltà di rimborsare in anticipo, è il rendimento calcolato fino alla prima data di richiamo. Il più prudente dei due prende il nome, poco consolante, di <em>yield to worst</em>.</li>
</ul>
<h2 id="lordo-e-netto">Rendimento lordo e netto</h2>
<p>Il rendimento a scadenza degli strumenti di confronto è di norma <strong>lordo</strong>: quello di un mondo senza fisco. Per un investitore italiano in regime ordinario, interessi e plusvalenze scontano in genere un'imposta del 26%, che scende al 12,5% per i titoli di Stato italiani ed equiparati. A questo si sommano le commissioni di acquisto e l'imposta di bollo sul deposito titoli. Il netto, insomma, è sempre più magro del lordo: la propria situazione fiscale va verificata con la banca o con un consulente.</p>
`,

  "duration-obbligazioni": `
<h2 id="calcolo-duration">Come si calcola la duration di Macaulay</h2>
<p>La duration di Macaulay è una media delle scadenze dei flussi, in cui ogni scadenza conta in proporzione al valore attuale del suo flusso rispetto al prezzo totale. Detto così sembra un indovinello; un esempio lo scioglie. Prendiamo un'obbligazione a tre anni con cedola annua del 5%, comprata alla pari (100) con un rendimento del 5%:</p>
<ul>
<li>anno 1: cedola 5, valore attuale 4,76, peso 4,76%;</li>
<li>anno 2: cedola 5, valore attuale 4,54, peso 4,54%;</li>
<li>anno 3: cedola più rimborso 105, valore attuale 90,70, peso 90,70%.</li>
</ul>
<p>Il conto è 1 × 0,0476 + 2 × 0,0454 + 3 × 0,9070 ≈ <strong>2,86 anni</strong>. Un filo meno dei tre anni di scadenza, perché le cedole arrivano prima del rimborso e tirano la media verso il presente. Dividendo per (1 + rendimento) si ottiene la duration modificata: 2,86 / 1,05 ≈ 2,72. Tradotto: se i rendimenti salissero di un punto, il prezzo perderebbe circa il 2,7%.</p>
<h2 id="cosa-fa-cambiare">Cosa fa cambiare la duration</h2>
<ul>
<li><strong>Scadenza:</strong> a parità di tutto il resto, più è lontana e più la duration cresce.</li>
<li><strong>Cedola:</strong> cedole generose restituiscono in anticipo una fetta del capitale e quindi abbassano la duration. Un titolo senza cedola (zero coupon) non restituisce nulla fino alla fine, e infatti la sua duration di Macaulay coincide con la scadenza.</li>
<li><strong>Livello dei rendimenti:</strong> quando i rendimenti sono più alti, i flussi lontani pesano meno e la duration cala leggermente.</li>
<li><strong>Il tempo che passa:</strong> man mano che la scadenza si avvicina, la duration si accorcia.</li>
</ul>
<h2 id="convessita">La convessità</h2>
<p>La regola "duration × variazione dei tassi" disegna una retta. La relazione vera tra prezzo e rendimento, però, è una curva. Per un'obbligazione a tasso fisso senza opzioni, la curvatura gioca a favore di chi la detiene: rispetto alla stima lineare, il prezzo sale un po' di più quando i tassi scendono e cala un po' di meno quando i tassi salgono. È la convessità, un dettaglio trascurabile per piccoli movimenti che diventa rilevante con variazioni ampie dei tassi o con duration molto lunghe.</p>
<h2 id="duration-e-orizzonte">Duration e orizzonte dell'investitore</h2>
<p>Chi tiene l'obbligazione fino alla scadenza, se l'emittente paga regolarmente, riceve i flussi previsti qualunque cosa faccia il prezzo nel frattempo. Chi invece potrebbe vendere prima è esposto proprio a quelle variazioni, ed è la duration a misurarle. Mettere a confronto la duration con il proprio orizzonte temporale aiuta a capire quanta parte del risultato finale rischia di dipendere dall'umore dei tassi.</p>
<p>La duration si occupa soltanto del rischio di tasso. Il rischio che l'emittente non paghi va valutato a parte con il rating e con le misure descritte nella guida sul <a href="/it/guide/rischio-di-credito-obbligazioni">rischio di credito</a>.</p>
`,

  "obbligazioni-investment-grade": `
<h2 id="agenzie-e-scale">Le agenzie e le loro scale</h2>
<p>Le tre agenzie più diffuse parlano dialetti diversi della stessa lingua: scale simili, simboli differenti. Il confine dell'investment grade cade a BBB− per S&amp;P e Fitch e a Baa3 per Moody's.</p>
<table><thead><tr><th scope="col">S&amp;P / Fitch</th><th scope="col">Moody's</th><th scope="col">Categoria</th></tr></thead><tbody>
<tr><td>AAA</td><td>Aaa</td><td>Investment grade</td></tr>
<tr><td>AA+ / AA / AA−</td><td>Aa1 / Aa2 / Aa3</td><td>Investment grade</td></tr>
<tr><td>A+ / A / A−</td><td>A1 / A2 / A3</td><td>Investment grade</td></tr>
<tr><td>BBB+ / BBB / BBB−</td><td>Baa1 / Baa2 / Baa3</td><td>Investment grade</td></tr>
<tr><td>BB+ e inferiori</td><td>Ba1 e inferiori</td><td>Speculative grade</td></tr>
</tbody></table>
<p>Le agenzie non la pensano sempre allo stesso modo: lo stesso emittente può ricevere giudizi diversi. Inoltre un'agenzia può valutare l'emittente nel suo insieme e, separatamente, una singola emissione, che se è subordinata può avere un voto più basso.</p>
<h2 id="outlook-e-revisioni">Outlook e revisioni del rating</h2>
<p>Accanto al voto le agenzie indicano spesso un <strong>outlook</strong> (positivo, stabile o negativo), una previsione del tempo sulla direzione che il giudizio potrebbe prendere nei mesi successivi. Possono anche mettere un rating "sotto osservazione", l'equivalente di un cartellino giallo sospeso a mezz'aria. Il rating, in ogni caso, non è scolpito nel marmo: viene rivisto quando cambiano i conti o le condizioni dell'emittente.</p>
<h2 id="fallen-angels">Il passaggio da BBB− a BB+</h2>
<p>Il gradino più scivoloso è quello tra BBB− e BB+. L'emittente declassato sotto questa soglia si guadagna un soprannome quasi poetico, <em>fallen angel</em>, e conseguenze molto prosaiche. Alcuni investitori istituzionali e alcuni indici possono detenere soltanto titoli investment grade: quando un'obbligazione esce dalla categoria, possono essere costretti a venderla. Quelle vendite forzate possono pesare sul prezzo anche se, nel frattempo, la situazione dell'emittente è cambiata poco.</p>
<h2 id="rendimento-e-spread">Rendimento e spread nell'investment grade</h2>
<p>Anche dentro l'investment grade vale la vecchia regola del mercato: più rischio, più compenso. A parità di scadenza, un BBB offre di norma più di un AA, perché chi presta chiede un premio per il maggiore rischio di credito. Quel premio si chiama <strong>spread di credito</strong> ed è la differenza di rendimento rispetto a un titolo di riferimento con scadenza simile. Lo spread non sta fermo: tende ad allargarsi quando i mercati si innervosiscono e a restringersi quando tornano tranquilli.</p>
<h2 id="cosa-verificare">Cosa verificare oltre al rating</h2>
<p>Il rating è la copertina, non il libro. Conviene guardare anche:</p>
<ul>
<li>la <strong>seniority</strong>: se le cose vanno male, un titolo senior viene rimborsato prima di uno subordinato;</li>
<li>le <strong>clausole di rimborso anticipato</strong>, che possono accorciare la vita del titolo;</li>
<li>la <strong>valuta</strong>: un titolo in dollari aggiunge al conto anche il rischio di cambio;</li>
<li>la <strong>liquidità</strong> sul mercato in cui è negoziato.</li>
</ul>
<p>Per vedere come il rating si traduce in probabilità storiche di default, c'è la tabella sulla <a href="/it/guide/probabilita-default-rating">probabilità di default per rating</a>.</p>
`,

  "rischio-di-credito-obbligazioni": `
<h2 id="tasso-di-recupero">Il tasso di recupero</h2>
<p>Default non vuol dire per forza perdere tutto. La parte che gli obbligazionisti riescono a recuperare si chiama <strong>tasso di recupero</strong>. È il complemento della perdita in caso di default (LGD): una LGD del 60% equivale a un recupero del 40%. Quanto si porta a casa dipende soprattutto da tre fattori:</p>
<ul>
<li><strong>seniority:</strong> i titoli senior passano alla cassa prima di quelli subordinati;</li>
<li><strong>garanzie:</strong> un'obbligazione garantita da beni specifici tende a recuperare di più;</li>
<li><strong>valore dell'emittente</strong> al momento della crisi e durata della procedura.</li>
</ul>
<h2 id="spread-di-credito">Lo spread di credito</h2>
<p>Lo spread è la distanza tra il rendimento di un'obbligazione e quello di un riferimento con scadenza simile, per esempio un titolo di Stato considerato a basso rischio oppure un tasso swap. Non è un compenso per un solo motivo. In parte copre la perdita attesa; in parte paga la scarsa liquidità e quella vaga inquietudine che i mercati chiamano incertezza. Ecco perché lo spread che si osserva è di solito più alto della sola perdita attesa calcolata con probabilità di default e LGD.</p>
<p>Un esempio semplificato: se un titolo rende il 4,5% e un titolo di Stato con la stessa scadenza rende il 3%, lo spread è di 1,5 punti percentuali, ossia 150 punti base.</p>
<h2 id="rischio-di-credito-e-prezzo">Il rischio di credito si vede anche nel prezzo</h2>
<p>Il rischio di credito non aspetta il default per farsi sentire. Basta che la qualità dell'emittente peggiori, o che il rating venga tagliato, perché il mercato pretenda uno spread più alto e il prezzo dell'obbligazione scenda. Il tutto mentre le cedole continuano ad arrivare puntuali. Chi vende prima della scadenza può dunque incassare una perdita dovuta al credito senza che nessuno abbia mai mancato un pagamento.</p>
<h2 id="titoli-di-stato">Titoli di Stato e rischio di credito</h2>
<p>Nemmeno gli Stati sono esenti, per quanto preferiscano non sentirselo dire. Per i titoli di Stato si guardano, tra le altre cose, il livello del debito pubblico, la crescita economica, la stabilità politica e la valuta in cui il debito è emesso. Le statistiche sui default sovrani seguono logiche diverse da quelle delle società, e mescolarle è un errore da evitare.</p>
<h2 id="diversificazione">Il ruolo della diversificazione</h2>
<p>La perdita attesa è una media, e le medie sono creature astratte. Sul singolo titolo il risultato è quasi binario: o paga, o va in default. Distribuire il capitale tra più emittenti, settori e Paesi attenua l'impatto di un singolo default sul totale. Non cancella però il rischio di credito complessivo, che nelle fasi di crisi economica tende a salire per tutte le obbligazioni insieme.</p>
<p>I tassi storici di default per ogni rating sono raccolti nella tabella sulla <a href="/it/guide/probabilita-default-rating">probabilità di default per rating</a>.</p>
`,

  "obbligazioni-alto-rendimento": `
<h2 id="spread-high-yield">Lo spread degli high yield</h2>
<p>Il rendimento di un'obbligazione high yield si scompone come una ricetta in due ingredienti: il rendimento di un titolo di riferimento con scadenza simile e uno <strong>spread di credito</strong> che remunera il rischio in più. Scendendo di rating, lo spread tende a salire. Non è un numero fisso: quando i mercati entrano in tensione si allarga e i prezzi calano, quando il clima si rasserena si restringe.</p>
<h2 id="rendimento-atteso">Rendimento promesso e rendimento atteso</h2>
<p>Il rendimento a scadenza è una promessa: descrive ciò che accade se l'emittente paga tutto, fino all'ultimo centesimo. Il rendimento <em>atteso</em> è meno ottimista e mette nel conto anche la probabilità di default e la perdita che ne seguirebbe. Ecco un esempio semplificato, su un anno:</p>
<ul>
<li>rendimento a scadenza: 7%;</li>
<li>probabilità di default nell'anno: 3%;</li>
<li>perdita in caso di default: 60% del capitale.</li>
</ul>
<p>La perdita attesa vale circa 3% × 60% = 1,8%, per cui il rendimento atteso si avvicina più al 5% che al 7%. La differenza tra le due cifre è il prezzo della realtà. Il calcolo serve a capire il meccanismo, non a prevedere come andrà un titolo specifico. I tassi storici di default per ogni rating sono nella tabella sulla <a href="/it/guide/probabilita-default-rating">probabilità di default per rating</a>.</p>
<h2 id="caratteristiche-tipiche">Caratteristiche frequenti nelle emissioni high yield</h2>
<ul>
<li><strong>Rimborso anticipato (call):</strong> molte emissioni possono essere rimborsate dall'emittente prima della scadenza, a prezzi stabiliti in anticipo. Se i tassi scendono, l'emittente rimborsa volentieri e all'investitore tocca reinvestire a condizioni peggiori. La festa finisce proprio quando la musica era migliore.</li>
<li><strong>Covenant:</strong> clausole che pongono limiti all'emittente, per esempio sulla possibilità di contrarre altro debito. La loro robustezza cambia moltissimo da un'emissione all'altra.</li>
<li><strong>Taglio minimo:</strong> alcune emissioni prevedono un lotto minimo elevato (per esempio 100.000 euro), che di fatto le tiene lontane dai piccoli investitori.</li>
<li><strong>Liquidità:</strong> gli scambi possono essere rari e la distanza tra prezzo denaro e lettera piuttosto ampia.</li>
</ul>
<h2 id="concentrazione">Concentrazione e diversificazione</h2>
<p>Nell'alto rendimento la media è una cattiva compagna di viaggio: il risultato di un singolo titolo può discostarsene parecchio. Per questo il peso di ciascun emittente sul totale fa la differenza. Un default fa meno male se il capitale è distribuito tra più emittenti e settori. 10BONDS, per esempio, nei suoi elenchi mostra al massimo un'obbligazione per emittente.</p>
<h2 id="domande">Domande da porsi prima di confrontare</h2>
<p>Prima di farsi sedurre da una cedola a una cifra alta, conviene un piccolo interrogatorio:</p>
<ul>
<li>Qual è il rating dell'emissione, e quale quello dell'emittente?</li>
<li>Il titolo è senior o subordinato?</li>
<li>Può essere rimborsato in anticipo, e a quali condizioni?</li>
<li>Il rendimento più alto nasce dal rischio di credito, dalla scadenza, dalla valuta o dalla scarsa liquidità?</li>
</ul>
`,

  btp: `
<h2 id="tipologie-btp">Le principali tipologie di BTP</h2>
<p>Dietro la sigla BTP c'è una famiglia allargata, con parenti di carattere diverso:</p>
<ul>
<li><strong>BTP a tasso fisso:</strong> il capostipite. Cedola fissa pagata ogni sei mesi e rimborso del valore nominale alla scadenza.</li>
<li><strong>BTP€i:</strong> capitale e cedole sono agganciati all'inflazione dell'area euro (indice armonizzato dei prezzi al consumo, esclusi i tabacchi).</li>
<li><strong>BTP Italia:</strong> indicizzati invece all'inflazione italiana (indice FOI senza tabacchi), pensati soprattutto per i risparmiatori.</li>
<li><strong>BTP Valore e BTP Più:</strong> emissioni riservate ai risparmiatori individuali, con cedole che crescono nel tempo e, secondo l'emissione, premi o opzioni di rimborso anticipato per chi le sottoscrive al collocamento.</li>
</ul>
<p>I dettagli di ciascuna emissione li pubblica il Ministero dell'Economia e delle Finanze nella scheda del titolo.</p>
<h2 id="rendimenti-btp">Come si leggono i rendimenti dei BTP</h2>
<p>Per un BTP già in circolazione la cedola racconta mezza storia: quello che conta è il <strong>rendimento effettivo a scadenza</strong>, calcolato sul prezzo di mercato: un BTP comprato sotto 100 rende più della sua cedola, uno comprato sopra 100 rende meno. Mettendo in fila i rendimenti dei BTP con scadenze diverse si disegna la <strong>curva dei rendimenti</strong>. Di solito le scadenze lunghe pagano di più, ma la curva ogni tanto si prende qualche libertà. Lo <strong>spread BTP-Bund</strong>, infine, è la differenza tra il rendimento del BTP decennale e quello del titolo tedesco con scadenza simile: il numero che i telegiornali amano citare come termometro del rischio percepito sull'Italia. I rendimenti dei singoli BTP di oggi sono nella <a href="/it/obbligazioni/btp">tabella dei rendimenti BTP</a>.</p>
<h2 id="rendimento-netto">Il rendimento netto di un BTP</h2>
<p>Qui il BTP gioca in casa. Per un investitore italiano in regime ordinario, cedole e plusvalenze dei BTP sono di norma tassate al <strong>12,5%</strong>, contro il 26% della maggior parte delle obbligazioni societarie. Un esempio semplificato: con un rendimento lordo del 3,5%, il netto dopo l'imposta del 12,5% è circa il 3,06% (3,5 × 0,875), prima di commissioni e imposta di bollo sul deposito titoli. Per rifare il conto con i propri numeri c'è il <a href="/it/calcolatori/rendimento-netto-btp">calcolatore del rendimento netto dei BTP</a>.</p>
<h2 id="come-si-comprano">Come si comprano</h2>
<p>Si può sottoscrivere il BTP all'emissione, attraverso le aste del Tesoro o i collocamenti dedicati ai risparmiatori, oppure comprarlo sul mercato secondario, in particolare sul MOT di Borsa Italiana, passando dalla propria banca o da un intermediario online. Il taglio minimo è di norma di 1.000 euro di valore nominale. Sul secondario si paga il prezzo di mercato del momento, a cui si aggiunge il rateo della cedola maturata: una piccola quota d'ingresso dovuta a chi ha tenuto il titolo fino al giorno prima.</p>
`,

  "btp-o-obbligazioni-corporate": `
<h2 id="esempio-netto">Un esempio sul rendimento netto</h2>
<p>Mettiamo sul ring due titoli con scadenza e duration simili: un BTP con rendimento lordo a scadenza del 3,4% e un'obbligazione societaria che offre il 4,2% lordo. Sulla carta non c'è partita. Poi arriva il fisco, con le aliquote ordinarie italiane:</p>
<ul>
<li>BTP: 3,4% × (1 − 12,5%) ≈ <strong>2,98%</strong> netto;</li>
<li>obbligazione societaria: 4,2% × (1 − 26%) ≈ <strong>3,11%</strong> netto.</li>
</ul>
<p>Lo scarto lordo di 0,8 punti si riduce a circa 0,13 punti dopo le imposte: da vittoria netta a vittoria ai punti. E il confronto non è finito, perché mancano commissioni, liquidità e soprattutto il diverso rischio di credito. L'esempio ha solo valore illustrativo: i numeri reali dipendono dai titoli scelti e dalla situazione fiscale di ciascuno.</p>
<h2 id="aliquota-12-5">Quali titoli hanno l'aliquota del 12,5%</h2>
<p>Lo sconto fiscale non è un'esclusiva dei BTP. In generale vale per i titoli di Stato italiani (BOT, BTP, CCT e simili), per i titoli degli Stati inclusi nella lista dei Paesi che garantiscono un adeguato scambio di informazioni con l'Italia e per le obbligazioni di organismi sovranazionali come la Banca Europea per gli Investimenti. Le obbligazioni delle società, banche comprese, restano di norma al 26%.</p>
<h2 id="rischio-di-credito">Rischio di credito: Stato ed emittenti privati</h2>
<p>Il rischio di un BTP dipende dalla capacità di rimborso dello Stato italiano. Quello di un'obbligazione corporate dipende dai conti di una singola società e dal posto che il titolo occupa nella sua struttura del debito. Le gerarchie non sono scontate: ci sono società con un rating più alto dello Stato in cui hanno sede, e altre con un rating molto più basso. Per questo il rating dell'emissione è un tassello imprescindibile del confronto.</p>
<h2 id="spread">Lo spread tra corporate e BTP</h2>
<p>La differenza di rendimento tra un'obbligazione societaria e un BTP di scadenza simile è una forma di spread di credito. Varia nel tempo e tende a crescere nelle fasi di tensione economica, quando gli investitori diventano più esigenti sul rischio delle imprese. Uno spread molto ampio può segnalare che il mercato percepisce un rischio elevato, e raramente lo fa per distrazione.</p>
<h2 id="liquidita">Liquidità e taglio minimo</h2>
<p>I BTP sono in genere tra i titoli più scambiati del mercato obbligazionario italiano. Molte obbligazioni societarie, al contrario, passano di mano meno spesso, hanno una differenza più ampia tra prezzo di acquisto e di vendita e, in alcuni casi, un lotto minimo elevato. Chi potrebbe aver bisogno di vendere prima della scadenza farebbe bene a tenerne conto, prima che sia il mercato a ricordarglielo.</p>
`,

  "btp-o-etf-obbligazionari": `
<h2 id="esempio-costi">Un esempio sui costi</h2>
<p>Partiamo dai soldi. Su 10.000 euro investiti per cinque anni, un ETF con costi correnti dello 0,15% annuo costa circa 15 euro l'anno, quindi circa 75 euro in cinque anni, a cui si aggiungono le commissioni di acquisto e vendita. Un BTP tenuto fino alla scadenza non ha costi correnti: si pagano le commissioni di acquisto e, esattamente come per l'ETF, l'imposta di bollo sul deposito titoli. I costi reali cambiano da prodotto a prodotto e da intermediario a intermediario: i numeri servono solo a mostrare il confronto.</p>
<h2 id="tassazione">La tassazione</h2>
<p>Per un investitore italiano in regime ordinario, cedole e plusvalenze dei BTP sono di norma tassate al 12,5%. Sui proventi di un ETF obbligazionario l'aliquota è generalmente del 26%, ridotta in proporzione alla quota di titoli di Stato ed equiparati presenti nel fondo. Poi c'è un dettaglio che il fisco italiano custodisce con particolare affetto: nell'ETF le plusvalenze sono di norma redditi di capitale, mentre le minusvalenze sono redditi diversi. Risultato: le minusvalenze accumulate in passato non si possono compensare con i guadagni realizzati su un ETF. Conviene verificare la propria situazione con l'intermediario o con un consulente fiscale.</p>
<h2 id="rischio-di-tasso">Rischio di tasso: scadenza fissa e duration costante</h2>
<p>Un BTP invecchia, e in questo caso è un pregio. Giorno dopo giorno si avvicina alla scadenza, la sua duration si accorcia e, alla fine, il rimborso del valore nominale è scritto nel contratto. Un ETF obbligazionario tradizionale, invece, è una specie di eterno trentenne: vende i titoli che si avvicinano alla scadenza e ne compra di nuovi, così da mantenere una duration più o meno costante. Ne consegue che il valore dell'ETF resta esposto alle variazioni dei tassi per tutto il tempo in cui lo si possiede, senza una data in cui il capitale "torna" a un valore prefissato.</p>
<h2 id="replica">Come un ETF replica l'indice</h2>
<p>Un ETF obbligazionario segue un indice, e può farlo in due modi. La replica <strong>fisica</strong> consiste nel comprare tutti i titoli dell'indice o una parte rappresentativa; la replica <strong>sintetica</strong> passa invece attraverso contratti derivati. Prima di qualsiasi confronto vale la pena leggere il documento informativo (KID) e la scheda dell'ETF: indice di riferimento, duration media, rating medio, valuta, costi correnti e politica sulle cedole (distribuzione o accumulo).</p>
<h2 id="domande">Domande utili per il confronto</h2>
<p>La scelta dipende meno dallo strumento che da chi lo compra:</p>
<ul>
<li>Serve una data di rimborso precisa, o basta un'esposizione continuativa al mercato obbligazionario?</li>
<li>Quanto conta la diversificazione tra emittenti rispetto all'esposizione a un solo Stato?</li>
<li>Qual è l'orizzonte temporale, e quanto può pesare il rischio di tasso nel periodo?</li>
</ul>
`,

  "probabilita-default-rating": `
<h2 id="esempio-portafoglio">Un esempio su un portafoglio</h2>
<p>Immaginiamo dieci obbligazioni BBB di emittenti diversi, tutte con scadenza a cinque anni. Con un tasso di default cumulato medio dell'1,40% a cinque anni, il numero di default atteso nel gruppo è circa 0,14: in media, meno di un default ogni settanta obbligazioni di questo tipo. Rassicurante, ma la media non dice nulla sulla fortuna o sulla sfortuna di un singolo portafoglio. E i default hanno la cattiva abitudine di presentarsi in comitiva, negli stessi periodi di crisi economica.</p>
<p>Quando un'obbligazione va in default, la perdita dipende da quanto si riesce a recuperare: con un recupero del 40%, perdere un titolo su dieci costerebbe circa il 6% del portafoglio, prima di contare le cedole già incassate.</p>
`,
};
