import type { SeedGuide } from "./guidesSeed";

// Ratgeber für Anleger in Deutschland (Bundeswertpapiere, Abgeltungsteuer, deutsche Begriffe), keine Übersetzungen.
// Added in "review": tax paragraphs in particular must be checked before publication.

const cta = (text: string) => `<p><strong>Jetzt ausprobieren:</strong> <a href="/de">${text}</a>. Zwei Regler, zehn Anleihen, unverbindlich.</p>`;

export const SEED_GUIDES_DE: SeedGuide[] = [
  {
    locale: "de",
    topic: "gov",
    slug: "bundesanleihen",
    title: "Bundesanleihen, Bobl und Schatz: Bundeswertpapiere verstehen",
    seoTitle: "Bundesanleihen: Renditen und Laufzeiten erklärt",
    metaDescription: "Bundesanleihen, Bundesobligationen und Bundesschatzanweisungen erklärt: Laufzeiten, Rendite, Zinsrisiko, Steuer und Vergleich mit anderen Anleihen.",
    primaryKeyword: "bundesanleihen",
    relatedKeywords: ["bundesanleihen rendite", "bobl", "schatz", "deutsche staatsanleihen"],
    relatedSlugs: ["staatsanleihen-oder-unternehmensanleihen", "rendite-bis-faelligkeit"],
    bodyHtml: `
<p>Sagen Anleiheprofis in Europa „risikolos“, meinen sie meistens Deutschland. Mit <strong>Bundeswertpapieren</strong> finanziert sich die Bundesrepublik; begeben werden sie von der <strong>Finanzagentur des Bundes</strong>, und sie gelten als die sichersten Anleihen im Euroraum. Ihre Renditen sind das Metermaß, an dem fast jede andere Euro-Anleihe gemessen wird, ob sie will oder nicht.</p>
<h2 id="arten">Die wichtigsten Bundeswertpapiere</h2>
<ul>
<li><strong>Bundesschatzanweisungen (Schätze)</strong>: 2 Jahre Laufzeit, die Kurzstrecke.</li>
<li><strong>Bundesobligationen (Bobl)</strong>: 5 Jahre Laufzeit, die Mittelstrecke.</li>
<li><strong>Bundesanleihen (Bund)</strong>: 7 bis 30 Jahre; die zehnjährige ist der Star der Familie.</li>
<li><strong>Grüne Bundeswertpapiere</strong>: Erlöse fließen in Klima- und Umweltprojekte, sonst gleichen sie ihren „Zwillingen“ aufs Haar.</li>
</ul>
<p>Das Prinzip ist angenehm unspektakulär: einmal im Jahr ein fester Kupon, bei Fälligkeit der Nennwert zurück. Privatanleger kaufen über Bank oder Broker an der Börse oder nehmen den Umweg über Rentenfonds und ETFs.</p>
<h2 id="rendite">Rendite und Kurs</h2>
<p>Der Kupon ist in Stein gemeißelt, der Kurs bewegt sich täglich. Notiert er unter 100, wartet bei Fälligkeit ein Kursgewinn, notiert er darüber, ein Kursverlust. Die <a href="/de/ratgeber/rendite-bis-faelligkeit">Rendite bis Fälligkeit</a> verrechnet beides zu einer Zahl und ist die faire Vergleichsgröße. Die zehnjährige Bundrendite ist zugleich der Nullpunkt für Spreads: Wie weit italienische oder französische Staatsanleihen darüber liegen, zeigt, wie der Markt deren Kreditrisiko einschätzt. Der Bund ist sozusagen der Meeresspiegel des Marktes.</p>
<h2 id="risiken">Risiken: sicher heißt nicht unverwundbar</h2>
<p>Beim <strong>Ausfallrisiko</strong> gibt es wenig zu deuteln: Alle großen Ratingagenturen vergeben die Bestnote AAA. Die eigentliche Gefahr für Privatanleger ist das <strong>Zinsänderungsrisiko</strong>. Steigen die Marktzinsen, fallen die Kurse bereits ausgegebener Anleihen, und zwar umso stärker, je länger die Restlaufzeit ist. Diese Empfindlichkeit misst die Duration. Wer vor Fälligkeit verkauft, bekommt womöglich weniger zurück, als er bezahlt hat. Zudem kann die Rendite unter der Inflationsrate liegen.</p>
<h2 id="steuern">Steuern</h2>
<p>Auch bei der solidesten Anleihe des Landes sitzt der Fiskus mit am Tisch. Zinsen und Kursgewinne unterliegen der <strong>Abgeltungsteuer</strong> von 25 % zuzüglich Solidaritätszuschlag und gegebenenfalls Kirchensteuer. Bis zum Sparer-Pauschbetrag bleiben Kapitalerträge steuerfrei, wenn ein Freistellungsauftrag vorliegt. Lassen Sie Ihre persönliche Situation von Ihrer Bank oder einem Steuerberater prüfen. Die Renditen auf 10BONDS sind immer brutto.</p>
<h2 id="vergleich">Bundesanleihen vergleichen</h2>
<p>Die aktuelle Zinskurve steht auf unserer Seite zu den <a href="/de/anleihen/bundesanleihen">Bundesanleihen</a>. Wer mehr Rendite sucht, vergleicht bei gleicher Duration mit <a href="/de/anleihen/unternehmensanleihen">Unternehmensanleihen</a> oder <a href="/de/anleihen/italienische-staatsanleihen">italienischen Staatsanleihen</a>: Äpfel mit Äpfeln, nicht mit Zehnjahresbirnen. Wie das geht, erklärt der Ratgeber <a href="/de/ratgeber/staatsanleihen-oder-unternehmensanleihen">Staatsanleihen oder Unternehmensanleihen?</a></p>
${cta("wählen Sie Laufzeit und Zielrendite und sehen Sie, wo sich die Bundesanleihen einreihen")}
`,
  },
  {
    locale: "de",
    topic: "ytm",
    slug: "rendite-bis-faelligkeit",
    title: "Rendite bis Fälligkeit: So berechnen und nutzen Sie sie",
    seoTitle: "Rendite bis Fälligkeit einer Anleihe berechnen",
    metaDescription: "Was die Rendite bis Fälligkeit (Effektivverzinsung) einer Anleihe bedeutet, wie man sie berechnet, mit Rechenbeispiel und den wichtigsten Annahmen.",
    primaryKeyword: "rendite bis fälligkeit",
    relatedKeywords: ["effektivverzinsung anleihe", "anleiherendite berechnen", "yield to maturity"],
    relatedSlugs: ["bundesanleihen", "kreditrisiko-anleihen"],
    bodyHtml: `
<p>Der Kupon ist die Zahl auf der Verpackung, die <strong>Rendite bis Fälligkeit</strong> ist der Inhalt. Sie heißt auch <em>Effektivverzinsung</em> oder <em>Yield to Maturity</em> und ist die wichtigste Kennzahl beim Anleihevergleich: der jährliche Ertrag, wenn Sie zum heutigen Kurs kaufen und bis zur Rückzahlung halten, vorausgesetzt, der Emittent zahlt alle Kupons und das Kapital.</p>
<h2 id="kupon">Kupon und Rendite sind nicht dasselbe</h2>
<p>Der <strong>Kupon</strong> wird bei der Ausgabe festgelegt und auf den Nennwert (100) bezogen. Der <strong>Kurs</strong> dagegen hat jeden Tag eine neue Meinung. Wer unter 100 kauft, kassiert bei Fälligkeit zusätzlich einen Kursgewinn, wer über 100 kauft, schluckt einen Kursverlust. Die Rendite bis Fälligkeit rechnet beides ein. Zwei Anleihen mit 3 % Kupon können daher ganz unterschiedlich rentieren, wie zwei Wohnungen mit gleicher Miete und sehr verschiedenem Kaufpreis.</p>
<h2 id="formel">Die Formel</h2>
<p>Gesucht ist der Zinssatz <em>y</em>, bei dem der heutige Kurs dem Barwert aller künftigen Zahlungen entspricht:</p>
<p><code>Kurs = C/(1+y) + C/(1+y)² + … + (C+100)/(1+y)ⁿ</code></p>
<p><em>C</em> ist der jährliche Kupon, <em>n</em> die Restlaufzeit in Jahren. Direkt auflösen lässt sich die Gleichung nicht; man tastet sich heran. Tabellenkalkulationen erledigen das klaglos, etwa mit <code>IKV</code> oder <code>RENDITE</code>.</p>
<h2 id="beispiel">Rechenbeispiel</h2>
<p>Eine Anleihe mit 3 % Jahreskupon, Fälligkeit in 5 Jahren und Kurs 95:</p>
<ul>
<li>Jahr für Jahr erhalten Sie 3 € je 100 € Nennwert.</li>
<li>Bei Fälligkeit erhalten Sie 100 €, also 5 € mehr, als Sie bezahlt haben.</li>
<li>Der Zinssatz, bei dem 95 dem Barwert dieser Zahlungen entspricht, liegt bei rund <strong>4,13 %</strong> pro Jahr.</li>
</ul>
<p>Für den Bierdeckel gibt es eine Faustformel: <code>(C + (100 − Kurs) / n) / ((100 + Kurs) / 2)</code>, hier (3 + 1) / 97,5 = 4,10 %. Nicht exakt, aber erstaunlich nah dran.</p>
<h2 id="annahmen">Die Annahmen dahinter</h2>
<ul>
<li>Sie halten die Anleihe <strong>bis zur Fälligkeit</strong>; verkaufen Sie vorher, zählt der Kurs an diesem Tag.</li>
<li>Der Emittent <strong>fällt nicht aus</strong> (mehr dazu im Ratgeber zum <a href="/de/ratgeber/kreditrisiko-anleihen">Kreditrisiko</a>).</li>
<li>Die Kupons werden <strong>zum gleichen Zins wieder angelegt</strong>, was in der Praxis selten genau aufgeht.</li>
<li>Die Anleihe wird <strong>nicht vorzeitig gekündigt</strong>; bei kündbaren Anleihen gehört auch die Rendite bis zum ersten Kündigungstermin auf den Tisch.</li>
</ul>
<h2 id="brutto">Brutto und netto</h2>
<p>Die Renditen auf 10BONDS sind Bruttowerte, vor Abgeltungsteuer und Gebühren. Was netto bleibt, hängt von Ihrem Steuersatz, dem Sparer-Pauschbetrag und den Kosten Ihres Depots ab. Das Finanzamt rechnet nicht mit Faustformeln.</p>
<h2 id="nutzen">So nutzen Sie die Rendite</h2>
<p>Für sich allein ist die Rendite nur die halbe Auskunft. Lesen Sie sie immer zusammen mit der <strong>Duration</strong>, die die Zinsempfindlichkeit misst, und dem <strong>Rating</strong>, das das Ausfallrisiko beschreibt. Aktuelle Beispiele: <a href="/de/anleihen/rendite-4-prozent">Anleihen mit rund 4 % Rendite</a> oder mit <a href="/de/anleihen/duration-5-jahre">rund 5 Jahren Duration</a>.</p>
${cta("geben Sie Anlagehorizont und Zielrendite ein und sehen Sie die 10 passendsten Anleihen")}
`,
  },
  {
    locale: "de",
    topic: "credit",
    slug: "kreditrisiko-anleihen",
    title: "Kreditrisiko bei Anleihen: So schätzen Sie es ein",
    seoTitle: "Kreditrisiko bei Anleihen richtig einschätzen",
    metaDescription: "Kreditrisiko ist das Risiko, dass ein Emittent nicht zahlt. Rating, Spread, Rang der Anleihe und Streuung einfach erklärt.",
    primaryKeyword: "kreditrisiko anleihen",
    relatedKeywords: ["anleiherenditen und kreditrisiken vergleichen", "ausfallrisiko anleihe", "rating anleihen"],
    relatedSlugs: ["rendite-bis-faelligkeit", "staatsanleihen-oder-unternehmensanleihen"],
    bodyHtml: `
<p>Eine Anleihe ist ein Schuldschein mit Börsennotiz: Wer sie kauft, leiht dem Emittenten Geld. Das <strong>Kreditrisiko</strong> ist die Möglichkeit, dass der Schuldner Kupons oder Kapital ganz oder teilweise schuldig bleibt. Bei Unternehmensanleihen ist es das wichtigste Risiko, und es erklärt, warum manche Anleihen deutlich mehr Rendite bieten als andere. Mit Großzügigkeit hat das selten zu tun.</p>
<h2 id="rating">Erster Anhaltspunkt: das Rating</h2>
<p>S&amp;P, Moody's und Fitch verdichten das Kreditrisiko zu einer Note von AAA bis D. Die entscheidende Linie trennt <a href="/de/anleihen/investment-grade">Investment Grade</a> (bis BBB-) von <a href="/de/anleihen/hochzinsanleihen">Hochzinsanleihen</a> (ab BB+). Ratings sind nützlich, kommen aber oft verspätet, wie ein Wetterbericht, der Regen meldet, wenn die Straße schon nass ist. Ein Ausgangspunkt, keine Garantie.</p>
<h2 id="spread">Zweiter Anhaltspunkt: der Spread</h2>
<p>Der <strong>Spread</strong> ist der Renditeabstand zu einer Bundesanleihe gleicher Laufzeit. Je breiter er ist, desto mehr Ausgleich verlangt der Markt für das Risiko. Weitet sich der Spread eines Emittenten deutlich stärker aus als bei vergleichbar bewerteten Konkurrenten, ist das ein Warnsignal.</p>
<h2 id="verlust">Wie viel geht bei einem Ausfall verloren?</h2>
<p>Ein Ausfall ist nicht automatisch ein Totalverlust. Wie viel zurückfließt, hängt ab vom</p>
<ul>
<li><strong>Rang der Anleihe</strong>: vorrangige (<em>senior</em>) Anleihen werden vor nachrangigen bedient, die deshalb höher verzinst sind;</li>
<li><strong>Sicherheiten</strong>: besicherte Anleihen wie Pfandbriefe haben deutlich höhere Erlösquoten;</li>
<li>Vermögen und Branche des Emittenten.</li>
</ul>
<p>Bei Banken in der EU kommt das <strong>Bail-in</strong> hinzu: Im Krisenfall können die Behörden Gläubiger an den Verlusten beteiligen, beginnend mit nachrangigen Papieren.</p>
<h2 id="streuen">Das einfachste Mittel: streuen</h2>
<p>Die älteste Regel der Geldanlage ist auch hier die wirksamste. Wer sein Kapital auf viele Emittenten, Branchen und Länder verteilt, begrenzt die Folgen eines einzelnen Ausfalls. Deshalb enthalten die Listen von 10BONDS <strong>nur eine Anleihe je Emittent</strong>: zehn Anleihen, zehn Emittenten.</p>
<h2 id="vergleichen">Renditen und Kreditrisiken vergleichen</h2>
<p>Bei gleicher Duration ist eine höhere Rendite fast immer der Preis für mehr Kreditrisiko; verschenkt wird am Anleihemarkt wenig. Rentiert eine Anleihe deutlich höher als andere mit gleichem Rating, fragen Sie nach dem Grund. Vergleichen Sie etwa <a href="/de/anleihen/investment-grade">Investment-Grade-Anleihen</a> mit <a href="/de/anleihen/hochzinsanleihen">Hochzinsanleihen</a>.</p>
${cta("legen Sie mit dem Rating-Regler fest, wie viel Kreditrisiko Sie akzeptieren")}
`,
  },
  {
    locale: "de",
    topic: "compare",
    slug: "staatsanleihen-oder-unternehmensanleihen",
    title: "Staatsanleihen oder Unternehmensanleihen?",
    seoTitle: "Staatsanleihen oder Unternehmensanleihen? Vergleich",
    metaDescription: "Bundesanleihen oder Unternehmensanleihen: Rendite, Kreditrisiko, Liquidität und Streuung in fünf Schritten richtig vergleichen.",
    primaryKeyword: "staatsanleihen oder unternehmensanleihen",
    relatedKeywords: ["unternehmensanleihen", "anleihen vergleichen", "bund oder unternehmensanleihe"],
    relatedSlugs: ["bundesanleihen", "kreditrisiko-anleihen"],
    bodyHtml: `
<p>Ruhiger Schlaf bei mageren Zinsen oder etwas mehr Rendite gegen etwas mehr Puls? Ob <strong>Staatsanleihen</strong> wie Bundesanleihen oder <strong>Unternehmensanleihen</strong> besser passen, hängt von Ihrer Situation ab. Die Methode für einen fairen Vergleich ist aber immer dieselbe.</p>
<h2 id="horizont">1. Bei gleichem Anlagehorizont vergleichen</h2>
<p>Ein zweijähriger Schatz und eine zehnjährige Unternehmensanleihe gehören nicht in dasselbe Rennen: Die zweite rentiert schon deshalb höher, weil sie länger läuft und zinsempfindlicher ist. Sprinter und Marathonläufer vergleicht man auch nicht über die Gesamtzeit. Legen Sie zuerst die passende <strong>Duration</strong> fest und vergleichen Sie dann innerhalb dieser Spanne.</p>
<h2 id="aufschlag">2. Den Risikoaufschlag messen</h2>
<p>Der Renditeabstand zwischen einer Unternehmensanleihe und einer Bundesanleihe gleicher Duration heißt <strong>Kreditaufschlag</strong>. Er sollte das zusätzliche Risiko angemessen bezahlen. Einige Zehntelprozentpunkte für einen Emittenten im unteren Investment-Grade-Bereich sind wenig; ein hoher Aufschlag bei einem soliden Emittenten verdient Aufmerksamkeit, sofern man versteht, warum der Markt ihn verlangt. Mehr dazu im Ratgeber zum <a href="/de/ratgeber/kreditrisiko-anleihen">Kreditrisiko</a>.</p>
<h2 id="rating">3. Auf das Rating achten, nicht auf den Namen</h2>
<p>Ein berühmter Konzernname sagt über das Kreditrisiko so viel wie ein schickes Firmenschild über den Kontostand. Manche große Unternehmen haben ein sehr gutes Rating, andere bekannte Marken liegen im Hochzinsbereich.</p>
<h2 id="liquiditaet">4. An die Handelbarkeit denken</h2>
<p>Bundeswertpapiere werden in riesigen Volumina gehandelt und lassen sich jederzeit mit geringer Geld-Brief-Spanne verkaufen. Viele Unternehmensanleihen, gerade kleine Emissionen, sind weniger liquide. Wer das Geld vielleicht vor Fälligkeit braucht, plant das besser vorher ein als am Tag des Verkaufs.</p>
<h2 id="streuung">5. Streuen</h2>
<p>Ein Depot nur aus Bundesanleihen ist sehr sicher, hängt aber an einem einzigen Schuldner und ist niedrig verzinst. Eine Mischung aus Staats- und Unternehmensanleihen verschiedener Branchen und Länder verteilt das Risiko auf mehr Schultern. Die Listen von 10BONDS zeigen deshalb nur eine Anleihe je Emittent.</p>
<h2 id="daten">Aktuelle Daten</h2>
<p>Legen Sie die Zinskurve der <a href="/de/anleihen/bundesanleihen">Bundesanleihen</a> neben die <a href="/de/anleihen/unternehmensanleihen">Unternehmensanleihen in Euro</a> und die <a href="/de/anleihen/beste-anleihen">rentabelsten Investment-Grade-Anleihen</a>, täglich aktualisiert.</p>
${cta("legen Sie Horizont und Zielrendite fest und vergleichen Sie Staaten und Unternehmen in einer Liste")}
`,
  },
];
