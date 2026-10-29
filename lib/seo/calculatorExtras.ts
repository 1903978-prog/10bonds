import type { Locale } from "./locales";

// What sits around the yield calculator on every language: the controls' words, example presets (inputs only, never
// market data), and the text under the tool (how to use it, a worked example, clean and dirty price, FAQ). The visitor
// types their own tax rate; no rate is preset here. Examples below were computed with lib/seo/calc.ts (see calcExtras.test.ts).

export type CalcLocale = Locale | "en";

export type PresetId = "btp" | "bund" | "oat" | "ust" | "gilt";

export const PRESETS: Record<PresetId, { price: number; coupon: number; frequency: 1 | 2 | 4; years: number }> = {
  btp: { price: 100, coupon: 3.5, frequency: 2, years: 10 },
  bund: { price: 100, coupon: 2.5, frequency: 1, years: 10 },
  oat: { price: 100, coupon: 3, frequency: 1, years: 10 },
  ust: { price: 98.5, coupon: 4.25, frequency: 2, years: 10 },
  gilt: { price: 100, coupon: 4, frequency: 2, years: 10 },
};

export const PRESET_ORDER: Record<CalcLocale, PresetId[]> = {
  en: ["ust", "gilt", "bund", "btp"],
  it: ["btp", "bund", "oat", "ust"],
  fr: ["oat", "bund", "btp", "ust"],
  de: ["bund", "btp", "oat", "ust"],
};

export type CalcUi = {
  presets: string; presetNote: string; names: Record<PresetId, string>;
  share: string; copied: string; shareNote: string; reset: string;
};

export const CALC_UI: Record<CalcLocale, CalcUi> = {
  en: {
    presets: "Start from an example", presetNote: "Example inputs only, not live prices: replace them with your bond's data.",
    names: { btp: "BTP (Italy)", bund: "Bund (Germany)", oat: "OAT (France)", ust: "Treasury note (US)", gilt: "Gilt (UK)" },
    share: "Copy link to this result", copied: "Link copied", shareNote: "The address updates as you type, so you can bookmark it, send it or add it to your home screen.", reset: "Reset",
  },
  it: {
    presets: "Parti da un esempio", presetNote: "Dati di esempio, non prezzi di mercato: sostituiscili con quelli del tuo titolo.",
    names: { btp: "BTP", bund: "Bund tedesco", oat: "OAT francese", ust: "Treasury USA", gilt: "Gilt britannico" },
    share: "Copia il link a questo risultato", copied: "Link copiato", shareNote: "L'indirizzo si aggiorna mentre scrivi: puoi salvarlo nei preferiti, inviarlo o aggiungerlo alla schermata Home.", reset: "Azzera",
  },
  fr: {
    presets: "Partir d'un exemple", presetNote: "Données d'exemple, pas des cours de marché : remplacez-les par celles de votre obligation.",
    names: { btp: "BTP italien", bund: "Bund allemand", oat: "OAT", ust: "Treasury américain", gilt: "Gilt britannique" },
    share: "Copier le lien de ce résultat", copied: "Lien copié", shareNote: "L'adresse se met à jour pendant la saisie : enregistrez-la en favori, envoyez-la ou ajoutez-la à l'écran d'accueil.", reset: "Réinitialiser",
  },
  de: {
    presets: "Mit einem Beispiel starten", presetNote: "Nur Beispielwerte, keine aktuellen Kurse: ersetzen Sie sie durch die Daten Ihrer Anleihe.",
    names: { btp: "BTP (Italien)", bund: "Bundesanleihe", oat: "OAT (Frankreich)", ust: "US-Treasury", gilt: "Gilt (UK)" },
    share: "Link zu diesem Ergebnis kopieren", copied: "Link kopiert", shareNote: "Die Adresse aktualisiert sich beim Tippen: als Lesezeichen speichern, weiterschicken oder zum Home-Bildschirm hinzufügen.", reset: "Zurücksetzen",
  },
};

