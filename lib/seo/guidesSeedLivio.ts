import type { SeedGuide } from "./guidesSeed";

// Articles Livio wrote himself for the Knowledge Center. They are his own text, approved by him, so they go in
// published. Kept word for word; only turned into HTML. The default-rate page was built on the S&P table he sent
// (19 Oct 2026), with our Risk 1-10 column added; since 20 Oct 2026 it shows the combined table of lib/seo/defaultRates.ts.

export const SEED_GUIDES_LIVIO: SeedGuide[] = [
  {
    locale: "it", topic: "compare", group: "compare-bonds-2026", status: "published",
    slug: "obbligazioni-2026-come-confrontare",
    title: "Obbligazioni 2026: come confrontare rendimenti, rating e scadenze",
    seoTitle: "Migliori obbligazioni 2026: rendimenti, rating e scadenze",
    metaDescription: "Come confrontare le obbligazioni nel 2026: rendimento effettivo a scadenza, rating, durata e duration, BTP e corporate, liquidità, costi e fiscalità.",
    primaryKeyword: "migliori obbligazioni 2026",
    relatedKeywords: ["confrontare obbligazioni", "rendimento a scadenza", "rating obbligazioni", "btp o obbligazioni corporate"],
    relatedSlugs: ["rendimento-a-scadenza", "duration-obbligazioni", "btp-o-obbligazioni-corporate", "rischio-di-credito-obbligazioni"],
    bodyHtml: `<p><strong>Aggiornato: 19 ottobre 2026</strong></p>
<p>Chi cerca le migliori obbligazioni nel 2026 si trova davanti a un mercato articolato: titoli di Stato italiani ed europei, obbligazioni societarie, emissioni a breve termine e strumenti con scadenze superiori a dieci anni.</p>
<p>Ma come confrontare obbligazioni diverse in modo oggettivo?</p>
<p>Il punto di partenza è considerare contemporaneamente <strong>rendimento effettivo a scadenza, rischio di credito, durata e prezzo di acquisto</strong>. Un rendimento più elevato, da solo, non indica necessariamente condizioni più vantaggiose.</p>
<h2 id="rendimento-effettivo">1. Il rendimento effettivo a scadenza: il primo indicatore</h2>
<p>Il rendimento effettivo a scadenza, o Yield to Maturity (YTM), rappresenta il tasso che rende equivalente il prezzo di acquisto al valore attuale dei flussi finanziari futuri previsti dal titolo.</p>
<p>A differenza della cedola nominale, il rendimento a scadenza considera anche l'effetto del prezzo pagato e del rimborso finale.</p>
<p>Per esempio, un'obbligazione con cedola annua del 3% acquistata sotto la pari può offrire un rendimento effettivo superiore al 3%.</p>
<p>Viceversa, acquistando la stessa obbligazione sopra la pari, il rendimento effettivo può risultare inferiore alla cedola.</p>
<p>Il rendimento calcolato presuppone il pagamento dei flussi contrattuali e il mantenimento del titolo fino alla scadenza. Non costituisce un rendimento garantito.</p>
<h2 id="rating">2. Rating obbligazionario: come interpretare il rischio</h2>
<p>Le agenzie di rating classificano la qualità creditizia degli emittenti.</p>
<p>In generale, le obbligazioni sono suddivise in due grandi categorie:</p>
<table><thead><tr><th scope="col">Categoria</th><th scope="col">Rating S&amp;P indicativo</th><th scope="col">Caratteristiche</th></tr></thead><tbody>
<tr><td>Investment grade</td><td>Da AAA a BBB−</td><td>Qualità creditizia relativamente più elevata</td></tr>
<tr><td>Speculative grade</td><td>Da BB+ a D</td><td>Rischio di credito generalmente maggiore</td></tr>
</tbody></table>
<p>Il rating fornisce una valutazione del merito creditizio, ma non elimina il rischio di insolvenza.</p>
<p>Anche due obbligazioni con rating identico possono presentare differenze importanti in termini di rendimento, liquidità, subordinazione e scadenza.</p>
<h2 id="durata">3. Quale durata confrontare: 3, 5, 7 o 10 anni?</h2>
<p>La durata residua è un parametro essenziale.</p>
<p>Le obbligazioni con scadenza più lontana tendono, a parità delle altre condizioni, ad avere una sensibilità maggiore alle variazioni dei tassi d'interesse.</p>
<p>Questa sensibilità viene misurata attraverso la duration.</p>
<p>È importante distinguere:</p>
<ul><li><strong>Scadenza residua:</strong> il tempo che manca al rimborso contrattuale.</li><li><strong>Duration:</strong> una misura della sensibilità del prezzo alle variazioni dei rendimenti di mercato.</li></ul>
<p>Un'obbligazione con scadenza residua di dieci anni non presenta necessariamente una duration di dieci anni.</p>
<p>Per confrontare titoli diversi, è quindi utile esaminare sia la scadenza sia la duration.</p>
<h2 id="btp-corporate">4. BTP e obbligazioni corporate: quali differenze?</h2>
<p>I BTP sono titoli di debito emessi dallo Stato italiano.</p>
<p>Le obbligazioni corporate sono emesse da società e possono appartenere a settori differenti, come industria, telecomunicazioni, energia o servizi finanziari.</p>
<table><thead><tr><th scope="col">Caratteristica</th><th scope="col">BTP</th><th scope="col">Obbligazioni corporate</th></tr></thead><tbody>
<tr><td>Emittente</td><td>Stato italiano</td><td>Società</td></tr>
<tr><td>Rischio di credito</td><td>Collegato allo Stato italiano</td><td>Collegato all'emittente e alla struttura del titolo</td></tr>
<tr><td>Cedole</td><td>Dipendono dalla tipologia di BTP</td><td>Dipendono dalle condizioni di emissione</td></tr>
<tr><td>Tassazione italiana ordinaria</td><td>Generalmente 12,5% sui redditi rilevanti</td><td>Generalmente 26%, salvo eccezioni</td></tr>
<tr><td>Liquidità</td><td>Varia per emissione</td><td>Varia per emissione</td></tr>
</tbody></table>
<p>Il rendimento più elevato di un'obbligazione corporate può riflettere un rischio di credito maggiore, una liquidità inferiore o altre caratteristiche contrattuali.</p>
<h2 id="cinque-elementi">5. Cinque elementi da verificare prima di confrontare due obbligazioni</h2>
<p>Una comparazione dovrebbe includere:</p>
<ol><li><strong>Rendimento a scadenza:</strong> quanto remunera il prezzo di mercato, secondo le ipotesi del calcolo.</li><li><strong>Rating e rischio di credito:</strong> qual è la qualità creditizia dell'emittente.</li><li><strong>Scadenza e duration:</strong> quanto dura l'investimento e come può reagire il prezzo ai tassi.</li><li><strong>Liquidità:</strong> quanto può essere facile vendere il titolo prima della scadenza.</li><li><strong>Costi e fiscalità:</strong> quale può essere l'impatto sul rendimento effettivamente ottenuto.</li></ol>
<h2 id="confronto-semplice">6. Come confrontare le obbligazioni in modo più semplice</h2>
<p>Anziché consultare individualmente decine di strumenti, una piattaforma di confronto può organizzare le informazioni utilizzando criteri omogenei.</p>
<p>Attraverso il nostro strumento puoi selezionare due parametri:</p>
<ul><li>Livello di rischio.</li><li>Durata desiderata.</li></ul>
<p>Il sistema restituisce una selezione comparativa di dieci obbligazioni, con informazioni su rendimenti, rating e scadenze secondo una metodologia documentata.</p>
<p><a class="cta" href="/it">Confronta le obbligazioni</a></p>
<h2 id="domande-frequenti">Domande frequenti</h2>
<h3>Le obbligazioni con rendimento più alto sono anche le più convenienti?</h3>
<p>Non necessariamente. Rendimenti elevati possono riflettere rischi di credito, liquidità o struttura maggiori.</p>
<h3>È possibile perdere denaro con un'obbligazione investment grade?</h3>
<p>Sì. Il rating non garantisce il rimborso e il prezzo di mercato può diminuire.</p>
<h3>Cosa succede se vendo prima della scadenza?</h3>
<p>Il prezzo di vendita dipende dalle condizioni di mercato in quel momento. L'investitore può realizzare una plusvalenza o una minusvalenza.</p>
<h3>Yield to Maturity e cedola sono la stessa cosa?</h3>
<p>No. La cedola è il pagamento periodico contrattuale; il rendimento a scadenza considera anche il prezzo di acquisto e i flussi previsti fino al rimborso.</p>
<hr>
<p><strong>Fonti:</strong> <a href="https://www.borsaitaliana.it/notizie/sotto-la-lente/btp.htm">Borsa Italiana — Guida ai BTP</a>; <a href="https://www.consob.it/ProspettiPortlet/DownloadProspetto?EmitID=217319">CONSOB — Documentazione sui rendimenti obbligazionari</a>.</p>
<p><em>Le informazioni hanno finalità esclusivamente informative ed educative. Non costituiscono una raccomandazione di investimento personalizzata. I rendimenti e i rating possono variare nel tempo.</em></p>`,
  },
  {
    locale: "it", topic: "credit", group: "default-rates", status: "published",
    slug: "probabilita-default-rating",
    title: "Qual è la probabilità storica di default di un rating BBB?",
    seoTitle: "Probabilità di default per rating: BBB, A, BB e altri",
    metaDescription: "Probabilità storica di default per rating, da AAA a CCC: un BBB è andato in default nell'1,40% dei casi a 5 anni e nel 3,40% a 10 anni (medie di lungo periodo).",
    primaryKeyword: "probabilità default rating bbb",
    relatedKeywords: ["probabilità di default rating", "tassi di default per rating", "default obbligazioni bbb"],
    relatedSlugs: ["rischio-di-credito-obbligazioni", "obbligazioni-investment-grade", "obbligazioni-alto-rendimento"],
    bodyHtml: `<p><strong>Risposta breve:</strong> in base agli studi storici pubblici sui default, un emittente con rating BBB è andato in default nello 0,15% dei casi entro 1 anno, nell'1,40% entro 5 anni e nel 3,40% entro 10 anni. Su 100 emittenti BBB, in media meno di 4 sono andati in default in dieci anni.</p>
<p>La tabella mostra i tassi di default cumulati medi per ogni gradino di rating, da 1 a 15 anni. Un tasso cumulato indica la quota di emittenti con quel rating all'inizio del periodo che è andata in default entro la fine del periodo.</p>
<h2 id="tabella">Tassi di default cumulati per rating (%)</h2>
<table><thead><tr><th scope="col">Rating</th><th scope="col">Rischio 10BONDS</th><th scope="col">1 anno</th><th scope="col">3 anni</th><th scope="col">5 anni</th><th scope="col">7 anni</th><th scope="col">10 anni</th><th scope="col">15 anni</th></tr></thead><tbody>
<tr><td>AAA</td><td>1</td><td>0,00%</td><td>0,01%</td><td>0,07%</td><td>0,17%</td><td>0,31%</td><td>0,51%</td></tr>
<tr><td>AA+</td><td>2</td><td>0,00%</td><td>0,04%</td><td>0,14%</td><td>0,26%</td><td>0,46%</td><td>0,69%</td></tr>
<tr><td>AA</td><td>2</td><td>0,01%</td><td>0,07%</td><td>0,20%</td><td>0,36%</td><td>0,60%</td><td>0,97%</td></tr>
<tr><td>AA−</td><td>2</td><td>0,03%</td><td>0,12%</td><td>0,30%</td><td>0,49%</td><td>0,78%</td><td>1,20%</td></tr>
<tr><td>A+</td><td>3</td><td>0,04%</td><td>0,17%</td><td>0,38%</td><td>0,62%</td><td>1,10%</td><td>1,80%</td></tr>
<tr><td>A</td><td>3</td><td>0,05%</td><td>0,21%</td><td>0,48%</td><td>0,80%</td><td>1,40%</td><td>2,20%</td></tr>
<tr><td>A−</td><td>3</td><td>0,07%</td><td>0,28%</td><td>0,59%</td><td>0,98%</td><td>1,70%</td><td>2,60%</td></tr>
<tr><td>BBB+</td><td>4</td><td>0,10%</td><td>0,44%</td><td>0,93%</td><td>1,50%</td><td>2,40%</td><td>3,90%</td></tr>
<tr><td>BBB</td><td>5</td><td>0,15%</td><td>0,65%</td><td>1,40%</td><td>2,10%</td><td>3,40%</td><td>5,30%</td></tr>
<tr><td>BBB−</td><td>6</td><td>0,26%</td><td>1,10%</td><td>2,40%</td><td>3,70%</td><td>5,50%</td><td>8,00%</td></tr>
<tr><td>BB+</td><td>7</td><td>0,41%</td><td>1,80%</td><td>3,60%</td><td>5,40%</td><td>7,90%</td><td>11,20%</td></tr>
<tr><td>BB</td><td>7</td><td>0,63%</td><td>2,70%</td><td>5,20%</td><td>7,60%</td><td>10,80%</td><td>14,80%</td></tr>
<tr><td>BB−</td><td>7</td><td>1,00%</td><td>4,30%</td><td>8,00%</td><td>11,20%</td><td>15,20%</td><td>20,10%</td></tr>
<tr><td>B+</td><td>8</td><td>1,60%</td><td>6,00%</td><td>10,30%</td><td>14,00%</td><td>18,40%</td><td>23,80%</td></tr>
<tr><td>B</td><td>8</td><td>2,60%</td><td>8,80%</td><td>14,00%</td><td>18,20%</td><td>23,10%</td><td>28,50%</td></tr>
<tr><td>B−</td><td>8</td><td>4,60%</td><td>13,20%</td><td>19,70%</td><td>24,50%</td><td>29,90%</td><td>35,40%</td></tr>
<tr><td>CCC+</td><td>9</td><td>12,00%</td><td>24,50%</td><td>32,30%</td><td>37,40%</td><td>42,60%</td><td>47,50%</td></tr>
<tr><td>CCC / C</td><td>9–10</td><td>24,50%</td><td>38,90%</td><td>45,60%</td><td>49,80%</td><td>54,10%</td><td>58,00%</td></tr>
</tbody></table>
<p><em>Fonte: elaborazione 10BONDS basata su studi storici pubblici sui default: tassi di default cumulati medi delle società per gradino di rating (medie storiche di lungo periodo, combinate e arrotondate). La colonna "Rischio 10BONDS" indica a quale punteggio di rischio da 1 a 10 corrisponde ogni rating nel nostro strumento.</em></p>
<h2 id="come-leggere">Come leggere la tabella</h2>
<p>Più il rating scende, più la probabilità di default cresce, e non in modo lineare: a 5 anni passa dall'1,40% di BBB al 2,40% di BBB−, ma salta al 5,20% di BB, il primo gradino speculative grade pieno. Il confine tra investment grade (fino a BBB−) e speculative grade (da BB+ in giù) è il punto in cui il rischio cambia passo.</p>
<p>La durata conta quanto il rating. Una probabilità a 1 anno non si confronta con una a 10 anni: per un'obbligazione BBB con scadenza tra 5 anni il dato da guardare è la colonna dei 5 anni.</p>
<h2 id="limiti">Cosa la tabella non dice</h2>
<ul><li>Sono medie del passato su molti emittenti e molti cicli economici: non sono una previsione per un singolo emittente.</li><li>Il default non significa perdere tutto: quanto si recupera dipende dalla seniority e dalle garanzie dell'obbligazione.</li><li>I dati riguardano le società; i titoli di Stato hanno una storia di default diversa.</li></ul>
<p>Per capire come rating, probabilità di default e perdita attesa si combinano, leggi la guida al <a href="/it/guide/rischio-di-credito-obbligazioni">rischio di credito delle obbligazioni</a> e quella sulle <a href="/it/guide/obbligazioni-investment-grade">obbligazioni investment grade</a>.</p>
<p><a class="cta" href="/it">Confronta obbligazioni per rischio, rendimento e durata</a></p>`,
  },
];
