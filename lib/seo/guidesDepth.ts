// Extra sections for the short German and French guides (27 Oct 2026), so each one has real depth: 600+ words in the
// server HTML and at least three H2 sections. They are added to the stored text once (see store.ts), before the FAQ
// or the closing call to action. Information only: no advice, no new figures.

import type { Locale } from "./locales";

export type DepthExtra = { locale: Locale; slug: string; html: string };

/** Puts the extra sections before the FAQ when there is one, else before the closing call to action, else at the end. */
export function withDepth(body: string, extra: string): string {
  const at = [body.indexOf('<h2 id="faq">'), body.lastIndexOf("<p><strong>")].find((i) => i >= 0);
  return at === undefined ? `${body}\n${extra}` : `${body.slice(0, at)}${extra}\n${body.slice(at)}`;
}

/** Title and description fixes so every published guide passes the length and keyword checks. */
export const META_FIXES: { locale: Locale; slug: string; seoTitle?: string; metaDescription?: string }[] = [
  { locale: "fr", slug: "risque-de-credit-obligataire", seoTitle: "Risque de crédit obligation : comment l'évaluer" },
  { locale: "fr", slug: "oat-obligations-etat", seoTitle: "Obligations d'État françaises : OAT, rendement, risques" },
  { locale: "fr", slug: "probabilite-defaut-notation", metaDescription: "Probabilité historique de défaut par notation, de AAA à CCC : BBB, 1,40 % à 5 ans et 3,40 % à 10 ans (moyennes de long terme)." },
  { locale: "de", slug: "ausfallwahrscheinlichkeit-rating", metaDescription: "Historische Ausfallraten nach Rating, AAA bis CCC: BBB-Emittenten fielen in 1,40 % der Fälle binnen 5 und 3,40 % binnen 10 Jahren aus (Langzeitschnitt)." },
];

