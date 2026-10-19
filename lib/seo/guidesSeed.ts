// First Italian guides. They are added once in "review" status: Livio reads, edits and publishes them from
// Admin -> SEO. No author credentials are claimed: until a real profile is assigned they show "Redazione 10BONDS".

import type { Topic } from "./comparisons";
import type { Locale } from "./locales";
import { SEED_GUIDES_DE } from "./guidesSeedDe";
import { SEED_GUIDES_FR } from "./guidesSeedFr";
import { SEED_GUIDES_LIVIO } from "./guidesSeedLivio";
import { landingFor } from "./landingLivio";
import { SEED_GUIDES_WAVE } from "./guidesSeedWave";
import { SEED_GUIDES_FR2 } from "./guidesSeedFr2";
import { SEED_GUIDES_DE2 } from "./guidesSeedDe2";

export type SeedGuide = {
  locale: Locale;
  topic: Topic; // shared by the language versions of the same guide
  slug: string;
  title: string;
  seoTitle: string;
  metaDescription: string;
  primaryKeyword: string;
  relatedKeywords: string[];
  relatedSlugs: string[];
  bodyHtml: string;
  group?: string; // translation group when it differs from the topic
  status?: "draft" | "published"; // outline drafts, or Livio's own approved articles; default "review"
};

const cta = (text: string) => `<p><strong>Prova subito:</strong> <a href="/it">${text}</a>. Due cursori, dieci obbligazioni, nessun impegno.</p>`;

