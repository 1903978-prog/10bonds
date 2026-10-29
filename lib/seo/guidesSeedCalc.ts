import type { SeedGuide } from "./guidesSeed";

// The calculator cluster in Italian, French and German (29 Oct 2026): each guide answers one search question, shows its
// arithmetic and links back to the yield calculator. Written for each market, not translated word for word. Examples
// were computed with lib/seo/calc.ts. No ISINs, no live prices, no recommendation; tax rates are named only where the
// official source is given, and the visitor types his or her own rate in the calculator.

const notaIt = `<p><em>Informazioni a scopo educativo, non una raccomandazione personalizzata. Prezzi, rendimenti e regole fiscali cambiano: verifica la fonte ufficiale.</em></p>`;
const notaFr = `<p><em>Informations à visée pédagogique, pas une recommandation personnalisée. Prix, rendements et règles fiscales évoluent : vérifiez la source officielle.</em></p>`;
const notaDe = `<p><em>Nur zur Information und Bildung, keine persönliche Empfehlung. Kurse, Renditen und Steuerregeln ändern sich: bitte offizielle Quelle prüfen.</em></p>`;
const ctaIt = `<p><strong>Prova subito:</strong> <a href="/it">scegli scadenza e rendimento e guarda le dieci obbligazioni selezionate dal modello</a>.</p>`;
const ctaFr = `<p><strong>Essayez :</strong> <a href="/fr">choisissez l'échéance et le rendement et voyez les dix obligations retenues par le modèle</a>.</p>`;
const ctaDe = `<p><strong>Jetzt ausprobieren:</strong> <a href="/de">Laufzeit und Rendite wählen und die zehn vom Modell ausgewählten Anleihen sehen</a>.</p>`;