export const DEPTH_EXTRAS: DepthExtra[] = [
  {
    locale: "de",
    slug: "kreditrisiko-anleihen",
    html: `<h2 id="kennzahlen">Was Analysten hinter dem Rating prüfen</h2>
<p>Wer hinter die Note schaut, landet schnell in der Bilanz. Drei Fragen kehren dabei immer wieder. Wie hoch ist die <strong>Verschuldung</strong> im Verhältnis zum Gewinn vor Zinsen, Steuern und Abschreibungen? Reicht der laufende Gewinn, um die <strong>Zinsen</strong> mehrfach zu bezahlen? Und wann werden die <strong>Schulden fällig</strong>? Ein Unternehmen, das in einem Jahr gleich mehrere große Anleihen zurückzahlen muss, ist auf offene Kapitalmärkte angewiesen; wenn die gerade schlechte Laune haben, wird es ungemütlich.</p>
<p>Für Privatanleger sind diese Zahlen mühsam zu beschaffen. Das Rating und der Spread fassen sie zusammen, ohne sie zu ersetzen: Beide sind Abkürzungen, und Abkürzungen führen manchmal an einem Schlagloch vorbei und manchmal mitten hinein.</p>
<h2 id="bedingungen">Das Kleingedruckte der Anleihe</h2>
<p>Zwei Anleihen desselben Unternehmens können sich im Risiko deutlich unterscheiden. Die Anleihebedingungen legen fest, ob die Anleihe <strong>vorrangig oder nachrangig</strong> ist, ob sie besichert ist und ob der Emittent sie vorzeitig <strong>kündigen</strong> darf. Manche Bedingungen enthalten sogenannte <em>Covenants</em>, also Auflagen wie Obergrenzen für weitere Schulden. Andere sehen bei einer Übernahme eine Sonderkündigung vor. Wer nur auf die Rendite schaut, überliest diese Seiten gern, obwohl sie im Ernstfall über die Rangfolge der Gläubiger entscheiden.</p>
<h2 id="zeit">Zeit ist Risiko</h2>
<p>Je länger die Laufzeit, desto mehr Zeit hat ein Emittent, in Schwierigkeiten zu geraten. Historische Ausfallraten steigen deshalb mit der Laufzeit; wie stark, zeigt unser Ratgeber zur <a href="/de/ratgeber/ausfallwahrscheinlichkeit-rating">Ausfallwahrscheinlichkeit nach Rating</a>. Zwei Anleihen mit gleichem Rating, aber fünf und fünfzehn Jahren Laufzeit, tragen darum nicht dasselbe Kreditrisiko, und ihre Renditen sollten das widerspiegeln.</p>
<h2 id="grenzen">Was sich nicht berechnen lässt</h2>
<p>Kein Modell sieht alles voraus. Ein Skandal, eine Übernahme oder eine neue Regulierung kann die Lage eines Emittenten über Nacht ändern, und die Ratingagenturen reagieren darauf oft erst im Nachhinein. Wer Kreditrisiko verstehen will, sollte es deshalb als Wahrscheinlichkeit begreifen und nicht als Urteil: Ein niedriges Risiko ist keine Garantie, und ein hohes Risiko ist kein Todesurteil. Es ist der Grund, warum Streuung die einzige Absicherung ist, die ohne Prognose auskommt.</p>`,
  },
  {
    locale: "de",
    slug: "staatsanleihen-oder-unternehmensanleihen",
    html: `<h2 id="unterschiede">Was Staaten und Unternehmen grundsätzlich unterscheidet</h2>
<p>Ein Staat kann Steuern erheben, eine eigene Zentralbank im Rücken haben und notfalls Schulden umstrukturieren; ein Unternehmen kann nur verkaufen, was Kunden kaufen. Das erklärt, warum Staaten mit eigener Währung und stabilen Institutionen traditionell als sicherer gelten. Innerhalb des Euroraums zeigt der Markt allerdings sehr deutlich, dass auch Staaten nicht gleich sind: Zwischen Deutschland und anderen Euroländern liegt oft ein spürbarer Renditeabstand.</p>
<h2 id="ausfall">Wie sich ein Ausfall unterscheidet</h2>
<p>Geht ein Unternehmen pleite, folgt ein Insolvenzverfahren, an dessen Ende die Gläubiger je nach Rang einen Teil ihres Geldes zurückbekommen. Bei Staaten gibt es kein vergleichbares Verfahren; Umschuldungen werden verhandelt und dauern. Beides ist für Anleger unerfreulich, aber unterschiedlich: Das eine ist ein klar geregelter Ablauf, das andere ein diplomatisches Ereignis mit offenem Ausgang.</p>
<h2 id="steuer">Steuer und Kosten</h2>
<p>Bei der Besteuerung macht das deutsche Steuerrecht zwischen Staats- und Unternehmensanleihen im Depot keinen Unterschied: Zinsen und Kursgewinne unterliegen der Abgeltungsteuer. Die Unterschiede liegen eher bei den Kosten. Kleine Unternehmensanleihen haben oft größere Spannen zwischen Kauf- und Verkaufskurs, und manche haben eine hohe Mindeststückelung. Beides schmälert die Rendite, die auf dem Bildschirm steht.</p>
<h2 id="zusammenfassung">Wie sich der Vergleich zusammenfassen lässt</h2>
<p>Staatsanleihen bieten in der Regel niedrigere Renditen, hohe Handelbarkeit und ein geringes Kreditrisiko. Unternehmensanleihen bieten im Durchschnitt höhere Renditen, dafür mehr Kreditrisiko und je nach Emission weniger Liquidität. Welche Mischung zu einem Anlagehorizont passt, ist eine persönliche Frage; ein Vergleich bei gleicher Laufzeit und mit Blick auf Rating und Streuung macht sie zumindest beantwortbar.</p>
<h2 id="fehler">Typische Denkfehler beim Vergleich</h2>
<p>Der häufigste Fehler ist, Renditen verschiedener Laufzeiten nebeneinanderzulegen. Der zweite ist, nur auf die Zahl zu schauen und die Frage zu überspringen, warum sie so hoch oder niedrig ist. Der dritte ist, ein Rating wie eine Garantie zu lesen. Wer diese drei Stolpersteine kennt, vergleicht schon besser als der Durchschnitt. Hilfreich ist auch, nicht eine Anleihe gegen eine andere zu stellen, sondern ganze Gruppen: alle Euro-Staatsanleihen einer Laufzeit gegen alle Unternehmensanleihen derselben Laufzeit.</p>`,
  },
  {
    locale: "de",
    slug: "bundesanleihen",
    html: `<h2 id="emission">Wie Bundeswertpapiere ausgegeben werden</h2>
<p>Der Bund bringt seine Papiere nicht einzeln an den Mann, sondern über regelmäßige <strong>Auktionen</strong>, an denen ein Kreis von Banken teilnimmt, den die Finanzagentur zugelassen hat. Die Banken verkaufen die Papiere an der Börse und im Freiverkehr weiter, und dort kaufen Privatanleger. Bestehende Anleihen werden oft aufgestockt, sodass von einer Anleihe mit demselben Kupon und derselben Fälligkeit riesige Volumina im Umlauf sind. Das macht sie so liquide. Der Preis dafür ist Langeweile, und die ist hier ein Merkmal, kein Mangel.</p>
<h2 id="inflation">Inflation: das stille Risiko</h2>
<p>Eine Bundesanleihe zahlt nominal fest: Der Kupon und der Rückzahlungsbetrag stehen bei Ausgabe fest, ihre Kaufkraft nicht. Steigen die Preise schneller als die Rendite, schrumpft der reale Ertrag. Gegen diesen Effekt gibt es inflationsindexierte Bundeswertpapiere, deren Rückzahlung an die Teuerung gekoppelt ist; sie sind ein eigenes Thema und lassen sich nicht einfach mit einer normalen Rendite vergleichen.</p>
<h2 id="nutzen">Wofür der Bund als Maßstab dient</h2>
<p>Banken und Analysten messen fast jede Euro-Anleihe am Bund. Die zehnjährige Bundrendite gilt als Referenz für die Zinsen im Euroraum, Hypothekenzinsen und Unternehmensanleihen orientieren sich an ihr. Wer in den Nachrichten hört, der „Spread“ habe sich ausgeweitet, meint meistens den Abstand zu diesem Punkt. Insofern lohnt auch für Anleger, die nie eine Bundesanleihe kaufen, ein Blick auf ihre Rendite: Sie ist die Temperatur des Marktes.</p>
<h2 id="handel">Handel und Kosten</h2>
<p>Bundeswertpapiere lassen sich an der Börse und bei vielen Brokern außerhalb der Börse handeln. Die Spanne zwischen Kauf- und Verkaufskurs ist bei gängigen Papieren sehr klein, bei weniger gehandelten Restlaufzeiten kann sie größer ausfallen. Hinzu kommen die Gebühren der Bank. Wer die Rendite zweier Papiere vergleicht, sollte diese Kosten mitrechnen, denn bei niedrigen Renditen fallen sie stärker ins Gewicht.</p>`,
  },
  {
    locale: "de",
    slug: "rendite-bis-faelligkeit",
    html: `<h2 id="grenzen">Wo die Kennzahl an ihre Grenzen stößt</h2>
<p>So nützlich die Rendite bis Fälligkeit ist, sie ist ein Versprechen unter Vorbehalt. Sie setzt voraus, dass alle Zahlungen wie geplant eintreffen, und sie sagt nichts darüber, wie sicher das ist. Eine hohe Rendite kann ein gutes Geschäft sein oder das Echo eines Marktes, der ein Problem erkannt hat. Deshalb gehört neben jede Rendite das Rating und neben jede Laufzeit die Frage, was bis dahin passieren kann.</p>
<h2 id="vergleich">Rendite richtig vergleichen</h2>
<p>Drei Regeln helfen. Erstens: Vergleichen Sie Anleihen in derselben Währung, sonst vergleichen Sie auch Wechselkurserwartungen. Zweitens: Vergleichen Sie bei ähnlicher Duration, denn eine Rendite mit zehn Jahren Zinsrisiko ist nicht dieselbe wie eine mit zwei. Drittens: Rechnen Sie brutto gegen brutto und netto gegen netto, damit nicht Steuern und Gebühren über den Sieger entscheiden.</p>
<h2 id="tabelle">Rendite und Kurs im Zusammenspiel</h2>
<p>Zwischen Kurs und Rendite besteht ein fester Zusammenhang: Steigt der Kurs, sinkt die Rendite, und umgekehrt. Das ist keine Magie, sondern Arithmetik: Zahlt man mehr für dieselben künftigen Zahlungen, verdient man prozentual weniger daran. Dieser Zusammenhang ist auch der Grund, warum Anleihekurse fallen, wenn die Marktzinsen steigen. Wie stark, zeigt die <a href="/de/ratgeber/duration-anleihen">Duration</a>.</p>`,
  },
  {
    locale: "de",
    slug: "anleihen-oder-festgeld",
    html: `<h2 id="beispiel">Ein Vergleich in Zahlen, ohne Zahlen zu erfinden</h2>
<p>Konkrete Zinssätze ändern sich täglich, deshalb hier nur die Logik. Festgeld bietet einen Zins, den die Bank für ihre Laufzeit festlegt. Eine Anleihe bietet eine Rendite, die vom Kurs abhängt, zu dem Sie kaufen. Wer beides vergleichen will, nimmt dieselbe Laufzeit, dieselbe Währung und rechnet in beiden Fällen brutto, dann erst Steuern. Alles andere ist ein Vergleich von Äpfeln mit Birnen, bei dem die Birne meistens gewinnt, weil sie hübscher fotografiert ist.</p>
<h2 id="flexibilitaet">Flexibilität im Alltag</h2>
<p>Das Geld auf einem Festgeldkonto ist verplant, Anleihen sind verkäuflich. Das klingt nach einem klaren Vorteil, hat aber einen Haken: Verkauft wird zum Marktpreis, nicht zum Wunschpreis. Für Anleger, die ihr Geld bis zur Fälligkeit nicht brauchen, spielt das keine Rolle. Wer dagegen mit einem plötzlichen Finanzbedarf rechnet, sollte genau das bei der Laufzeit mitdenken.</p>
<h2 id="mix">Beides im selben Plan</h2>
<p>Festgeld und Anleihen schließen sich nicht aus. Viele Sparer halten ihre kurzfristige Reserve auf Konto oder Festgeld und nutzen Anleihen für Beträge, die länger entbehrlich sind. Entscheidend ist, dass jede Position eine Aufgabe hat: Die Reserve soll verfügbar sein, die Anleihe soll über ihre Laufzeit Zinsen bringen. Wer das trennt, vermeidet, eine Anleihe vor Fälligkeit verkaufen zu müssen.</p>`,
  },
  {
    locale: "de",
    slug: "franzoesische-staatsanleihen-kaufen",
    html: `<h2 id="vergleich-bund">OAT und Bundesanleihe im Vergleich</h2>
<p>Beide sind Staatsanleihen im Euro, beide haben feste Kupons, beide sind an der Börse handelbar. Der Unterschied ist der Schuldner: Deutschland gilt als der Sicherheitsanker, Frankreich als sehr solide, aber mit etwas höherem Risiko. Der Markt bewertet das täglich, und zwar in Form des Renditeabstands. Wer schaut, wie sich dieser Abstand über die Zeit verändert, bekommt ein Gefühl dafür, wann der Markt gelassen und wann er nervös ist.</p>
<h2 id="kosten">Mindestanlage und Kosten</h2>
<p>Wie klein oder groß eine Order sein darf, bestimmen der Börsenplatz und der Broker, nicht Frankreich. Wer mit kleinen Beträgen arbeitet, sollte deshalb vor der Order prüfen, ob Gebühren und Kursspannen das Ergebnis spürbar schmälern. Eine Rendite von der Bildschirmanzeige und eine Rendite nach Kosten sind zwei verschiedene Zahlen, und nur die zweite landet auf dem Konto.</p>
<h2 id="blick">Worauf man bei der Auswahl schaut</h2>
<p>Bei OAT zählen dieselben Kennzahlen wie bei jeder Staatsanleihe: Restlaufzeit, Rendite bis Fälligkeit, Duration und der Abstand zu Bundesanleihen gleicher Laufzeit. Wer sie nebeneinanderlegt, sieht schnell, ob ein Aufschlag den Aufwand lohnt oder ob er nur die Gebühren auffrisst.</p>`,
  },
  {
    locale: "fr",
    slug: "risque-de-credit-obligataire",
    html: `<h2 id="analyse">Ce que les analystes regardent derrière la notation</h2>
<p>Qui gratte sous la note arrive vite au bilan, et trois questions reviennent à chaque fois. Quel est le niveau d'<strong>endettement</strong> par rapport aux bénéfices avant intérêts, impôts et amortissements ? Les bénéfices couvrent-ils plusieurs fois la <strong>charge d'intérêts</strong> ? Et quand les <strong>dettes arrivent-elles à échéance</strong> ? Une entreprise qui doit rembourser plusieurs grosses émissions la même année dépend de marchés ouverts, et les marchés n'ont pas toujours bon caractère.</p>
<p>Ces chiffres sont laborieux à réunir pour un particulier. La notation et le spread les résument sans les remplacer : ce sont des raccourcis, et un raccourci évite parfois un nid-de-poule, parfois non.</p>
<h2 id="conditions">Les petits caractères de l'émission</h2>
<p>Deux obligations d'un même émetteur peuvent porter des risques bien différents. Les conditions d'émission précisent si l'obligation est <strong>senior ou subordonnée</strong>, si elle est garantie et si l'émetteur peut la <strong>rembourser par anticipation</strong>. Certaines contiennent des engagements, les <em>covenants</em>, qui plafonnent par exemple l'endettement futur ; d'autres prévoient un remboursement en cas de changement de contrôle. Ces pages se lisent rarement, alors que, le jour où cela tourne mal, elles décident de l'ordre dans lequel on est payé.</p>
<h2 id="duree">Le temps, premier facteur de risque</h2>
<p>Plus l'échéance est lointaine, plus l'émetteur a le temps de rencontrer des difficultés, et les taux de défaut historiques augmentent avec la durée. Notre guide sur la <a href="/fr/guides/probabilite-defaut-notation">probabilité de défaut par notation</a> le montre chiffres à l'appui. Deux obligations de même note, l'une à cinq ans et l'autre à quinze, ne portent donc pas le même risque de crédit, et leurs rendements devraient le refléter.</p>`,
  },
  {
    locale: "fr",
    slug: "obligations-etat-ou-entreprise",
    html: `<h2 id="differences">Ce qui sépare fondamentalement un État d'une entreprise</h2>
<p>Un État peut lever l'impôt, s'appuyer sur sa banque centrale et, au pire, renégocier sa dette ; une entreprise ne peut que vendre ce que ses clients achètent. D'où la réputation de solidité des États aux institutions stables et à la monnaie propre. Au sein de la zone euro, le marché rappelle toutefois que les États ne se valent pas : l'écart de rendement entre l'Allemagne et d'autres pays de la zone est souvent bien visible.</p>
<h2 id="defaut">Un défaut ne se passe pas de la même façon</h2>
<p>Quand une entreprise fait faillite, une procédure collective s'ouvre, et les créanciers récupèrent une partie de leur argent selon leur rang. Pour un État, il n'existe pas de procédure comparable : la restructuration se négocie, et cela prend du temps. Les deux situations sont désagréables pour l'investisseur, mais pas de la même nature : l'une suit un cadre juridique précis, l'autre ressemble à un événement diplomatique à l'issue ouverte.</p>
<h2 id="fiscalite">Fiscalité et frais</h2>
<p>Sur un compte-titres, le fisc français ne distingue pas les obligations d'État des obligations d'entreprise : coupons et plus-values relèvent du même régime. Les différences se jouent plutôt sur les frais. Les petites émissions d'entreprise ont souvent un écart plus large entre prix d'achat et de vente, et certaines imposent une coupure minimale élevée. Les deux grignotent le rendement affiché à l'écran.</p>
<h2 id="synthese">En résumé</h2>
<p>Les obligations d'État offrent en général des rendements plus faibles, une grande liquidité et un risque de crédit limité. Les obligations d'entreprise offrent en moyenne des rendements plus élevés, avec davantage de risque de crédit et, selon l'émission, moins de liquidité. La bonne combinaison dépend d'un horizon personnel ; comparer à échéance égale, en regardant la notation et la diversification, permet au moins de poser correctement la question.</p>`,
  },
];