const note = {
  en: "<p><em>Educational information only, not a personal recommendation. Tax rules change and depend on your situation: check the official source.</em></p>",
  it: "<p><em>Informazioni a scopo educativo, non una raccomandazione personalizzata. Le regole fiscali cambiano e dipendono dalla tua situazione: verifica la fonte ufficiale.</em></p>",
  fr: "<p><em>Informations à visée pédagogique, pas une recommandation personnalisée. Les règles fiscales évoluent et dépendent de votre situation : vérifiez la source officielle.</em></p>",
  de: "<p><em>Nur zur Information und Bildung, keine persönliche Empfehlung. Steuerregeln ändern sich und hängen von Ihrer Situation ab: bitte offizielle Quelle prüfen.</em></p>",
};

export const CALC_EXTRA_HTML: Record<CalcLocale, string> = {
  en: `
<h2 id="how-to-use">How to use the calculator in four steps</h2>
<ol>
<li><strong>Price.</strong> Enter the clean price, the one quoted on your broker's screen, as a number per 100 of face value. A bond at 98.5 costs 985 for every 1,000 of face value, before accrued interest.</li>
<li><strong>Coupon and frequency.</strong> Enter the annual coupon in percent and how often it is paid. US Treasury notes and gilts pay twice a year, Bunds and OATs once, some corporate bonds four times.</li>
<li><strong>Dates.</strong> The purchase date defaults to today. Pick the maturity date from the bond's terms.</li>
<li><strong>Tax (optional).</strong> Type your own rate to see the yield after tax. Leave it empty for the gross figure.</li>
</ol>
<p>The result updates as you type and so does the address of this page, so any result can be saved, bookmarked or sent to someone as a link.</p>
<h2 id="worked-example">A worked example</h2>
<p>Take a bond with a 3% annual coupon, five years to run, bought at 95 on a coupon date. Each year it pays 3 per 100, and at maturity it returns 100, five points more than you paid. The calculator gives a yield to maturity of <strong>4.13%</strong> a year, against a current yield (coupon divided by price) of 3.16%. The gap is the discount you collect at the end, spread over the years.</p>
<p>Now type a 26% tax rate: the yield after tax falls to <strong>3.07%</strong>. Type 12.5% and it is 3.62%. Same bond, same price, more than half a point of difference, which is why the tax line is not decoration. Neither rate is a suggestion: they are examples of the rate you would type in yourself.</p>
<table><thead><tr><th scope="col">Price (3% coupon, 5 years)</th><th scope="col">Current yield</th><th scope="col">Yield to maturity</th></tr></thead><tbody>
<tr><td>95</td><td>3.16%</td><td>4.13%</td></tr>
<tr><td>100</td><td>3.00%</td><td>3.00%</td></tr>
</tbody></table>
<h2 id="clean-dirty">Clean price, dirty price and accrued interest</h2>
<p>Bond screens quote the <strong>clean price</strong>, which leaves out the interest earned since the last coupon. What you actually pay is the <strong>dirty price</strong>: clean price plus accrued interest. The calculator shows both. Buy a 3.5% semi-annual bond two months before a coupon date and roughly 1.16 points of the price you pay is accrued interest that the seller earned and that you will receive back with the next coupon. If you want to read more, see <a href="/knowledge/clean-vs-dirty-bond-price">clean and dirty price explained</a>.</p>
<h2 id="current-yield">Current yield versus yield to maturity</h2>
<p>Current yield divides the coupon by the price and stops there. It ignores the pull-to-par: a bond at 95 will be worth 100 at maturity, and that is part of what you earn. Yield to maturity includes it. The two agree only when the price is 100. The guide on <a href="/knowledge/current-yield-vs-yield-to-maturity">current yield and yield to maturity</a> goes through the differences.</p>
<h2 id="limits">What the calculator does not do</h2>
<ul>
<li>It assumes the issuer pays every coupon and repays at maturity. It says nothing about credit risk.</li>
<li>It does not handle callable, floating-rate or inflation-linked bonds, where the cash flows are not fixed.</li>
<li>It assumes coupons on the anniversaries of the maturity date and a simple ACT/ACT day count; a broker's figure can differ in the second decimal.</li>
<li>Tax is simplified: coupons and the gain at maturity at one rate, no offsetting of losses.</li>
</ul>
<h2 id="faq">Frequently asked questions</h2>
<h3>What is a bond yield calculator?</h3>
<p>A bond yield calculator turns a bond's price, coupon and maturity into one annual rate, the yield to maturity, so bonds with different coupons and prices can be compared on the same scale.</p>
<h3>How do I calculate yield to maturity?</h3>
<p>Yield to maturity is the annual rate at which the present value of all remaining coupons and the final repayment equals the price paid. It has no closed formula and is found by trial and error, which is what this calculator does in your browser.</p>
<h3>What is the difference between yield to maturity and current yield?</h3>
<p>Current yield is the annual coupon divided by the price. Yield to maturity also counts the gain or loss between the price paid and the repayment at maturity, and the timing of every payment.</p>
<h3>Does the calculator work for Treasury notes, gilts, Bunds and BTPs?</h3>
<p>Yes, for any fixed-coupon bond: enter its price, coupon, payment frequency and maturity. Use the example buttons to start with typical conventions, then replace the numbers with your bond's.</p>
<h3>How is yield after tax calculated?</h3>
<p>Each coupon is reduced by the tax rate you type, and at maturity a gain over the purchase price is taxed at the same rate. Losses are not offset. The result is an estimate, not tax advice.</p>
<h3>Is my data stored?</h3>
<p>No. The calculation runs in your browser. The only trace is the address of the page, which holds your inputs so you can share or bookmark a result.</p>
<h2 id="related">Related guides</h2>
<ul>
<li><a href="/knowledge/yield-to-maturity">How to calculate yield to maturity</a></li>
<li><a href="/knowledge/current-yield-vs-yield-to-maturity">Current yield vs yield to maturity</a></li>
<li><a href="/knowledge/clean-vs-dirty-bond-price">Clean price vs dirty price</a></li>
<li><a href="/knowledge/bond-yield-after-tax">Bond yield after tax</a></li>
<li><a href="/knowledge/treasury-yield-calculator">Treasury yield calculator</a></li>
<li><a href="/knowledge/bond-yield-calculator-excel">Bond yield in Excel and Google Sheets</a></li>
</ul>
`.trim() + note.en,
  it: `
<h2 id="come-si-usa">Come usare il calcolatore in quattro passi</h2>
<ol>
<li><strong>Prezzo.</strong> Inserisci il prezzo secco, quello che vedi sullo schermo del broker, per 100 di valore nominale. Un titolo a 98,5 costa 985 euro ogni 1.000 di nominale, rateo escluso.</li>
<li><strong>Cedola e frequenza.</strong> Indica la cedola annua in percentuale e ogni quanto viene pagata: i BTP la pagano ogni sei mesi, Bund e OAT una volta l'anno.</li>
<li><strong>Date.</strong> La data di acquisto è oggi. Scegli la scadenza dal regolamento del titolo.</li>
<li><strong>Tasse (facoltativo).</strong> Scrivi la tua aliquota per vedere il rendimento netto; lasciala vuota per il lordo.</li>
</ol>
<p>Il risultato si aggiorna mentre scrivi, e con lui l'indirizzo della pagina: puoi salvarlo nei preferiti, aggiungerlo alla schermata Home o mandarlo a qualcuno come link.</p>
<h2 id="esempio-svolto">Un esempio svolto</h2>
<p>Un titolo con cedola annua del 3%, cinque anni alla scadenza, comprato a 95 il giorno di una cedola. Ogni anno paga 3 ogni 100 e a scadenza rimborsa 100, cinque punti più di quanto hai speso. Il calcolatore dà un rendimento a scadenza del <strong>4,13%</strong> annuo, contro un rendimento corrente (cedola diviso prezzo) del 3,16%. La differenza è lo sconto che incassi alla fine, spalmato sugli anni.</p>
<p>Con un'aliquota del 26% il rendimento netto scende al <strong>3,07%</strong>; con il 12,5% è il 3,62%. Stesso titolo, stesso prezzo, mezzo punto e più di differenza: la riga delle tasse non è un soprammobile. Le aliquote sono esempi di quello che scriveresti tu, non un suggerimento.</p>
<table><thead><tr><th scope="col">Prezzo (cedola 3%, 5 anni)</th><th scope="col">Rendimento corrente</th><th scope="col">Rendimento a scadenza</th></tr></thead><tbody>
<tr><td>95</td><td>3,16%</td><td>4,13%</td></tr>
<tr><td>100</td><td>3,00%</td><td>3,00%</td></tr>
</tbody></table>
<h2 id="secco-tel-quel">Prezzo secco, prezzo tel quel e rateo</h2>
<p>Gli schermi quotano il <strong>prezzo secco</strong>, che non include gli interessi maturati dall'ultima cedola. Quello che paghi davvero è il prezzo <strong>tel quel</strong>: prezzo secco più rateo. Il calcolatore mostra entrambi. Compra un titolo al 3,5% semestrale due mesi prima della cedola e circa 1,16 punti di quanto spendi sono rateo, maturato dal venditore e restituito a te con la prossima cedola. Per approfondire: <a href="/it/guide/prezzo-secco-tel-quel-rateo">prezzo secco, tel quel e rateo</a>.</p>
<h2 id="corrente-scadenza">Rendimento corrente e rendimento a scadenza</h2>
<p>Il rendimento corrente divide la cedola per il prezzo e si ferma lì. Ignora il ritorno alla pari: un titolo a 95 varrà 100 a scadenza, e anche questo è parte del guadagno. Il rendimento a scadenza lo include. I due coincidono solo se il prezzo è 100. La guida sul <a href="/it/guide/rendimento-a-scadenza">rendimento a scadenza</a> entra nei dettagli.</p>
<h2 id="limiti">Cosa non fa il calcolatore</h2>
<ul>
<li>Presume che l'emittente paghi tutte le cedole e rimborsi a scadenza: non dice nulla sul rischio di credito.</li>
<li>Non gestisce titoli callable, a tasso variabile o indicizzati all'inflazione, dove i flussi non sono fissi.</li>
<li>Calcola le cedole a ritroso dalla scadenza con un conteggio ACT/ACT semplificato: il dato del tuo broker può differire alla seconda cifra decimale.</li>
<li>Le tasse sono semplificate: cedole e plusvalenza a scadenza con un'unica aliquota, senza compensare le minusvalenze.</li>
</ul>
<h2 id="faq">Domande frequenti</h2>
<h3>Come si calcola il rendimento di un'obbligazione?</h3>
<p>Servono prezzo, cedola e scadenza. Il rendimento a scadenza è il tasso annuo che rende il prezzo pagato uguale al valore attuale di tutte le cedole future e del rimborso. Non esiste una formula diretta: il calcolatore lo trova per tentativi, nel tuo browser.</p>
<h3>Che differenza c'è tra rendimento corrente e rendimento a scadenza?</h3>
<p>Il rendimento corrente è la cedola annua divisa per il prezzo. Il rendimento a scadenza considera anche la differenza tra prezzo pagato e rimborso e il momento di ogni pagamento.</p>
<h3>Come si calcola il rendimento netto di un BTP?</h3>
<p>Inserisci prezzo, cedola e scadenza, poi scrivi la tua aliquota: ogni cedola viene ridotta della tassa e a scadenza l'eventuale guadagno rispetto al prezzo d'acquisto è tassato alla stessa aliquota. È una stima, non una consulenza fiscale.</p>
<h3>Il calcolatore va bene per BTP, Bund, OAT e Treasury?</h3>
<p>Sì, per ogni obbligazione a cedola fissa. Usa i pulsanti di esempio per partire dalle convenzioni tipiche, poi sostituisci i numeri con quelli del tuo titolo.</p>
<h3>I miei dati vengono salvati?</h3>
<p>No. Il calcolo avviene nel tuo browser. L'unica traccia è l'indirizzo della pagina, che contiene i dati inseriti così puoi condividere o salvare un risultato.</p>
<h2 id="related">Guide correlate</h2>
<ul>
<li><a href="/it/guide/calcolatore-rendimento-obbligazioni">Calcolatore rendimento obbligazioni</a></li>
<li><a href="/it/guide/calcolo-rendimento-btp">Calcolo rendimento BTP</a></li>
<li><a href="/it/guide/rendimento-netto-obbligazioni">Rendimento netto delle obbligazioni</a></li>
<li><a href="/it/guide/prezzo-secco-tel-quel-rateo">Prezzo secco, tel quel e rateo</a></li>
<li><a href="/it/guide/rendimento-a-scadenza">Rendimento a scadenza</a></li>
</ul>
`.trim() + note.it,
  fr: `
<h2 id="mode-emploi">Mode d'emploi en quatre étapes</h2>
<ol>
<li><strong>Prix.</strong> Saisissez le prix pied de coupon, celui affiché par votre courtier, pour 100 de nominal. Une obligation à 98,5 coûte 985 euros pour 1 000 de nominal, coupon couru exclu.</li>
<li><strong>Coupon et fréquence.</strong> Indiquez le coupon annuel en pourcentage et sa périodicité : les OAT et les Bund paient une fois par an, les BTP et les Treasuries deux fois.</li>
<li><strong>Dates.</strong> La date d'achat est aujourd'hui. Choisissez l'échéance dans les caractéristiques du titre.</li>
<li><strong>Impôt (facultatif).</strong> Saisissez votre propre taux pour voir le rendement net ; laissez vide pour le brut.</li>
</ol>
<p>Le résultat se met à jour pendant la saisie, et l'adresse de la page avec lui : enregistrez-la en favori, ajoutez-la à l'écran d'accueil ou envoyez-la.</p>
<h2 id="exemple">Un exemple chiffré</h2>
<p>Une obligation à coupon annuel de 3 %, cinq ans à courir, achetée 95 un jour de détachement de coupon. Chaque année, elle verse 3 pour 100 et rembourse 100 à l'échéance, soit cinq points de plus que le prix payé. Le calculateur donne un rendement actuariel de <strong>4,13 %</strong> par an, contre un rendement courant (coupon divisé par le prix) de 3,16 %. L'écart, c'est la décote encaissée à la fin, étalée sur les années.</p>
<p>Avec un taux d'imposition de 26 %, le rendement net tombe à <strong>3,07 %</strong> ; à 12,5 %, il est de 3,62 %. Même titre, même prix, plus d'un demi-point d'écart : la ligne « impôt » n'est pas décorative. Ces taux ne sont pas des suggestions, seulement des exemples de ce que vous saisiriez vous-même.</p>
<table><thead><tr><th scope="col">Prix (coupon 3 %, 5 ans)</th><th scope="col">Rendement courant</th><th scope="col">Rendement actuariel</th></tr></thead><tbody>
<tr><td>95</td><td>3,16 %</td><td>4,13 %</td></tr>
<tr><td>100</td><td>3,00 %</td><td>3,00 %</td></tr>
</tbody></table>
<h2 id="pied-de-coupon">Prix pied de coupon, prix coupon couru inclus</h2>
<p>Les écrans affichent le <strong>prix pied de coupon</strong>, qui exclut les intérêts courus depuis le dernier coupon. Ce que vous payez est le prix <strong>coupon couru inclus</strong>. Le calculateur affiche les deux. Achetez une obligation à 3,5 % semestrielle deux mois avant le coupon : environ 1,16 point du prix payé est du coupon couru, gagné par le vendeur et qui vous revient avec le prochain coupon. Détails dans notre guide <a href="/fr/guides/prix-pied-de-coupon-coupon-couru">prix pied de coupon et coupon couru</a>.</p>
<h2 id="courant-actuariel">Rendement courant ou rendement actuariel</h2>
<p>Le rendement courant divise le coupon par le prix, et s'arrête là. Il ignore le retour au pair : une obligation à 95 vaudra 100 à l'échéance, et cela fait partie du gain. Le rendement actuariel l'inclut. Les deux ne coïncident que si le prix est 100. Voir aussi <a href="/fr/guides/calcul-rendement-obligation">comment calculer le rendement d'une obligation</a>.</p>
<h2 id="limites">Ce que le calculateur ne fait pas</h2>
<ul>
<li>Il suppose que l'émetteur paie tous les coupons et rembourse à l'échéance : rien sur le risque de crédit.</li>
<li>Il ne traite pas les obligations remboursables par anticipation, à taux variable ou indexées sur l'inflation.</li>
<li>Les dates de coupon sont calculées à rebours depuis l'échéance, avec un décompte ACT/ACT simplifié : le chiffre de votre courtier peut différer à la deuxième décimale.</li>
<li>L'impôt est simplifié : coupons et gain à l'échéance à un seul taux, sans imputation des moins-values.</li>
</ul>
<h2 id="faq">Questions fréquentes</h2>
<h3>Comment calculer le rendement d'une obligation ?</h3>
<p>Il faut le prix, le coupon et l'échéance. Le rendement actuariel est le taux annuel qui égalise le prix payé et la valeur actuelle des coupons et du remboursement. Il n'existe pas de formule directe : le calculateur le trouve par approximations successives, dans votre navigateur.</p>
<h3>Quelle différence entre rendement courant et rendement actuariel ?</h3>
<p>Le rendement courant est le coupon annuel divisé par le prix. Le rendement actuariel tient aussi compte de l'écart entre prix payé et remboursement, et de la date de chaque versement.</p>
<h3>Le calculateur convient-il aux OAT, Bund, BTP et Treasuries ?</h3>
<p>Oui, pour toute obligation à coupon fixe. Servez-vous des boutons d'exemple pour partir de conventions typiques, puis remplacez les chiffres par ceux de votre titre.</p>
<h3>Mes données sont-elles enregistrées ?</h3>
<p>Non. Le calcul se fait dans votre navigateur. La seule trace est l'adresse de la page, qui contient vos données pour que vous puissiez partager ou enregistrer un résultat.</p>
<h2 id="related">Guides liés</h2>
<ul>
<li><a href="/fr/guides/calculateur-rendement-obligation">Calculateur de rendement d'obligation</a></li>
<li><a href="/fr/guides/prix-pied-de-coupon-coupon-couru">Prix pied de coupon et coupon couru</a></li>
<li><a href="/fr/guides/rendement-net-obligation">Rendement net d'une obligation</a></li>
<li><a href="/fr/guides/calcul-rendement-obligation">Calcul du rendement d'une obligation</a></li>
</ul>
`.trim() + note.fr,
  de: `
<h2 id="anleitung">So funktioniert der Rechner in vier Schritten</h2>
<ol>
<li><strong>Kurs.</strong> Geben Sie den Clean Price ein, wie ihn Ihr Broker anzeigt, je 100 Nennwert. Ein Kurs von 98,5 bedeutet 985 Euro je 1.000 Nennwert, ohne Stückzinsen.</li>
<li><strong>Kupon und Rhythmus.</strong> Tragen Sie den Jahreskupon in Prozent ein und wie oft er gezahlt wird: Bundesanleihen und OAT einmal im Jahr, BTP und US-Treasuries zweimal.</li>
<li><strong>Datum.</strong> Das Kaufdatum ist heute. Die Fälligkeit steht in den Anleihebedingungen.</li>
<li><strong>Steuer (optional).</strong> Geben Sie Ihren eigenen Satz ein, um die Rendite nach Steuern zu sehen; leer lassen für brutto.</li>
</ol>
<p>Das Ergebnis aktualisiert sich beim Tippen, ebenso die Adresse der Seite: Sie können sie als Lesezeichen speichern, zum Home-Bildschirm hinzufügen oder verschicken.</p>
<h2 id="rechenbeispiel">Ein Rechenbeispiel</h2>
<p>Eine Anleihe mit 3 % Jahreskupon, fünf Jahre Laufzeit, gekauft zu 95 an einem Kupontermin. Jedes Jahr fließen 3 je 100, am Ende werden 100 zurückgezahlt, fünf Punkte mehr als Sie bezahlt haben. Der Rechner zeigt eine Rendite bis Fälligkeit von <strong>4,13 %</strong> pro Jahr, die laufende Rendite (Kupon geteilt durch Kurs) liegt bei 3,16 %. Die Lücke ist der Abschlag, den Sie am Ende einstreichen, auf die Jahre verteilt.</p>
<p>Mit 26 % Steuersatz sinkt die Rendite nach Steuern auf <strong>3,07 %</strong>; mit 12,5 % sind es 3,62 %. Gleiche Anleihe, gleicher Kurs, mehr als ein halber Prozentpunkt Unterschied: Die Steuerzeile ist keine Dekoration. Die Sätze sind keine Empfehlung, nur Beispiele für das, was Sie selbst eintragen würden.</p>
<table><thead><tr><th scope="col">Kurs (Kupon 3 %, 5 Jahre)</th><th scope="col">Laufende Rendite</th><th scope="col">Rendite bis Fälligkeit</th></tr></thead><tbody>
<tr><td>95</td><td>3,16 %</td><td>4,13 %</td></tr>
<tr><td>100</td><td>3,00 %</td><td>3,00 %</td></tr>
</tbody></table>
<h2 id="clean-dirty">Clean Price, Dirty Price und Stückzinsen</h2>
<p>Auf den Kursseiten steht der <strong>Clean Price</strong>, ohne die seit dem letzten Kupon aufgelaufenen Zinsen. Bezahlen müssen Sie den <strong>Dirty Price</strong>: Clean Price plus Stückzinsen. Der Rechner zeigt beide. Kaufen Sie eine halbjährlich zahlende 3,5-%-Anleihe zwei Monate vor dem Kupontermin, sind rund 1,16 Punkte des gezahlten Preises Stückzinsen, die der Verkäufer verdient hat und die Sie mit dem nächsten Kupon zurückbekommen. Mehr dazu im Ratgeber <a href="/de/ratgeber/stueckzinsen-clean-price-dirty-price">Stückzinsen, Clean Price und Dirty Price</a>.</p>
<h2 id="laufende-rendite">Laufende Rendite oder Rendite bis Fälligkeit</h2>
<p>Die laufende Rendite teilt den Kupon durch den Kurs und hört dort auf. Die Rückkehr zum Nennwert ignoriert sie: Eine Anleihe bei 95 ist bei Fälligkeit 100 wert, und das gehört zum Ertrag. Die Rendite bis Fälligkeit enthält es. Beide stimmen nur bei einem Kurs von 100 überein. Mehr im Ratgeber <a href="/de/ratgeber/rendite-bis-faelligkeit">Rendite bis Fälligkeit</a>.</p>
<h2 id="grenzen">Was der Rechner nicht kann</h2>
<ul>
<li>Er unterstellt, dass der Emittent alle Kupons zahlt und bei Fälligkeit zurückzahlt: Zum Kreditrisiko sagt er nichts.</li>
<li>Kündbare, variabel verzinste oder inflationsindexierte Anleihen mit unfesten Zahlungen deckt er nicht ab.</li>
<li>Die Kupontermine werden rückwärts ab Fälligkeit gerechnet, mit vereinfachter ACT/ACT-Zählung: Die Zahl Ihres Brokers kann in der zweiten Nachkommastelle abweichen.</li>
<li>Die Steuer ist vereinfacht: Kupons und Kursgewinn bei Fälligkeit mit einem Satz, ohne Verlustverrechnung.</li>
</ul>
<h2 id="faq">Häufige Fragen</h2>
<h3>Wie berechnet man die Rendite einer Anleihe?</h3>
<p>Nötig sind Kurs, Kupon und Fälligkeit. Die Rendite bis Fälligkeit ist der Jahreszins, bei dem der gezahlte Kurs dem Barwert aller künftigen Kupons und der Rückzahlung entspricht. Eine direkte Formel gibt es nicht: Der Rechner findet sie durch Probieren, in Ihrem Browser.</p>
<h3>Was ist der Unterschied zwischen laufender Rendite und Rendite bis Fälligkeit?</h3>
<p>Die laufende Rendite ist der Jahreskupon geteilt durch den Kurs. Die Rendite bis Fälligkeit berücksichtigt zusätzlich den Unterschied zwischen Kaufkurs und Rückzahlung sowie den Zeitpunkt jeder Zahlung.</p>
<h3>Funktioniert der Rechner für Bundesanleihen, OAT, BTP und Treasuries?</h3>
<p>Ja, für jede Anleihe mit festem Kupon. Starten Sie mit den Beispielknöpfen und ersetzen Sie die Zahlen durch die Ihrer Anleihe.</p>
<h3>Werden meine Daten gespeichert?</h3>
<p>Nein. Die Rechnung läuft in Ihrem Browser. Die einzige Spur ist die Adresse der Seite, die Ihre Eingaben enthält, damit Sie ein Ergebnis teilen oder speichern können.</p>
<h2 id="related">Verwandte Ratgeber</h2>
<ul>
<li><a href="/de/ratgeber/anleihe-rendite-rechner">Anleihe Rendite Rechner</a></li>
<li><a href="/de/ratgeber/stueckzinsen-clean-price-dirty-price">Stückzinsen, Clean Price und Dirty Price</a></li>
<li><a href="/de/ratgeber/anleihe-rendite-nach-steuern">Anleihe-Rendite nach Steuern</a></li>
<li><a href="/de/ratgeber/rendite-bis-faelligkeit">Rendite bis Fälligkeit</a></li>
</ul>
`.trim() + note.de,
};