export const SEED_GUIDES_CALC: SeedGuide[] = [
  // ---------------- ITALIANO ----------------
  {
    locale: "it", topic: "ytm", group: "yield-calculator", status: "published",
    slug: "calcolatore-rendimento-obbligazioni",
    title: "Calcolatore rendimento obbligazioni: come usarlo e cosa significa il risultato",
    seoTitle: "Calcolatore Rendimento Obbligazioni: Lordo e Netto",
    metaDescription: "Calcolatore del rendimento di un'obbligazione: inserisci prezzo, cedola e scadenza e ottieni rendimento a scadenza, corrente e netto, con un esempio svolto.",
    primaryKeyword: "calcolatore rendimento obbligazioni",
    relatedKeywords: ["calcolo rendimento obbligazioni", "calcolare rendimento obbligazione", "rendimento a scadenza calcolatore"],
    relatedSlugs: ["calcolo-rendimento-btp", "rendimento-netto-obbligazioni", "prezzo-secco-tel-quel-rateo", "rendimento-a-scadenza"],
    bodyHtml: `
<p><strong>In breve:</strong> per calcolare il rendimento di un'obbligazione servono tre dati, prezzo, cedola e scadenza. Il calcolatore qui sotto li trasforma in un unico tasso annuo, il rendimento a scadenza, lordo e (se scrivi la tua aliquota) netto. Gira nel tuo browser: niente viene inviato da nessuna parte.</p>
<p>[[10bonds:calculator]]</p>
<h2 id="tre-dati">I tre dati che servono</h2>
<ul>
<li><strong>Il prezzo secco</strong>, quello che il broker mostra, per 100 di nominale. A 98,5 si pagano 985 euro ogni 1.000 di nominale, rateo escluso.</li>
<li><strong>La cedola annua</strong>, in percentuale, e ogni quanto viene pagata. È scritta nel regolamento del titolo.</li>
<li><strong>La data di scadenza</strong>, quando l'emittente restituisce il capitale.</li>
</ul>
<h2 id="cosa-restituisce">Cosa restituisce il calcolatore</h2>
<p>Il numero che interessa di più è il <strong>rendimento a scadenza</strong>: il tasso annuo che rende il prezzo pagato uguale al valore attuale di tutte le cedole e del rimborso. Accanto trovi il rendimento corrente (cedola divisa prezzo), il rateo maturato, il prezzo tel quel (quello che esce davvero dal conto) e l'elenco dei flussi di cassa.</p>
<h2 id="esempio">Un esempio</h2>
<p>Un titolo con cedola annua del 3%, cinque anni alla scadenza, comprato a 95. Ogni anno incassi 3 ogni 100; alla fine ti restituiscono 100, cinque punti più di quanto hai speso. Il rendimento a scadenza è del <strong>4,13%</strong> annuo, il corrente del 3,16%. La differenza è lo sconto che recuperi a scadenza, spalmato sugli anni. A 100 i due numeri coinciderebbero, al 3%.</p>
<h2 id="lordo-netto">Dal lordo al netto</h2>
<p>Scrivi la tua aliquota nel campo apposito: ogni cedola viene ridotta e il guadagno a scadenza (100 meno il prezzo di acquisto) è tassato con la stessa aliquota. Con il 26% l'esempio sopra scende al 3,07%, con il 12,5% al 3,62%. Quale aliquota si applichi al tuo caso lo dice la fonte ufficiale, non questa pagina: per i dettagli vedi <a href="/it/guide/rendimento-netto-obbligazioni">rendimento netto delle obbligazioni</a>.</p>
<h2 id="limiti">I limiti del calcolo</h2>
<ul>
<li>Il rendimento a scadenza presume che tu tenga il titolo fino alla fine e che l'emittente paghi tutto. Non misura il rischio di credito.</li>
<li>Non vale per titoli callable, a tasso variabile o legati all'inflazione, dove i flussi non sono fissi.</li>
<li>Commissioni e spread di acquisto non sono inclusi.</li>
</ul>
<h2 id="faq">Domande frequenti</h2>
<h3>Come si calcola il rendimento di un'obbligazione?</h3>
<p>Con prezzo, cedola e scadenza: il rendimento a scadenza è il tasso annuo che uguaglia il prezzo pagato al valore attuale dei flussi futuri. Non c'è una formula diretta, quindi si procede per tentativi, come fa il calcolatore.</p>
<h3>Qual è la differenza tra rendimento corrente e rendimento a scadenza?</h3>
<p>Il corrente è la cedola divisa per il prezzo; il rendimento a scadenza considera anche lo scarto tra prezzo e rimborso e le date dei pagamenti.</p>
<h3>Il calcolatore funziona anche per obbligazioni societarie?</h3>
<p>Sì, per qualsiasi obbligazione a cedola fissa. Il risultato non dice nulla sulla solidità dell'emittente.</p>
<h3>Posso salvare o condividere un risultato?</h3>
<p>Sì: l'indirizzo della pagina si aggiorna con i dati inseriti, quindi basta copiare il link o salvarlo nei preferiti.</p>
${ctaIt}
${notaIt}`,
  },
  {
    locale: "it", topic: "ytm", group: "btp-yield", status: "published",
    slug: "calcolo-rendimento-btp",
    title: "Calcolo rendimento BTP: dal prezzo al rendimento, passo dopo passo",
    seoTitle: "Calcolo Rendimento BTP: Prezzo, Cedola e Scadenza",
    metaDescription: "Come calcolare il rendimento di un BTP partendo da prezzo, cedola semestrale e scadenza: formula, esempio con numeri e differenza tra lordo e netto.",
    primaryKeyword: "calcolo rendimento btp",
    relatedKeywords: ["rendimento btp", "calcolare rendimento btp", "btp rendimento netto"],
    relatedSlugs: ["calcolatore-rendimento-obbligazioni", "rendimento-netto-obbligazioni", "btp", "rendimento-a-scadenza"],
    bodyHtml: `
<p><strong>In breve:</strong> il rendimento di un BTP si calcola partendo dal prezzo di acquisto, dalla cedola, che è semestrale, e dalla scadenza. Il tasso che ne esce, il rendimento a scadenza, è quello che conta per confrontare un BTP con un altro titolo, perché la cedola da sola racconta solo metà della storia.</p>
<h2 id="cosa-serve">Cosa serve</h2>
<p>Un BTP paga la cedola ogni sei mesi: la cedola annuale dichiarata (per esempio 3,5%) si divide in due metà uguali. Il prezzo sullo schermo è il prezzo secco, per 100 di nominale; a questo, al momento dell'acquisto, si aggiunge il <a href="/it/guide/prezzo-secco-tel-quel-rateo">rateo</a>, cioè gli interessi maturati dall'ultimo stacco. Il rimborso avviene alla pari, 100, alla scadenza.</p>
<h2 id="esempio">Un esempio con i numeri</h2>
<p>Un BTP con cedola annua del 4%, pagata in due rate da 2, a dieci anni dalla scadenza.</p>
<table><thead><tr><th scope="col">Prezzo secco</th><th scope="col">Rendimento corrente</th><th scope="col">Rendimento a scadenza</th></tr></thead><tbody>
<tr><td>98,5</td><td>4,06%</td><td>4,19%</td></tr>
<tr><td>100</td><td>4,00%</td><td>4,00%</td></tr>
<tr><td>102</td><td>3,92%</td><td>3,76%</td></tr>
</tbody></table>
<p>Il schema è sempre lo stesso: sotto la pari, il rendimento a scadenza è più alto della cedola, perché a scadenza il titolo sale a 100; sopra la pari è più basso. Alla pari, nel giorno dello stacco, rendimento e cedola coincidono. Il rendimento corrente, che divide solo la cedola per il prezzo, va nella direzione sbagliata.</p>
<h2 id="calcolatore">Farlo in un secondo</h2>
<p>A mano non c'è una formula chiusa: il rendimento si trova per tentativi. Il <a href="/it/calcolatori/rendimento-netto-btp">calcolatore del rendimento netto di un BTP</a> lo fa per te: inserisci prezzo, cedola e scadenza, scegli la frequenza semestrale e leggi il risultato.</p>
<p>[[10bonds:calculator]]</p>
<h2 id="lordo-netto">Lordo e netto</h2>
<p>Il rendimento che si legge sui listini è lordo. Il netto dipende dal regime fiscale che si applica a chi compra, e per i titoli di Stato italiani è di norma più favorevole che per le obbligazioni societarie: per i numeri attuali conta la fonte ufficiale, l'Agenzia delle Entrate. Nel calcolatore scrivi tu l'aliquota; il confronto tra lordo e netto è spiegato nella guida al <a href="/it/guide/rendimento-netto-obbligazioni">rendimento netto delle obbligazioni</a>.</p>
<h2 id="oltre-il-numero">Cosa il numero non dice</h2>
<p>Il rendimento a scadenza presume che tu tenga il BTP fino al rimborso. Se lo vendi prima, incassi il prezzo di mercato di quel giorno, che può essere sopra o sotto quello pagato. E non è una previsione: è un conto che dipende dal prezzo di oggi.</p>
<h2 id="faq">Domande frequenti</h2>
<h3>Come si calcola il rendimento di un BTP?</h3>
<p>Servono prezzo, cedola e scadenza. Il rendimento a scadenza è il tasso annuo che rende il prezzo pagato uguale al valore attuale delle cedole e del rimborso.</p>
<h3>La cedola del BTP è il suo rendimento?</h3>
<p>No, solo se lo compri alla pari nel giorno dello stacco. Altrimenti prezzo e tempo alla scadenza spostano il rendimento sopra o sotto la cedola.</p>
<h3>Quanto si paga davvero un BTP?</h3>
<p>Il prezzo secco più il rateo di cedola maturato, più eventuali commissioni del broker.</p>
<h3>Si può calcolare il rendimento netto di un BTP?</h3>
<p>Sì, inserendo la propria aliquota nel calcolatore: è una stima semplificata, non consulenza fiscale.</p>
${ctaIt}
${notaIt}`,
  },
  {
    locale: "it", topic: "ytm", group: "net-yield", status: "published",
    slug: "rendimento-netto-obbligazioni",
    title: "Rendimento netto delle obbligazioni: come calcolarlo dopo le tasse",
    seoTitle: "Rendimento Netto Obbligazioni: Come Calcolarlo",
    metaDescription: "Come passare dal rendimento lordo al netto di un'obbligazione: tasse su cedole e plusvalenza, un esempio con tre aliquote e i limiti di un calcolo semplice.",
    primaryKeyword: "rendimento netto obbligazioni",
    relatedKeywords: ["rendimento netto", "obbligazioni rendimento netto tasse", "calcolo rendimento netto obbligazioni"],
    relatedSlugs: ["calcolatore-rendimento-obbligazioni", "calcolo-rendimento-btp", "rendimento-a-scadenza"],
    bodyHtml: `
<p><strong>In breve:</strong> il rendimento che leggi sui listini è lordo, cioè quello di un mondo senza fisco. Il netto è ciò che resta dopo le tasse su cedole e su un eventuale guadagno a scadenza. Due titoli con lo stesso lordo possono lasciarti in tasca cifre diverse, e per questo la riga delle tasse in un calcolatore non è un soprammobile.</p>
<h2 id="modello">Il modello semplice</h2>
<ul>
<li>ogni cedola è ridotta dell'aliquota che scegli, nel giorno in cui viene pagata;</li>
<li>a scadenza, se hai comprato sotto 100, la differenza tra 100 e il prezzo di acquisto è tassata con la stessa aliquota;</li>
<li>una minusvalenza, se hai comprato sopra 100, non viene compensata con nulla: dipende da altri tuoi redditi, che un calcolatore non può conoscere.</li>
</ul>
<p>Poi si risolve il rendimento sui flussi ridotti. È la versione più semplice che resta utile.</p>
<h2 id="esempio">Un titolo, tre aliquote</h2>
<p>Cedola annua del 3%, cinque anni alla scadenza, prezzo 95. Rendimento lordo a scadenza: <strong>4,13%</strong>.</p>
<table><thead><tr><th scope="col">Aliquota</th><th scope="col">Rendimento netto</th><th scope="col">Costo delle tasse</th></tr></thead><tbody>
<tr><td>0%</td><td>4,13%</td><td>nessuno</td></tr>
<tr><td>12,5%</td><td>3,62%</td><td>0,51 punti</td></tr>
<tr><td>26%</td><td>3,07%</td><td>1,06 punti</td></tr>
</tbody></table>
<p>Sono esempi di aliquote che potresti scrivere tu, non indicazioni su quale valga per te. In Italia l'aliquota ordinaria sui redditi di capitale è del 26%, mentre i titoli di Stato italiani e gli equiparati hanno un'aliquota agevolata del 12,5%: verifica sempre la fonte ufficiale, l'Agenzia delle Entrate, perché le regole possono cambiare e dipendono dal tipo di titolo e dal tuo regime. <a href="/it/calcolatori/rendimento-netto-btp">Prova il calcolo con la tua aliquota</a>.</p>
<p>[[10bonds:calculator]]</p>
<h2 id="stesso-lordo">Stesso lordo, netto diverso</h2>
<p>Quando cedole e guadagno in conto capitale hanno trattamenti diversi, un titolo sotto la pari può battere uno alla pari con lo stesso rendimento lordo, o il contrario. Il modello semplice usa un'aliquota sola: per questi casi conviene ripetere il conto o sentire un professionista.</p>
<h2 id="costi">I costi sono un'altra voce</h2>
<p>Commissioni di acquisto, spese di custodia e spread riducono ancora il risultato e il calcolatore non li comprende. Su importi piccoli o scadenze brevi possono pesare più delle tasse.</p>
<h2 id="faq">Domande frequenti</h2>
<h3>Come si calcola il rendimento netto di un'obbligazione?</h3>
<p>Riducendo ogni cedola dell'aliquota, tassando alla stessa aliquota l'eventuale guadagno a scadenza e risolvendo il rendimento sui flussi che ne risultano. Un calcolatore con il campo delle tasse lo fa per te.</p>
<h3>Il netto è il lordo per uno meno l'aliquota?</h3>
<p>Quasi, per un titolo alla pari. Per un titolo sotto o sopra la pari il risultato differisce, perché il guadagno viene tassato in blocco alla fine.</p>
<h3>Questo sostituisce la consulenza fiscale?</h3>
<p>No. Le regole dipendono dal tuo caso e dalle norme in vigore.</p>
${ctaIt}
${notaIt}`,
  },
  {
    locale: "it", topic: "ytm", group: "clean-dirty", status: "published",
    slug: "prezzo-secco-tel-quel-rateo",
    title: "Prezzo secco, prezzo tel quel e rateo: quanto si paga davvero un'obbligazione",
    seoTitle: "Prezzo Secco, Tel Quel e Rateo Cedola Spiegati",
    metaDescription: "Prezzo secco, tel quel e rateo di cedola: cosa sono, come si calcolano con un esempio e perché la cifra che esce dal conto è più alta del prezzo quotato.",
    primaryKeyword: "prezzo secco tel quel rateo",
    relatedKeywords: ["rateo cedola", "prezzo tel quel obbligazioni", "prezzo secco obbligazioni"],
    relatedSlugs: ["calcolatore-rendimento-obbligazioni", "calcolo-rendimento-btp", "rendimento-a-scadenza"],
    bodyHtml: `
<p><strong>In breve:</strong> il prezzo che vedi sullo schermo non è quello che paghi. È il <strong>prezzo secco</strong>, senza gli interessi maturati dall'ultima cedola. Quello che esce dal conto è il <strong>prezzo tel quel</strong>: prezzo secco più <strong>rateo</strong>. Succede perché le obbligazioni si comprano ogni giorno dell'anno, mentre le cedole si pagano due volte l'anno (o una).</p>
<h2 id="definizioni">Le definizioni</h2>
<ul>
<li><strong>Prezzo secco:</strong> il prezzo quotato, senza interessi maturati.</li>
<li><strong>Rateo:</strong> la quota della prossima cedola maturata dal venditore nei giorni in cui ha tenuto il titolo.</li>
<li><strong>Prezzo tel quel:</strong> prezzo secco più rateo, cioè il prezzo pieno.</li>
</ul>
<p>Si quota il secco per una ragione pratica: con il tel quel il prezzo salirebbe ogni giorno e crollerebbe a ogni stacco, a dente di sega, e i veri movimenti del mercato si perderebbero nel calendario degli interessi.</p>
<h2 id="esempio">Un esempio</h2>
<p>Titolo con cedola del 3,5% semestrale: 1,75 ogni sei mesi. L'ultima cedola è stata pagata il 15 agosto e compri il 15 dicembre, quattro mesi dopo, a un prezzo secco di 98.</p>
<p>Il venditore ha tenuto il titolo quattro mesi su sei, quindi ha maturato 4/6 della prossima cedola: circa <strong>1,16</strong>. Il prezzo tel quel è 98 + 1,16 = <strong>99,16</strong>. Su un nominale di 10.000 euro paghi 9.916 e non 9.800.</p>
<p>I soldi non sono persi: il 15 febbraio l'emittente ti paga l'intera cedola di 1,75, di cui 1,16 restituisce ciò che hai anticipato al venditore. Il rateo è una questione di calendario, non una commissione. Puoi riprodurre il conto nel <a href="/it/calcolatori/rendimento-netto-btp">calcolatore</a>, che mostra rateo e prezzo tel quel.</p>
<p>[[10bonds:calculator]]</p>
<h2 id="rendimento">Quale prezzo entra nel rendimento?</h2>
<p>Il rendimento a scadenza si calcola su quello che paghi davvero, cioè sul tel quel. Se metti il solo prezzo secco in un foglio di calcolo e dimentichi il rateo, il risultato sbaglia, poco nella maggior parte dei giorni, di più alla vigilia di una cedola. Il calcolatore parte dal secco, ricava il rateo dalle date e usa il tel quel.</p>
<h2 id="tasse">Rateo e tasse</h2>
<p>Il trattamento fiscale del rateo pagato al venditore dipende dal tipo di titolo e dalle regole in vigore: verifica la fonte ufficiale o chiedi a un professionista. Il calcolatore non lo modella.</p>
<h2 id="faq">Domande frequenti</h2>
<h3>Perché pago più del prezzo quotato?</h3>
<p>Perché al prezzo secco si aggiunge il rateo di cedola maturato, e si sommano le commissioni del broker.</p>
<h3>Il rateo è un costo?</h3>
<p>No: lo recuperi con la prima cedola successiva, che viene pagata per intero a chi detiene il titolo allo stacco.</p>
<h3>Il prezzo secco salta quando si stacca la cedola?</h3>
<p>No, è il prezzo tel quel a scendere della cedola. Il secco resta continuo.</p>
${ctaIt}
${notaIt}`,
  },

  // ---------------- FRANÇAIS ----------------
  {
    locale: "fr", topic: "ytm", group: "yield-calculator", status: "published",
    slug: "calculateur-rendement-obligation",
    title: "Calculateur de rendement d'obligation : mode d'emploi et lecture du résultat",
    seoTitle: "Calculateur Rendement Obligation : Brut et Net",
    metaDescription: "Calculateur de rendement d'obligation : saisissez prix, coupon et échéance pour obtenir le rendement actuariel, courant et net, avec un exemple chiffré.",
    primaryKeyword: "calculateur rendement obligation",
    relatedKeywords: ["calcul rendement obligation", "rendement actuariel calculateur", "calculer rendement obligation"],
    relatedSlugs: ["prix-pied-de-coupon-coupon-couru", "rendement-net-obligation", "calcul-rendement-obligation"],
    bodyHtml: `
<p><strong>L'essentiel :</strong> pour calculer le rendement d'une obligation, il faut trois données, le prix, le coupon et l'échéance. Le calculateur ci-dessous les convertit en un seul taux annuel, le rendement actuariel, brut et (si vous saisissez votre taux d'imposition) net. Tout se passe dans votre navigateur : rien n'est envoyé.</p>
<p>[[10bonds:calculator]]</p>
<h2 id="trois-donnees">Les trois données</h2>
<ul>
<li><strong>Le prix pied de coupon</strong>, celui qu'affiche votre courtier, pour 100 de nominal. À 98,5, on paie 985 euros pour 1 000 de nominal, coupon couru exclu.</li>
<li><strong>Le coupon annuel</strong>, en pourcentage, et sa périodicité : une fois par an pour les OAT, deux pour la plupart des titres italiens ou américains.</li>
<li><strong>L'échéance</strong>, la date de remboursement du capital.</li>
</ul>
<h2 id="resultat">Ce que donne le calculateur</h2>
<p>Le chiffre qui compte est le <strong>rendement actuariel</strong> : le taux annuel qui égalise le prix payé et la valeur actuelle de tous les coupons et du remboursement. À côté, le rendement courant (coupon divisé par prix), le coupon couru, le prix coupon couru inclus et le tableau des flux.</p>
<h2 id="exemple">Un exemple</h2>
<p>Une obligation à coupon annuel de 3 %, cinq ans à courir, achetée 95. Chaque année vous touchez 3 pour 100 ; à la fin on vous rend 100, cinq points de plus que ce que vous avez payé. Le rendement actuariel est de <strong>4,13 %</strong> par an, le rendement courant de 3,16 %. L'écart est la décote récupérée à l'échéance, étalée sur les années. À 100, les deux chiffres seraient égaux, à 3 %.</p>
<h2 id="brut-net">Du brut au net</h2>
<p>Saisissez votre taux d'imposition : chaque coupon est réduit et le gain à l'échéance (100 moins le prix d'achat) est imposé au même taux. Avec 26 %, l'exemple tombe à 3,07 % ; avec 12,5 %, à 3,62 %. Le taux applicable à votre cas dépend de la source officielle, pas de cette page : voir <a href="/fr/guides/rendement-net-obligation">rendement net d'une obligation</a>.</p>
<h2 id="limites">Les limites</h2>
<ul>
<li>Le rendement actuariel suppose que vous gardez le titre jusqu'au bout et que l'émetteur paie tout. Il ne mesure pas le risque de crédit.</li>
<li>Il ne convient pas aux obligations remboursables par anticipation, à taux variable ou indexées sur l'inflation.</li>
<li>Les frais de courtage et l'écart d'achat ne sont pas inclus.</li>
</ul>
<h2 id="faq">Questions fréquentes</h2>
<h3>Comment calculer le rendement d'une obligation ?</h3>
<p>Avec le prix, le coupon et l'échéance : le rendement actuariel est le taux annuel qui égalise le prix payé et la valeur actuelle des flux futurs. Il se trouve par approximations successives, comme le fait le calculateur. Pour la méthode à la main, voir <a href="/fr/guides/calcul-rendement-obligation">comment calculer le rendement d'une obligation</a>.</p>
<h3>Quelle différence entre rendement courant et rendement actuariel ?</h3>
<p>Le rendement courant est le coupon divisé par le prix ; le rendement actuariel tient aussi compte de l'écart entre prix et remboursement et de la date de chaque paiement.</p>
<h3>Puis-je enregistrer ou partager un résultat ?</h3>
<p>Oui : l'adresse de la page se met à jour avec vos données, il suffit de copier le lien ou de l'enregistrer en favori.</p>
${ctaFr}
${notaFr}`,
  },
  {
    locale: "fr", topic: "ytm", group: "clean-dirty", status: "published",
    slug: "prix-pied-de-coupon-coupon-couru",
    title: "Prix pied de coupon et coupon couru : ce que vous payez vraiment pour une obligation",
    seoTitle: "Prix Pied de Coupon et Coupon Couru Expliqués",
    metaDescription: "Prix pied de coupon, coupon couru et prix coupon couru inclus : définitions, exemple chiffré et raison pour laquelle le montant débité dépasse le prix affiché.",
    primaryKeyword: "prix pied de coupon coupon couru",
    relatedKeywords: ["coupon couru obligation", "prix pied de coupon", "prix coupon couru inclus"],
    relatedSlugs: ["calculateur-rendement-obligation", "rendement-net-obligation", "calcul-rendement-obligation"],
    bodyHtml: `
<p><strong>L'essentiel :</strong> le prix affiché à l'écran n'est pas celui que vous payez. C'est le <strong>prix pied de coupon</strong>, sans les intérêts courus depuis le dernier détachement. Ce qui sort de votre compte est le prix <strong>coupon couru inclus</strong> : prix pied de coupon plus <strong>coupon couru</strong>. La raison est pratique : on achète des obligations tous les jours de l'année, mais les coupons ne tombent qu'une ou deux fois par an.</p>
<h2 id="definitions">Les définitions</h2>
<ul>
<li><strong>Prix pied de coupon</strong> (ou « clean price ») : le prix coté, sans intérêts courus.</li>
<li><strong>Coupon couru :</strong> la part du prochain coupon gagnée par le vendeur pendant qu'il détenait le titre.</li>
<li><strong>Prix coupon couru inclus</strong> (« dirty price ») : pied de coupon plus coupon couru, soit le prix plein.</li>
</ul>
<p>On cote pied de coupon pour ne pas voir le prix monter chaque jour et chuter à chaque détachement, en dents de scie, ce qui noierait les vrais mouvements du marché dans le calendrier des intérêts.</p>
<h2 id="exemple">Un exemple</h2>
<p>Obligation à coupon de 3,5 % semestriel : 1,75 tous les six mois. Le dernier coupon est tombé le 15 août ; vous achetez le 15 décembre, quatre mois après, à un prix pied de coupon de 98.</p>
<p>Le vendeur a détenu le titre quatre mois sur six : il a gagné 4/6 du prochain coupon, soit environ <strong>1,16</strong>. Votre prix coupon couru inclus est 98 + 1,16 = <strong>99,16</strong>. Pour 10 000 euros de nominal, vous payez 9 916 et non 9 800.</p>
<p>L'argent n'est pas perdu : le 15 février, l'émetteur vous verse le coupon entier de 1,75, dont 1,16 vous rembourse ce que vous avez avancé au vendeur. Le coupon couru est un décalage de calendrier, pas un frais. Reproduisez le calcul dans le <a href="/fr/calculateurs/rendement-actuariel">calculateur</a>, qui affiche coupon couru et prix coupon couru inclus.</p>
<p>[[10bonds:calculator]]</p>
<h2 id="rendement">Quel prix dans le rendement ?</h2>
<p>Le rendement actuariel se calcule sur ce que vous payez réellement, donc coupon couru inclus. Si vous saisissez seulement le prix pied de coupon dans un tableur en oubliant le coupon couru, le résultat est faussé, peu la plupart des jours, davantage à la veille d'un détachement. Le calculateur part du prix pied de coupon, déduit le coupon couru des dates et travaille avec le prix plein.</p>
<h2 id="faq">Questions fréquentes</h2>
<h3>Pourquoi paie-t-on plus que le prix affiché ?</h3>
<p>Parce qu'au prix pied de coupon s'ajoute le coupon couru, et les frais de courtage éventuels.</p>
<h3>Le coupon couru est-il un coût ?</h3>
<p>Non : vous le récupérez avec le prochain coupon, versé en entier au détenteur du titre le jour du détachement.</p>
<h3>Le prix pied de coupon bondit-il au détachement ?</h3>
<p>Non : c'est le prix coupon couru inclus qui baisse du montant du coupon ; le prix pied de coupon reste continu.</p>
${ctaFr}
${notaFr}`,
  },
  {
    locale: "fr", topic: "ytm", group: "net-yield", status: "published",
    slug: "rendement-net-obligation",
    title: "Rendement net d'une obligation : comment le calculer après impôt",
    seoTitle: "Rendement Net d'une Obligation : Calcul Après Impôt",
    metaDescription: "Comment passer du rendement brut au net pour une obligation : impôt sur les coupons et sur le gain à l'échéance, exemple avec trois taux et limites du calcul.",
    primaryKeyword: "rendement net obligation",
    relatedKeywords: ["rendement net après impôt obligation", "calcul rendement net", "rendement actuariel net"],
    relatedSlugs: ["calculateur-rendement-obligation", "prix-pied-de-coupon-coupon-couru", "calcul-rendement-obligation"],
    bodyHtml: `
<p><strong>L'essentiel :</strong> le rendement affiché est brut : celui d'un monde sans impôt. Le net est ce qui reste après l'impôt sur les coupons et sur un éventuel gain à l'échéance. Deux obligations de même rendement brut peuvent laisser des sommes différentes, ce qui explique la ligne « impôt » d'un calculateur.</p>
<h2 id="modele">Le modèle simple</h2>
<ul>
<li>chaque coupon est réduit du taux que vous choisissez, le jour où il est versé ;</li>
<li>à l'échéance, si vous avez acheté sous 100, l'écart entre 100 et le prix d'achat est imposé au même taux ;</li>
<li>une moins-value, si vous avez acheté au-dessus de 100, n'est imputée sur rien : cela dépend de vos autres revenus, qu'un calculateur ne connaît pas.</li>
</ul>
<p>On résout ensuite le rendement sur les flux réduits : la version la plus simple qui reste utile.</p>
<h2 id="exemple">Un titre, trois taux</h2>
<p>Coupon annuel de 3 %, cinq ans à courir, prix 95. Rendement actuariel brut : <strong>4,13 %</strong>.</p>
<table><thead><tr><th scope="col">Taux saisi</th><th scope="col">Rendement net</th><th scope="col">Coût de l'impôt</th></tr></thead><tbody>
<tr><td>0 %</td><td>4,13 %</td><td>aucun</td></tr>
<tr><td>12,5 %</td><td>3,62 %</td><td>0,51 point</td></tr>
<tr><td>26 %</td><td>3,07 %</td><td>1,06 point</td></tr>
</tbody></table>
<p>Ce sont des exemples de taux que vous pourriez saisir, pas une indication de celui qui vous concerne. Le taux applicable dépend du type de titre, du compte et de votre situation, et les règles évoluent : la source officielle fait foi (impots.gouv.fr). <a href="/fr/calculateurs/rendement-actuariel">Essayez avec votre taux</a>.</p>
<p>[[10bonds:calculator]]</p>
<h2 id="frais">Les frais sont à part</h2>
<p>Frais de courtage, droits de garde et écarts de cotation réduisent encore le résultat, et le calculateur ne les inclut pas. Sur un petit montant ou une courte échéance, ils pèsent parfois plus que l'impôt.</p>
<h2 id="faq">Questions fréquentes</h2>
<h3>Comment calculer le rendement net d'une obligation ?</h3>
<p>En réduisant chaque coupon du taux d'imposition, en imposant au même taux le gain à l'échéance, puis en résolvant le rendement sur ces flux. Un calculateur doté d'un champ « impôt » le fait pour vous.</p>
<h3>Le rendement net est-il le brut multiplié par un moins le taux ?</h3>
<p>Presque, pour un titre au pair. Sous ou au-dessus du pair, le résultat diffère, car le gain est imposé en bloc à la fin.</p>
<h3>Cela remplace-t-il un conseil fiscal ?</h3>
<p>Non. Les règles dépendent de votre situation et évoluent.</p>
${ctaFr}
${notaFr}`,
  },

  // ---------------- DEUTSCH ----------------
  {
    locale: "de", topic: "ytm", group: "yield-calculator", status: "published",
    slug: "anleihe-rendite-rechner",
    title: "Anleihe Rendite Rechner: So lesen Sie das Ergebnis richtig",
    seoTitle: "Anleihe Rendite Rechner: Brutto und nach Steuern",
    metaDescription: "Anleihe-Rendite-Rechner: Kurs, Kupon und Fälligkeit eingeben und Rendite bis Fälligkeit, laufende Rendite und Rendite nach Steuern ablesen, mit Beispiel.",
    primaryKeyword: "anleihe rendite rechner",
    relatedKeywords: ["anleihe rendite berechnen", "rendite anleihe berechnen", "rendite bis fälligkeit rechner"],
    relatedSlugs: ["stueckzinsen-clean-price-dirty-price", "anleihe-rendite-nach-steuern", "rendite-bis-faelligkeit"],
    bodyHtml: `
<p><strong>Kurz gesagt:</strong> Für die Rendite einer Anleihe brauchen Sie drei Angaben: Kurs, Kupon und Fälligkeit. Der Rechner unten macht daraus einen einzigen Jahreszins, die Rendite bis Fälligkeit, brutto und (wenn Sie Ihren Steuersatz eintragen) nach Steuern. Gerechnet wird in Ihrem Browser, nichts wird versendet.</p>
<p>[[10bonds:calculator]]</p>
<h2 id="drei-angaben">Die drei Angaben</h2>
<ul>
<li><strong>Der Kurs</strong> (Clean Price), wie Ihr Broker ihn anzeigt, je 100 Nennwert. Bei 98,5 zahlen Sie 985 Euro je 1.000 Nennwert, ohne Stückzinsen.</li>
<li><strong>Der Jahreskupon</strong> in Prozent und der Zahlungsrhythmus: Bundesanleihen einmal im Jahr, viele andere halbjährlich.</li>
<li><strong>Die Fälligkeit</strong>, an der der Emittent das Kapital zurückzahlt.</li>
</ul>
<h2 id="ergebnis">Was der Rechner liefert</h2>
<p>Die wichtigste Zahl ist die <strong>Rendite bis Fälligkeit</strong>: der Jahreszins, bei dem der gezahlte Kurs dem Barwert aller Kupons und der Rückzahlung entspricht. Daneben stehen die laufende Rendite (Kupon geteilt durch Kurs), die Stückzinsen, der Kurs inklusive Stückzinsen und die Zahlungsliste.</p>
<h2 id="beispiel">Ein Beispiel</h2>
<p>Eine Anleihe mit 3 % Jahreskupon, fünf Jahre Laufzeit, gekauft zu 95. Jedes Jahr fließen 3 je 100; am Ende gibt es 100 zurück, fünf Punkte mehr, als Sie bezahlt haben. Die Rendite bis Fälligkeit beträgt <strong>4,13 %</strong> pro Jahr, die laufende Rendite 3,16 %. Die Lücke ist der Abschlag, den Sie bei Fälligkeit einstreichen, auf die Jahre verteilt. Bei einem Kurs von 100 wären beide Zahlen gleich, nämlich 3 %.</p>
<h2 id="steuern">Von brutto zu netto</h2>
<p>Tragen Sie Ihren Steuersatz ein: Jeder Kupon wird gekürzt, der Kursgewinn bei Fälligkeit (100 minus Kaufkurs) wird mit demselben Satz besteuert. Bei 26 % fällt das Beispiel auf 3,07 %, bei 12,5 % auf 3,62 %. Welcher Satz für Sie gilt, sagt die offizielle Quelle, nicht diese Seite: siehe <a href="/de/ratgeber/anleihe-rendite-nach-steuern">Anleihe-Rendite nach Steuern</a>.</p>
<h2 id="grenzen">Die Grenzen</h2>
<ul>
<li>Die Rendite bis Fälligkeit unterstellt, dass Sie die Anleihe bis zum Ende halten und der Emittent alles zahlt. Das Kreditrisiko misst sie nicht.</li>
<li>Für kündbare, variabel verzinste oder inflationsindexierte Anleihen taugt sie nicht, denn dort sind die Zahlungen nicht fest.</li>
<li>Orderprovision und Spread sind nicht enthalten.</li>
</ul>
<h2 id="faq">Häufige Fragen</h2>
<h3>Wie berechne ich die Rendite einer Anleihe?</h3>
<p>Mit Kurs, Kupon und Fälligkeit: Die Rendite bis Fälligkeit ist der Jahreszins, bei dem der gezahlte Kurs dem Barwert der künftigen Zahlungen entspricht. Eine direkte Formel gibt es nicht, der Rechner findet sie durch Probieren. Die Rechnung von Hand zeigt der Ratgeber <a href="/de/ratgeber/rendite-bis-faelligkeit">Rendite bis Fälligkeit</a>.</p>
<h3>Was ist der Unterschied zwischen laufender Rendite und Rendite bis Fälligkeit?</h3>
<p>Die laufende Rendite ist der Kupon geteilt durch den Kurs; die Rendite bis Fälligkeit berücksichtigt auch den Unterschied zwischen Kurs und Rückzahlung sowie den Zeitpunkt jeder Zahlung.</p>
<h3>Kann ich ein Ergebnis speichern oder teilen?</h3>
<p>Ja: Die Adresse der Seite aktualisiert sich mit Ihren Eingaben, Sie können den Link kopieren oder als Lesezeichen speichern.</p>
${ctaDe}
${notaDe}`,
  },
  {
    locale: "de", topic: "ytm", group: "clean-dirty", status: "published",
    slug: "stueckzinsen-clean-price-dirty-price",
    title: "Stückzinsen, Clean Price und Dirty Price: Was Sie für eine Anleihe wirklich zahlen",
    seoTitle: "Stückzinsen, Clean Price und Dirty Price erklärt",
    metaDescription: "Stückzinsen, Clean Price und Dirty Price einfach erklärt, mit Rechenbeispiel und der Antwort, warum der abgebuchte Betrag höher ist als der angezeigte Kurs.",
    primaryKeyword: "stückzinsen clean price dirty price",
    relatedKeywords: ["stückzinsen anleihe", "clean price", "dirty price anleihe"],
    relatedSlugs: ["anleihe-rendite-rechner", "anleihe-rendite-nach-steuern", "rendite-bis-faelligkeit"],
    bodyHtml: `
<p><strong>Kurz gesagt:</strong> Der Kurs auf dem Bildschirm ist nicht das, was Sie zahlen. Er ist der <strong>Clean Price</strong>, ohne die seit dem letzten Kupon aufgelaufenen Zinsen. Abgebucht wird der <strong>Dirty Price</strong>: Clean Price plus <strong>Stückzinsen</strong>. Der Grund: Anleihen werden an jedem Tag des Jahres gekauft, Kupons aber nur ein- oder zweimal im Jahr gezahlt.</p>
<h2 id="begriffe">Die Begriffe</h2>
<ul>
<li><strong>Clean Price:</strong> der notierte Kurs, ohne aufgelaufene Zinsen.</li>
<li><strong>Stückzinsen:</strong> der Teil des nächsten Kupons, den der Verkäufer für die Tage seiner Haltedauer verdient hat.</li>
<li><strong>Dirty Price:</strong> Clean Price plus Stückzinsen, also der volle Preis.</li>
</ul>
<p>Notiert wird clean, damit der Kurs nicht jeden Tag steigt und an jedem Kupontermin abstürzt wie eine Säge. Die echten Marktbewegungen gingen sonst im Zinskalender unter.</p>
<h2 id="beispiel">Ein Rechenbeispiel</h2>
<p>Eine Anleihe mit 3,5 % Kupon halbjährlich: 1,75 alle sechs Monate. Der letzte Kupon wurde am 15. August gezahlt; Sie kaufen am 15. Dezember, vier Monate später, zum Clean Price von 98.</p>
<p>Der Verkäufer hielt die Anleihe vier von sechs Monaten, hat also 4/6 des nächsten Kupons verdient: rund <strong>1,16</strong>. Ihr Dirty Price ist 98 + 1,16 = <strong>99,16</strong>. Auf 10.000 Euro Nennwert zahlen Sie 9.916 statt 9.800.</p>
<p>Das Geld ist nicht weg: Am 15. Februar zahlt der Emittent Ihnen den vollen Kupon von 1,75, wovon 1,16 zurückgibt, was Sie dem Verkäufer vorgestreckt haben. Stückzinsen sind ein Kalenderthema, keine Gebühr. Rechnen Sie es im <a href="/de/rechner/anleihen-rendite-berechnen">Rechner</a> nach, der Stückzinsen und Dirty Price anzeigt.</p>
<p>[[10bonds:calculator]]</p>
<h2 id="rendite">Welcher Preis geht in die Rendite ein?</h2>
<p>Die Rendite bis Fälligkeit wird auf das gerechnet, was Sie tatsächlich zahlen, also auf den Dirty Price. Wer nur den Clean Price in eine Tabelle setzt und die Stückzinsen vergisst, liegt daneben, an den meisten Tagen wenig, kurz vor einem Kupontermin mehr. Der Rechner geht vom Clean Price aus, leitet die Stückzinsen aus den Daten ab und rechnet mit dem vollen Preis.</p>
<h2 id="steuer">Stückzinsen und Steuer</h2>
<p>Die steuerliche Behandlung der gezahlten Stückzinsen hängt von der Anleiheart und den geltenden Regeln ab: Prüfen Sie die offizielle Quelle oder fragen Sie einen Steuerberater. Der Rechner bildet sie nicht ab.</p>
<h2 id="faq">Häufige Fragen</h2>
<h3>Warum zahle ich mehr als den angezeigten Kurs?</h3>
<p>Weil zum Clean Price die aufgelaufenen Stückzinsen kommen, und gegebenenfalls die Orderprovision.</p>
<h3>Sind Stückzinsen eine Gebühr?</h3>
<p>Nein: Sie bekommen sie mit dem nächsten Kupon zurück, der in voller Höhe an den Inhaber am Stichtag geht.</p>
<h3>Springt der Clean Price am Kupontermin?</h3>
<p>Nein: Es fällt der Dirty Price um den Kupon; der Clean Price bleibt stetig.</p>
${ctaDe}
${notaDe}`,
  },
  {
    locale: "de", topic: "ytm", group: "net-yield", status: "published",
    slug: "anleihe-rendite-nach-steuern",
    title: "Anleihe-Rendite nach Steuern: So rechnen Sie die Nettorendite",
    seoTitle: "Anleihe Rendite nach Steuern berechnen: Netto",
    metaDescription: "So wird aus der Bruttorendite einer Anleihe die Nettorendite: Steuer auf Kupons und Kursgewinn, Beispiel mit drei Steuersätzen und die Grenzen der Rechnung.",
    primaryKeyword: "anleihe rendite nach steuern",
    relatedKeywords: ["nettorendite anleihe", "anleihe rendite netto", "rendite nach steuern berechnen"],
    relatedSlugs: ["anleihe-rendite-rechner", "stueckzinsen-clean-price-dirty-price", "rendite-bis-faelligkeit"],
    bodyHtml: `
<p><strong>Kurz gesagt:</strong> Die Rendite auf dem Bildschirm ist brutto: die Rendite einer Welt ohne Steuer. Netto ist, was nach Steuer auf Kupons und auf einen möglichen Kursgewinn bleibt. Zwei Anleihen mit gleicher Bruttorendite können Ihnen verschieden viel lassen, und deshalb ist die Steuerzeile im Rechner keine Dekoration.</p>
<h2 id="modell">Das einfache Modell</h2>
<ul>
<li>Jeder Kupon wird im Zahlungsjahr um den gewählten Satz gekürzt;</li>
<li>bei Fälligkeit wird, wenn Sie unter 100 gekauft haben, die Differenz zwischen 100 und dem Kaufkurs mit demselben Satz besteuert;</li>
<li>ein Verlust bei einem Kauf über 100 wird mit nichts verrechnet: Das hängt von Ihren anderen Einkünften ab, die ein Rechner nicht kennt.</li>
</ul>
<p>Danach wird die Rendite auf die gekürzten Zahlungen gerechnet: die einfachste Variante, die noch nützlich bleibt.</p>
<h2 id="beispiel">Eine Anleihe, drei Steuersätze</h2>
<p>3 % Jahreskupon, fünf Jahre Laufzeit, Kurs 95. Bruttorendite bis Fälligkeit: <strong>4,13 %</strong>.</p>
<table><thead><tr><th scope="col">Eingetragener Satz</th><th scope="col">Rendite nach Steuern</th><th scope="col">Kosten der Steuer</th></tr></thead><tbody>
<tr><td>0 %</td><td>4,13 %</td><td>keine</td></tr>
<tr><td>12,5 %</td><td>3,62 %</td><td>0,51 Punkte</td></tr>
<tr><td>26 %</td><td>3,07 %</td><td>1,06 Punkte</td></tr>
</tbody></table>
<p>Das sind Beispiele für Sätze, die Sie selbst eintragen könnten, kein Hinweis darauf, welcher für Sie gilt. Der maßgebliche Satz hängt von Anleiheart, Depot und Ihrer Situation ab, und die Regeln ändern sich: Maßgeblich ist die offizielle Quelle, zum Beispiel das Bundeszentralamt für Steuern. <a href="/de/rechner/anleihen-rendite-berechnen">Probieren Sie es mit Ihrem Satz</a>.</p>
<p>[[10bonds:calculator]]</p>
<h2 id="kosten">Kosten sind eine eigene Position</h2>
<p>Orderprovision, Depotgebühren und Spreads schmälern das Ergebnis weiter, und der Rechner enthält sie nicht. Bei kleinen Beträgen oder kurzen Laufzeiten wiegen sie manchmal mehr als die Steuer.</p>
<h2 id="faq">Häufige Fragen</h2>
<h3>Wie berechne ich die Rendite einer Anleihe nach Steuern?</h3>
<p>Jeden Kupon um den Steuersatz kürzen, einen Kursgewinn bei Fälligkeit mit dem geltenden Satz besteuern und die Rendite auf die entstehenden Zahlungen rechnen. Ein Rechner mit Steuerfeld erledigt das.</p>
<h3>Ist die Nettorendite einfach brutto mal (1 minus Steuersatz)?</h3>
<p>Fast, bei einer Anleihe zum Nennwert. Unter oder über 100 weicht das Ergebnis ab, weil der Gewinn am Ende auf einen Schlag besteuert wird.</p>
<h3>Ersetzt das die Steuerberatung?</h3>
<p>Nein. Die Regeln hängen von Ihrem Fall ab und ändern sich.</p>
${ctaDe}
${notaDe}`,
  },
];