const SEED_GUIDES_IT: SeedGuide[] = [
  {
    locale: "it",
    topic: "ytm",
    slug: "rendimento-a-scadenza",
    title: "Come calcolare il rendimento a scadenza di un'obbligazione",
    seoTitle: "Come calcolare il rendimento a scadenza (YTM)",
    metaDescription: "Cos'è il rendimento a scadenza (YTM) di un'obbligazione, come si calcola con un esempio passo per passo e quali ipotesi nasconde.",
    primaryKeyword: "come calcolare rendimento a scadenza",
    relatedKeywords: ["rendimento a scadenza", "YTM obbligazioni", "rendimento obbligazioni"],
    relatedSlugs: ["duration-obbligazioni", "rischio-di-credito-obbligazioni"],
    bodyHtml: `
<p>Il <strong>rendimento a scadenza</strong> (in inglese <em>yield to maturity</em>, YTM) è il numero più usato per confrontare le obbligazioni. Indica il guadagno annuo che otterresti comprando oggi un'obbligazione al suo prezzo di mercato e tenendola fino alla scadenza, a condizione che l'emittente paghi tutte le cedole e rimborsi il capitale.</p>
<h2 id="cedola-e-rendimento">Cedola e rendimento non sono la stessa cosa</h2>
<p>La <strong>cedola</strong> è l'interesse fisso stabilito all'emissione, calcolato sul valore nominale (di solito 100). Il <strong>prezzo</strong> invece cambia ogni giorno. Se compri sotto 100 guadagni anche la differenza fino al rimborso; se compri sopra 100 quella differenza è una perdita. Il rendimento a scadenza mette insieme le due cose: cedole e differenza tra prezzo pagato e rimborso.</p>
<p>Per questo due obbligazioni con la stessa cedola del 3% possono avere rendimenti a scadenza molto diversi: dipende da quanto costano oggi e da quanto manca alla scadenza.</p>
<h2 id="formula">La formula</h2>
<p>Il rendimento a scadenza è il tasso <em>y</em> che rende il prezzo di oggi uguale al valore attuale di tutti i flussi futuri:</p>
<p><code>Prezzo = C/(1+y) + C/(1+y)² + … + (C+100)/(1+y)ⁿ</code></p>
<p>dove <em>C</em> è la cedola annua e <em>n</em> il numero di anni alla scadenza. Non esiste una soluzione diretta: si trova per tentativi, come fanno i fogli di calcolo con la funzione <code>TIR.COST</code> o <code>REND</code>.</p>
<h2 id="esempio">Un esempio passo per passo</h2>
<p>Prendiamo un'obbligazione con cedola annua del 3%, scadenza tra 5 anni, prezzo 95.</p>
<ul>
<li>Ogni anno ricevi 3 euro di cedola per ogni 100 di nominale.</li>
<li>Alla scadenza ricevi 100, cioè 5 euro più di quanto hai pagato.</li>
<li>Il tasso che rende 95 uguale al valore attuale di questi flussi è circa <strong>4,13%</strong> annuo.</li>
</ul>
<p>Esiste anche una <strong>formula approssimata</strong>, utile per un calcolo a mente:</p>
<p><code>YTM ≈ (C + (100 − Prezzo) / n) / ((100 + Prezzo) / 2)</code></p>
<p>Con i numeri dell'esempio: (3 + 5/5) / 97,5 = 4,10%. Molto vicino al valore esatto.</p>
<h2 id="ipotesi">Le ipotesi da conoscere</h2>
<p>Il rendimento a scadenza è una stima, non una promessa. Vale solo se:</p>
<ul>
<li><strong>tieni l'obbligazione fino alla scadenza</strong>: se vendi prima, il risultato dipende dal prezzo di quel momento;</li>
<li><strong>l'emittente paga tutto</strong>: in caso di insolvenza perdi cedole e parte del capitale (vedi la guida sul <a href="/it/guide/rischio-di-credito-obbligazioni">rischio di credito</a>);</li>
<li><strong>reinvesti le cedole allo stesso tasso</strong>: nella realtà il tasso di reinvestimento cambia;</li>
<li><strong>l'obbligazione non viene rimborsata in anticipo</strong>: per le obbligazioni richiamabili conta anche il rendimento al primo richiamo.</li>
</ul>
<h2 id="lordo-netto">Rendimento lordo e netto in Italia</h2>
<p>I rendimenti mostrati su 10BONDS sono <strong>lordi</strong>. In Italia sugli interessi e sulle plusvalenze delle obbligazioni si paga di norma un'imposta sostitutiva del 26%, ridotta al 12,5% per i titoli di Stato italiani, per quelli dei Paesi che scambiano informazioni con l'Italia e per gli emittenti sovranazionali. Il rendimento netto è quindi più basso: chiedi conferma alla tua banca o al tuo consulente fiscale per la tua situazione.</p>
<h2 id="come-usarlo">Come usare il rendimento a scadenza</h2>
<p>Confronta sempre il rendimento insieme a due altri dati: la <a href="/it/guide/duration-obbligazioni">duration</a>, che misura quanto il prezzo reagisce ai tassi, e il rating, che misura il rischio dell'emittente. Un rendimento più alto quasi sempre significa più rischio.</p>
<p>Per vedere rendimenti reali di oggi, guarda ad esempio le <a href="/it/obbligazioni/rendimento-4-percento">obbligazioni con rendimento intorno al 4%</a> o quelle con <a href="/it/obbligazioni/duration-5-anni">duration di circa 5 anni</a>.</p>
${cta("scegli una duration e un rendimento obiettivo e guarda le 10 obbligazioni più vicine")}
`,
  },
  {
    locale: "it",
    topic: "duration",
    slug: "duration-obbligazioni",
    title: "Duration delle obbligazioni: cos'è e come usarla",
    seoTitle: "Duration obbligazioni: cos'è e come si usa",
    metaDescription: "La duration misura quanto il prezzo di un'obbligazione cambia quando cambiano i tassi. Differenza tra duration di Macaulay e modificata, con esempi.",
    primaryKeyword: "duration obbligazioni",
    relatedKeywords: ["duration modificata", "duration di Macaulay", "rischio tasso"],
    relatedSlugs: ["rendimento-a-scadenza", "obbligazioni-investment-grade"],
    bodyHtml: `
<p>La <strong>duration</strong> è il secondo numero, dopo il rendimento, da guardare prima di scegliere un'obbligazione. Risponde a una domanda semplice: se i tassi di interesse cambiano, di quanto cambia il prezzo della mia obbligazione?</p>
<h2 id="due-duration">Due tipi di duration</h2>
<p>La <strong>duration di Macaulay</strong> è la scadenza media dei flussi dell'obbligazione (cedole e rimborso), pesata per il loro valore attuale. Si misura in anni ed è sempre uguale o più corta della vita residua: le cedole arrivano prima del rimborso finale.</p>
<p>La <strong>duration modificata</strong> deriva dalla prima (si divide per 1 + rendimento) e misura direttamente la sensibilità del prezzo ai tassi. È quella che usa 10BONDS e che trovi nei nostri cursori.</p>
<h2 id="regola">La regola pratica</h2>
<p>Con una duration modificata di <em>D</em> anni, se i rendimenti di mercato salgono di un punto percentuale il prezzo scende circa del <em>D</em>%. Se scendono di un punto, il prezzo sale circa del <em>D</em>%.</p>
<ul>
<li>Duration 2: un rialzo dei tassi dell'1% costa circa il 2% del prezzo.</li>
<li>Duration 5: circa il 5%.</li>
<li>Duration 10: circa il 10%.</li>
</ul>
<p>Esempio: un'obbligazione al 3% con scadenza a 5 anni e rendimento del 4,13% ha una duration di Macaulay di circa 4,7 anni e una duration modificata di circa 4,5. La regola vale bene per piccole variazioni; per variazioni ampie entra in gioco la <strong>convessità</strong>, che rende i rialzi di prezzo un po' più ampi dei ribassi.</p>
<h2 id="cosa-influenza">Cosa allunga o accorcia la duration</h2>
<ul>
<li><strong>Scadenza</strong>: più è lontana, più la duration è lunga.</li>
<li><strong>Cedola</strong>: cedole alte restituiscono più denaro prima, quindi accorciano la duration. Uno zero coupon ha duration di Macaulay uguale alla sua vita residua.</li>
<li><strong>Livello dei rendimenti</strong>: rendimenti più alti accorciano un poco la duration.</li>
</ul>
<h2 id="orizzonte">Duration e orizzonte di investimento</h2>
<p>Se sai già quando ti serviranno i soldi, scegliere una duration vicina a quell'orizzonte limita il rischio: se i tassi salgono, il prezzo scende ma reinvesti le cedole a tassi più alti, e i due effetti tendono a compensarsi. Se l'orizzonte è breve e la duration lunga, una salita dei tassi può costringerti a vendere in perdita.</p>
<p>Puoi confrontare le obbligazioni per fascia di duration: <a href="/it/obbligazioni/duration-2-anni">circa 2 anni</a>, <a href="/it/obbligazioni/duration-5-anni">circa 5 anni</a>, <a href="/it/obbligazioni/duration-10-anni">circa 10 anni</a>.</p>
<h2 id="limiti">Cosa la duration non misura</h2>
<p>La duration misura solo il <strong>rischio tasso</strong>. Non dice nulla sulla solidità dell'emittente: per quello servono il rating e lo spread, spiegati nella guida sul <a href="/it/guide/rischio-di-credito-obbligazioni">rischio di credito</a>. E non funziona bene per obbligazioni a tasso variabile o richiamabili, che reagiscono ai tassi in modo diverso.</p>
${cta("imposta la duration che ti serve e il rendimento che cerchi")}
`,
  },
  {
    locale: "it",
    topic: "ig",
    slug: "obbligazioni-investment-grade",
    title: "Obbligazioni investment grade: cosa sono e quanto rendono",
    seoTitle: "Obbligazioni investment grade: cosa sono",
    metaDescription: "Cosa significa investment grade, come leggere i rating di S&P, Moody's e Fitch e cosa cambia tra BBB- e BB+ per chi investe in obbligazioni.",
    primaryKeyword: "obbligazioni investment grade",
    relatedKeywords: ["rating obbligazioni", "BBB-", "obbligazioni sicure"],
    relatedSlugs: ["rischio-di-credito-obbligazioni", "obbligazioni-alto-rendimento"],
    bodyHtml: `
<p>Le obbligazioni <strong>investment grade</strong> sono quelle che le agenzie di rating giudicano a basso rischio di insolvenza. È il confine più importante del mercato obbligazionario: molti fondi e investitori istituzionali possono comprare solo obbligazioni sopra questa soglia.</p>
<h2 id="scala">La scala dei rating</h2>
<p>Le tre agenzie principali usano scale simili. Sono investment grade:</p>
<table>
<thead><tr><th scope="col">S&amp;P e Fitch</th><th scope="col">Moody's</th><th scope="col">Giudizio</th></tr></thead>
<tbody>
<tr><td>AAA</td><td>Aaa</td><td>Massima qualità</td></tr>
<tr><td>AA+, AA, AA-</td><td>Aa1, Aa2, Aa3</td><td>Qualità molto alta</td></tr>
<tr><td>A+, A, A-</td><td>A1, A2, A3</td><td>Qualità alta</td></tr>
<tr><td>BBB+, BBB, BBB-</td><td>Baa1, Baa2, Baa3</td><td>Qualità adeguata</td></tr>
</tbody>
</table>
<p>Da BB+ (Ba1 per Moody's) in giù si parla di <a href="/it/guide/obbligazioni-alto-rendimento">alto rendimento</a> o high yield, detto anche "speculativo".</p>
<h2 id="cosa-dice">Cosa dice davvero un rating</h2>
<p>Il rating è un'opinione dell'agenzia sulla capacità dell'emittente di pagare cedole e capitale. Non è una garanzia e non è un consiglio di acquisto. Storicamente le insolvenze tra gli emittenti investment grade sono state molto più rare che tra quelli high yield, ma non impossibili. I rating possono anche cambiare: un emittente può essere declassato mentre hai l'obbligazione in portafoglio.</p>
<h2 id="soglia">Perché la soglia BBB- conta tanto</h2>
<p>Quando un emittente scende da BBB- a BB+ diventa un <strong>fallen angel</strong>. Molti investitori sono obbligati a vendere, e il prezzo può scendere più di quanto giustificherebbe il solo peggioramento del credito. Per questo le obbligazioni BBB- tendono a rendere un po' di più delle A: il mercato prezza il rischio di superare la soglia.</p>
<h2 id="rendimento">Quanto rendono</h2>
<p>Il rendimento di un'obbligazione investment grade dipende dai tassi di mercato, dalla <a href="/it/guide/duration-obbligazioni">duration</a> e dal rating. Di solito, a parità di duration, più il rating scende più il rendimento sale. Puoi vedere i valori di oggi nella pagina delle <a href="/it/obbligazioni/investment-grade">obbligazioni investment grade in euro</a>, aggiornata ogni giorno.</p>
<h2 id="agenzie-diverse">Quando le agenzie non sono d'accordo</h2>
<p>Capita che un'obbligazione sia BBB- per un'agenzia e BB+ per un'altra. Su 10BONDS usiamo il rating risolto fornito con i dati quando disponibile, altrimenti quello di S&amp;P, poi Moody's, poi Fitch. Le obbligazioni senza rating non compaiono nei nostri elenchi. Il dettaglio è nella pagina sulla <a href="/it/metodologia">metodologia</a>.</p>
${cta("scegli il rating minimo con il terzo cursore e guarda le 10 obbligazioni")}
`,
  },
  {
    locale: "it",
    topic: "credit",
    slug: "rischio-di-credito-obbligazioni",
    title: "Rischio di credito delle obbligazioni: come valutarlo",
    seoTitle: "Rischio di credito obbligazioni: come valutarlo",
    metaDescription: "Il rischio di credito è la possibilità che l'emittente non paghi. Come leggerlo con rating, spread, seniority e diversificazione.",
    primaryKeyword: "rischio credito obbligazioni",
    relatedKeywords: ["rischio emittente", "spread obbligazioni", "default obbligazioni"],
    relatedSlugs: ["obbligazioni-investment-grade", "obbligazioni-alto-rendimento"],
    bodyHtml: `
<p>Chi compra un'obbligazione presta denaro all'emittente. Il <strong>rischio di credito</strong> è la possibilità che l'emittente non paghi le cedole o non rimborsi il capitale, del tutto o in parte. È il rischio principale delle obbligazioni societarie, e il motivo per cui alcune rendono molto più di altre.</p>
<h2 id="rating">Il primo indicatore: il rating</h2>
<p>Le agenzie di rating riassumono il rischio di credito in una lettera, da AAA a D. La divisione più importante è tra <a href="/it/guide/obbligazioni-investment-grade">investment grade</a> (fino a BBB-) e <a href="/it/guide/obbligazioni-alto-rendimento">alto rendimento</a> (da BB+ in giù). Il rating è utile ma arriva spesso in ritardo rispetto ai fatti: va usato come punto di partenza.</p>
<h2 id="spread">Il secondo indicatore: lo spread</h2>
<p>Lo <strong>spread</strong> è la differenza tra il rendimento dell'obbligazione e quello di un titolo considerato quasi privo di rischio con la stessa durata, ad esempio un titolo di Stato tedesco. Uno spread ampio significa che il mercato chiede più compenso per il rischio di quell'emittente. Se lo spread di un emittente sale molto più di quello dei concorrenti con lo stesso rating, il mercato sta segnalando un problema.</p>
<h2 id="perdita">Quanto si perde in caso di insolvenza</h2>
<p>Un'insolvenza non significa per forza perdere tutto. Quanto si recupera dipende da:</p>
<ul>
<li><strong>grado di subordinazione</strong>: le obbligazioni <em>senior</em> vengono rimborsate prima delle <em>subordinate</em>; queste ultime rendono di più proprio perché recuperano meno;</li>
<li><strong>garanzie</strong>: le obbligazioni garantite da attivi specifici (ad esempio i covered bond) recuperano di più;</li>
<li><strong>settore e attivi dell'emittente</strong>.</li>
</ul>
<p>Per le banche dell'Unione europea vale anche il <strong>bail-in</strong>: in caso di crisi, le autorità possono imporre perdite agli obbligazionisti, a partire dai titoli subordinati.</p>
<h2 id="diversificare">Il rimedio più semplice: diversificare</h2>
<p>Il rischio di un singolo emittente si riduce distribuendo il capitale su più emittenti, settori e Paesi. Per questo le liste di 10BONDS includono <strong>un solo titolo per emittente</strong>: dieci obbligazioni sono dieci emittenti diversi.</p>
<h2 id="rendimento-rischio">Rendimento e rischio vanno insieme</h2>
<p>A parità di <a href="/it/guide/duration-obbligazioni">duration</a>, un rendimento più alto è quasi sempre il prezzo di un rischio di credito più alto. Quando un'obbligazione rende molto più delle altre con lo stesso rating, chiediti perché. Confronta ad esempio le <a href="/it/obbligazioni/investment-grade">obbligazioni investment grade</a> con quelle ad <a href="/it/obbligazioni/alto-rendimento">alto rendimento</a>.</p>
${cta("usa il cursore del rating per scegliere quanto rischio di credito accetti")}
`,
  },
  {
    locale: "it",
    topic: "hy",
    slug: "obbligazioni-alto-rendimento",
    title: "Obbligazioni ad alto rendimento: rischi e opportunità",
    seoTitle: "Obbligazioni alto rendimento: rischi e opportunità",
    metaDescription: "Cosa sono le obbligazioni ad alto rendimento (high yield), perché pagano di più, quali rischi comportano e come confrontarle.",
    primaryKeyword: "obbligazioni alto rendimento",
    relatedKeywords: ["obbligazioni high yield", "obbligazioni ad alto rendimento euro", "junk bond"],
    relatedSlugs: ["rischio-di-credito-obbligazioni", "obbligazioni-investment-grade"],
    bodyHtml: `
<p>Le obbligazioni <strong>ad alto rendimento</strong>, o <em>high yield</em>, sono emesse da società con rating inferiore a BBB- (Baa3 per Moody's). Pagano cedole e rendimenti più alti perché chi investe si assume un rischio maggiore che l'emittente non riesca a pagare.</p>
<h2 id="perche-rendono">Perché rendono di più</h2>
<p>Il rendimento extra rispetto ai titoli di Stato, lo <strong>spread</strong>, compensa tre cose: la probabilità di insolvenza, la perdita attesa in caso di insolvenza e la minore facilità di vendere il titolo. Quando l'economia rallenta gli spread high yield si allargano rapidamente e i prezzi scendono: queste obbligazioni si comportano in parte come le azioni.</p>
<h2 id="rischi">I rischi principali</h2>
<ul>
<li><strong>Insolvenza</strong>: è il rischio maggiore. Una sola insolvenza può cancellare anni di cedole se il portafoglio è poco diversificato.</li>
<li><strong>Liquidità</strong>: molte emissioni sono piccole e trattate poco; la differenza tra prezzo di acquisto e di vendita può essere ampia.</li>
<li><strong>Rimborso anticipato</strong>: molte obbligazioni high yield sono richiamabili; se i tassi scendono l'emittente può rimborsarle e il rendimento atteso non si realizza.</li>
<li><strong>Declassamento</strong>: un ulteriore taglio del rating fa scendere il prezzo.</li>
</ul>
<h2 id="bb-e-b">Non tutto l'high yield è uguale</h2>
<p>La fascia BB è la più vicina all'investment grade e storicamente ha avuto insolvenze molto meno frequenti delle fasce B e CCC. Su 10BONDS il rating più basso che puoi selezionare è BB: le fasce più speculative e le obbligazioni senza rating non compaiono mai.</p>
<h2 id="come-confrontare">Come confrontarle</h2>
<p>Prima del rendimento guarda il rating, la <a href="/it/guide/duration-obbligazioni">duration</a> e il grado di subordinazione. Confronta lo spread con quello di emittenti simili: se un'obbligazione rende molto più delle altre con lo stesso rating, il mercato vede un rischio specifico. La guida sul <a href="/it/guide/rischio-di-credito-obbligazioni">rischio di credito</a> spiega come leggerlo.</p>
<p>La pagina delle <a href="/it/obbligazioni/alto-rendimento">obbligazioni ad alto rendimento in euro</a> mostra ogni giorno i rendimenti più alti, un titolo per emittente. Per un confronto con titoli più solidi guarda quelle con <a href="/it/obbligazioni/rendimento-5-percento">rendimento intorno al 5%</a>.</p>
<h2 id="peso">Quanto peso dare all'high yield</h2>
<p>Dipende dalla tua situazione, dai tuoi obiettivi e da quanto rischio puoi sopportare: è una scelta da fare con un consulente abilitato. In generale vale una regola: più è alto il rendimento cercato, più è importante diversificare tra molti emittenti.</p>
${cta("sposta il cursore del rating fino a BB e confronta i rendimenti")}
`,
  },
  {
    locale: "it",
    topic: "gov",
    slug: "btp",
    title: "BTP: cosa sono, come funzionano e come confrontarli",
    seoTitle: "BTP: cosa sono e come confrontarne i rendimenti",
    metaDescription: "BTP, BTP Italia e BTP Valore spiegati: cedole, tassazione al 12,5%, rischio e come confrontare il rendimento con le obbligazioni corporate.",
    primaryKeyword: "btp",
    relatedKeywords: ["btp rendimento", "btp italia", "btp valore", "titoli di stato italiani"],
    relatedSlugs: ["btp-o-obbligazioni-corporate", "rendimento-a-scadenza"],
    bodyHtml: `
<p>I <strong>BTP</strong>, Buoni del Tesoro Poliennali, sono i titoli con cui lo Stato italiano si finanzia a medio e lungo termine. Sono il punto di riferimento di molti risparmiatori italiani e anche del mercato: il famoso <em>spread</em> è la differenza tra il rendimento del BTP a 10 anni e quello del Bund tedesco con la stessa scadenza.</p>
<h2 id="come-funzionano">Come funziona un BTP</h2>
<p>Un BTP classico paga una <strong>cedola fissa ogni sei mesi</strong> e restituisce il valore nominale alla scadenza, che va di solito da 3 a 30 anni. Si compra all'emissione, tramite le aste del Ministero dell'Economia e delle Finanze, oppure in qualsiasi momento sul mercato secondario (MOT di Borsa Italiana) tramite la propria banca o un broker. Sul mercato il prezzo cambia ogni giorno: per questo il <a href="/it/guide/rendimento-a-scadenza">rendimento a scadenza</a> è diverso dalla cedola.</p>
<h2 id="famiglia">La famiglia dei titoli di Stato italiani</h2>
<ul>
<li><strong>BOT</strong>: durata fino a un anno, senza cedola; il guadagno è la differenza tra prezzo di acquisto e rimborso.</li>
<li><strong>CTZ</strong>: titoli zero coupon a breve termine.</li>
<li><strong>CCT</strong>: cedola variabile legata ai tassi di mercato a breve.</li>
<li><strong>BTP Italia</strong>: indicizzato all'inflazione italiana (indice FOI senza tabacchi), pensato per i risparmiatori, con un premio fedeltà nelle emissioni che lo prevedono.</li>
<li><strong>BTP Valore</strong>: riservato ai risparmiatori individuali nel periodo di collocamento, con cedole che crescono nel tempo e un premio finale per chi lo tiene fino alla scadenza.</li>
</ul>
<p>Le condizioni di BTP Italia e BTP Valore cambiano da un'emissione all'altra: leggi sempre la scheda ufficiale sul sito del Dipartimento del Tesoro prima di sottoscrivere. Nelle nostre tabelle compaiono solo titoli a cedola fissa che possiamo confrontare in modo omogeneo.</p>
<h2 id="tassazione">Tassazione e altri vantaggi</h2>
<p>Gli interessi e le plusvalenze dei titoli di Stato italiani sono tassati al <strong>12,5%</strong>, contro il 26% delle obbligazioni societarie. I titoli di Stato sono inoltre esenti dall'imposta di successione e, entro i limiti previsti dalla legge, esclusi dal calcolo dell'ISEE. A parità di rendimento lordo, un BTP rende quindi di più al netto di un'obbligazione corporate: tienine conto nei confronti.</p>
<h2 id="rischi">I rischi di un BTP</h2>
<p>Il primo è il <strong>rischio tasso</strong>: se i tassi salgono, il prezzo dei BTP già emessi scende, e scende di più per le scadenze lunghe (vedi la guida sulla <a href="/it/guide/duration-obbligazioni">duration</a>). Il secondo è il <strong>rischio di credito</strong>: l'Italia ha un rating nella fascia BBB, cioè investment grade ma non tra i più alti dell'area euro. Per questo i BTP rendono più dei Bund tedeschi e delle OAT francesi. Chi vende prima della scadenza può incassare meno di quanto ha pagato.</p>
<h2 id="confronto">Come confrontare i BTP</h2>
<p>Guarda la curva dei rendimenti per scadenza nella pagina dei <a href="/it/obbligazioni/btp">BTP di oggi</a> e confrontala con quella dei <a href="/it/obbligazioni/bund-tedeschi">Bund tedeschi</a>: la differenza, scadenza per scadenza, è lo spread. Se stai valutando anche le aziende, la guida <a href="/it/guide/btp-o-obbligazioni-corporate">BTP o obbligazioni corporate?</a> spiega cosa cambia.</p>
${cta("scegli la duration che ti serve e guarda come si posizionano i BTP tra le 10 obbligazioni")}
`,
  },
  {
    locale: "it",
    topic: "compare",
    slug: "btp-o-obbligazioni-corporate",
    title: "BTP o obbligazioni corporate? Come confrontare rendimento e rischio",
    seoTitle: "BTP o obbligazioni corporate? Il confronto",
    metaDescription: "BTP o obbligazioni societarie: come confrontare rendimento, rischio di credito, tassazione e diversificazione, con un metodo semplice.",
    primaryKeyword: "btp o obbligazioni corporate",
    relatedKeywords: ["come confrontare rendimento e rischio", "obbligazioni corporate euro", "obbligazioni societarie"],
    relatedSlugs: ["btp", "rischio-di-credito-obbligazioni"],
    bodyHtml: `
<p>Una domanda che molti risparmiatori italiani si fanno: meglio un <strong>BTP</strong> o un'<strong>obbligazione corporate</strong>, cioè emessa da un'azienda o da una banca? Non esiste una risposta valida per tutti, ma esiste un metodo per confrontarli in modo corretto.</p>
<h2 id="stesso-orizzonte">1. Confronta a parità di orizzonte</h2>
<p>Un BTP a 2 anni e un'obbligazione a 10 anni non sono confrontabili: la seconda rende di più anche solo perché è più lunga e più sensibile ai tassi. Prima di tutto scegli la <a href="/it/guide/duration-obbligazioni">duration</a> che si adatta al tuo orizzonte, poi confronta i rendimenti in quella fascia.</p>
<h2 id="netto">2. Confronta i rendimenti netti</h2>
<p>I rendimenti mostrati sono lordi. Sui BTP l'imposta è del 12,5%, sulle obbligazioni corporate del 26%. Esempio: un BTP al 3,5% lordo rende circa il 3,06% netto; un'obbligazione corporate al 4% lordo rende circa il 2,96% netto. In questo caso il BTP, pur rendendo meno al lordo, rende di più al netto.</p>
<h2 id="premio">3. Chiediti quanto premio stai ricevendo</h2>
<p>La differenza di rendimento tra un'obbligazione corporate e un BTP della stessa durata è il <strong>premio per il rischio</strong> dell'azienda. Un premio di pochi decimali per un emittente con rating più basso dell'Italia raramente è un buon affare; un premio ampio per un emittente solido merita attenzione, ma chiediti sempre perché il mercato lo chiede. La guida sul <a href="/it/guide/rischio-di-credito-obbligazioni">rischio di credito</a> spiega come leggerlo.</p>
<h2 id="rating">4. Guarda il rating, non solo il nome</h2>
<p>Alcune grandi aziende europee hanno un rating più alto dello Stato italiano: le loro obbligazioni possono rendere meno dei BTP. Altre, anche molto conosciute, sono high yield. Il nome familiare non è una misura del rischio.</p>
<h2 id="diversificazione">5. Pensa alla diversificazione</h2>
<p>Un portafoglio fatto solo di BTP dipende interamente dall'Italia. Aggiungere obbligazioni di emittenti diversi, per settore e Paese, riduce la dipendenza da un singolo debitore. Per questo le liste di 10BONDS mostrano un solo titolo per emittente.</p>
<h2 id="dati">I dati di oggi</h2>
<p>Confronta la curva dei <a href="/it/obbligazioni/btp">BTP</a> con le <a href="/it/obbligazioni/corporate">obbligazioni corporate in euro</a> e con quelle <a href="/it/obbligazioni/investment-grade">investment grade</a>, tutte aggiornate ogni giorno.</p>
${cta("imposta durata e rendimento obiettivo e confronta Stati e aziende nella stessa lista")}
`,
  },
];

/** Guides that link to the default-rate table among their related pages. */
const LINKS_DEFAULT_RATES = ["rischio-di-credito-obbligazioni", "obbligazioni-investment-grade"];

/** Livio's landing text (19 Oct 2026) replaces the earlier text of the same Italian guide and publishes it. */
function withLanding(g: SeedGuide): SeedGuide {
  const x = g.locale === "it" ? landingFor(`/it/guide/${g.slug}`) : null;
  if (!x) return g;
  const related = LINKS_DEFAULT_RATES.includes(g.slug) ? [...g.relatedSlugs, "probabilita-default-rating"] : g.relatedSlugs;
  return { ...g, title: x.h1, seoTitle: x.seoTitle, metaDescription: x.metaDescription, bodyHtml: x.bodyHtml, relatedSlugs: related, status: "published" };
}

export const SEED_GUIDES: SeedGuide[] = [...SEED_GUIDES_IT, ...SEED_GUIDES_FR, ...SEED_GUIDES_DE, ...SEED_GUIDES_WAVE, ...SEED_GUIDES_LIVIO, ...SEED_GUIDES_FR2, ...SEED_GUIDES_DE2].map(withLanding);
