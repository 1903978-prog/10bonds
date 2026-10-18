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
<p>Mit <strong>Bundeswertpapieren</strong> finanziert sich die Bundesrepublik Deutschland. Sie werden von der <strong>Finanzagentur des Bundes</strong> begeben und gelten als die sichersten Anleihen im Euroraum. Ihre Renditen sind der Maßstab, an dem fast alle anderen Euro-Anleihen gemessen werden.</p>
<h2 id="arten">Die wichtigsten Bundeswertpapiere</h2>
<ul>
<li><strong>Bundesschatzanweisungen (Schätze)</strong>: Laufzeit 2 Jahre.</li>
<li><strong>Bundesobligationen (Bobl)</strong>: Laufzeit 5 Jahre.</li>
<li><strong>Bundesanleihen (Bund)</strong>: Laufzeiten von 7 bis 30 Jahren, am bekanntesten ist die zehnjährige.</li>
<li><strong>Grüne Bundeswertpapiere</strong>: Erlöse fließen in Klima- und Umweltprojekte, sonst gleich ausgestattet wie ihre „Zwillinge“.</li>
</ul>
<p>Alle zahlen einen festen Kupon einmal im Jahr und den Nennwert bei Fälligkeit zurück. Privatanleger kaufen sie über Bank oder Broker an der Börse oder indirekt über Rentenfonds und ETFs.</p>
<h2 id="rendite">Rendite und Kurs</h2>
<p>Der Kupon steht fest, der Kurs schwankt täglich. Liegt der Kurs unter 100, kommt bei Fälligkeit ein Kursgewinn hinzu, liegt er darüber, ein Kursverlust. Die <a href="/de/ratgeber/rendite-bis-faelligkeit">Rendite bis Fälligkeit</a> fasst beides zusammen und ist deshalb die richtige Kennzahl für den Vergleich. Die zehnjährige Bundrendite ist zugleich der Ausgangspunkt für Spreads: Der Abstand zu italienischen oder französischen Staatsanleihen zeigt, wie der Markt deren Kreditrisiko einschätzt.</p>
<h2 id="risiken">Risiken</h2>
<p>Das <strong>Ausfallrisiko</strong> des Bundes bewerten alle großen Ratingagenturen mit der Bestnote AAA. Das wichtigste Risiko für Privatanleger ist das <strong>Zinsänderungsrisiko</strong>: Steigen die Marktzinsen, fallen die Kurse bereits ausgegebener Anleihen, und zwar umso stärker, je länger die Restlaufzeit ist. Die Duration misst diese Empfindlichkeit. Wer vor Fälligkeit verkauft, kann daher weniger zurückbekommen, als er bezahlt hat. Zudem kann die Rendite unter der Inflationsrate liegen.</p>
<h2 id="steuern">Steuern</h2>
<p>Zinsen und Kursgewinne unterliegen in Deutschland der <strong>Abgeltungsteuer</strong> von 25 % zuzüglich Solidaritätszuschlag und gegebenenfalls Kirchensteuer. Bis zum Sparer-Pauschbetrag bleiben Kapitalerträge steuerfrei, wenn ein Freistellungsauftrag vorliegt. Lassen Sie Ihre persönliche Situation von Ihrer Bank oder einem Steuerberater prüfen. Die Renditen auf 10BONDS sind immer brutto.</p>
<h2 id="vergleich">Bundesanleihen vergleichen</h2>
<p>Die aktuelle Zinskurve finden Sie auf unserer Seite zu den <a href="/de/anleihen/bundesanleihen">Bundesanleihen</a>. Wer mehr Rendite sucht, vergleicht sie am besten bei gleicher Duration mit <a href="/de/anleihen/unternehmensanleihen">Unternehmensanleihen</a> oder mit <a href="/de/anleihen/italienische-staatsanleihen">italienischen Staatsanleihen</a>. Wie das geht, erklärt der Ratgeber <a href="/de/ratgeber/staatsanleihen-oder-unternehmensanleihen">Staatsanleihen oder Unternehmensanleihen?</a></p>
${cta("wählen Sie Laufzeit und Zielrendite und sehen Sie, wo Bundesanleihen stehen")}
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
<p>Die <strong>Rendite bis Fälligkeit</strong>, oft auch <em>Effektivverzinsung</em> oder <em>Yield to Maturity</em> genannt, ist die wichtigste Kennzahl beim Anleihevergleich. Sie gibt an, welchen jährlichen Ertrag Sie erzielen, wenn Sie eine Anleihe zum heutigen Kurs kaufen und bis zur Rückzahlung halten, vorausgesetzt der Emittent zahlt alle Kupons und das Kapital.</p>
<h2 id="kupon">Kupon und Rendite sind nicht dasselbe</h2>
<p>Der <strong>Kupon</strong> wird bei der Ausgabe festgelegt und auf den Nennwert (100) bezogen. Der <strong>Kurs</strong> ändert sich dagegen jeden Tag. Kaufen Sie unter 100, erhalten Sie bei Fälligkeit zusätzlich einen Kursgewinn, kaufen Sie über 100, einen Kursverlust. Die Rendite bis Fälligkeit berücksichtigt beides. Deshalb können zwei Anleihen mit 3 % Kupon ganz unterschiedlich rentieren.</p>
<h2 id="formel">Die Formel</h2>
<p>Die Rendite ist der Zinssatz <em>y</em>, bei dem der heutige Kurs dem Barwert aller künftigen Zahlungen entspricht:</p>
<p><code>Kurs = C/(1+y) + C/(1+y)² + … + (C+100)/(1+y)ⁿ</code></p>
<p>Dabei ist <em>C</em> der jährliche Kupon und <em>n</em> die Restlaufzeit in Jahren. Eine direkte Lösung gibt es nicht; Tabellenkalkulationen finden sie schrittweise, etwa mit den Funktionen <code>IKV</code> oder <code>RENDITE</code>.</p>
<h2 id="beispiel">Rechenbeispiel</h2>
<p>Eine Anleihe mit 3 % Jahreskupon, Fälligkeit in 5 Jahren und Kurs 95:</p>
<ul>
<li>Jedes Jahr erhalten Sie 3 € je 100 € Nennwert.</li>
<li>Bei Fälligkeit erhalten Sie 100 €, also 5 € mehr, als Sie bezahlt haben.</li>
<li>Der Zinssatz, bei dem 95 dem Barwert dieser Zahlungen entspricht, liegt bei rund <strong>4,13 %</strong> pro Jahr.</li>
</ul>
<p>Eine Faustformel: <code>(C + (100 − Kurs) / n) / ((100 + Kurs) / 2)</code>, hier (3 + 1) / 97,5 = 4,10 %.</p>
<h2 id="annahmen">Die Annahmen dahinter</h2>
<ul>
<li>Sie halten die Anleihe <strong>bis zur Fälligkeit</strong>; bei vorzeitigem Verkauf zählt der dann gültige Kurs.</li>
<li>Der Emittent <strong>fällt nicht aus</strong> (mehr dazu im Ratgeber zum <a href="/de/ratgeber/kreditrisiko-anleihen">Kreditrisiko</a>).</li>
<li>Die Kupons werden <strong>zum gleichen Zins wieder angelegt</strong>, was in der Praxis selten genau gelingt.</li>
<li>Die Anleihe wird <strong>nicht vorzeitig gekündigt</strong>; bei kündbaren Anleihen zählt auch die Rendite bis zum ersten Kündigungstermin.</li>
</ul>
<h2 id="brutto">Brutto und netto</h2>
<p>Die Renditen auf 10BONDS sind Bruttowerte, vor Abgeltungsteuer und Gebühren. Die Nettorendite hängt von Ihrem Steuersatz, dem Sparer-Pauschbetrag und den Kosten Ihres Depots ab.</p>
<h2 id="nutzen">So nutzen Sie die Rendite</h2>
<p>Vergleichen Sie die Rendite immer zusammen mit der <strong>Duration</strong>, die die Zinsempfindlichkeit misst, und dem <strong>Rating</strong>, das das Ausfallrisiko beschreibt. Aktuelle Beispiele: <a href="/de/anleihen/rendite-4-prozent">Anleihen mit rund 4 % Rendite</a> oder mit <a href="/de/anleihen/duration-5-jahre">rund 5 Jahren Duration</a>.</p>
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
<p>Wer eine Anleihe kauft, leiht dem Emittenten Geld. Das <strong>Kreditrisiko</strong> ist das Risiko, dass der Emittent Kupons oder Kapital ganz oder teilweise nicht zahlt. Es ist das wichtigste Risiko bei Unternehmensanleihen und der Grund, warum manche Anleihen deutlich mehr Rendite bieten als andere.</p>
<h2 id="rating">Erster Anhaltspunkt: das Rating</h2>
<p>S&amp;P, Moody's und Fitch fassen das Kreditrisiko in einer Note zusammen, von AAA bis D. Die wichtigste Grenze trennt <a href="/de/anleihen/investment-grade">Investment Grade</a> (bis BBB-) von <a href="/de/anleihen/hochzinsanleihen">Hochzinsanleihen</a> (ab BB+). Ratings sind nützlich, reagieren aber oft verzögert: Sie sind ein Ausgangspunkt, keine Garantie.</p>
<h2 id="spread">Zweiter Anhaltspunkt: der Spread</h2>
<p>Der <strong>Spread</strong> ist der Renditeabstand zu einer Bundesanleihe mit gleicher Laufzeit. Je größer er ist, desto mehr Ausgleich verlangt der Markt für das Risiko. Steigt der Spread eines Emittenten deutlich stärker als bei vergleichbar bewerteten Konkurrenten, ist das ein Warnsignal.</p>
<h2 id="verlust">Wie viel geht bei einem Ausfall verloren?</h2>
<p>Ein Ausfall bedeutet nicht automatisch einen Totalverlust. Wie viel zurückfließt, hängt ab vom</p>
<ul>
<li><strong>Rang der Anleihe</strong>: vorrangige (<em>senior</em>) Anleihen werden vor nachrangigen bedient, die deshalb höher verzinst sind;</li>
<li><strong>Sicherheiten</strong>: besicherte Anleihen wie Pfandbriefe haben deutlich höhere Erlösquoten;</li>
<li>Vermögen und Branche des Emittenten.</li>
</ul>
<p>Bei Banken in der EU gilt zudem das <strong>Bail-in</strong>: Im Krisenfall können die Behörden Gläubiger an Verlusten beteiligen, beginnend mit nachrangigen Papieren.</p>
<h2 id="streuen">Das einfachste Mittel: streuen</h2>
<p>Wer sein Kapital auf viele Emittenten, Branchen und Länder verteilt, begrenzt die Folgen eines einzelnen Ausfalls. Deshalb enthalten die Listen von 10BONDS <strong>nur eine Anleihe je Emittent</strong>: zehn Anleihen, zehn Emittenten.</p>
<h2 id="vergleichen">Renditen und Kreditrisiken vergleichen</h2>
<p>Bei gleicher Duration ist eine höhere Rendite fast immer der Preis für ein höheres Kreditrisiko. Rentiert eine Anleihe deutlich höher als andere mit gleichem Rating, fragen Sie nach dem Grund. Vergleichen Sie zum Beispiel <a href="/de/anleihen/investment-grade">Investment-Grade-Anleihen</a> mit <a href="/de/anleihen/hochzinsanleihen">Hochzinsanleihen</a>.</p>
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
<p>Sicher und niedrig verzinst oder etwas riskanter und rentabler? Die Wahl zwischen <strong>Staatsanleihen</strong> wie Bundesanleihen und <strong>Unternehmensanleihen</strong> hängt von Ihrer Situation ab. Die Methode für einen fairen Vergleich ist aber immer gleich.</p>
<h2 id="horizont">1. Bei gleichem Anlagehorizont vergleichen</h2>
<p>Ein zweijähriger Schatz und eine zehnjährige Unternehmensanleihe lassen sich nicht direkt vergleichen: Die zweite rentiert schon deshalb höher, weil sie länger läuft und zinsempfindlicher ist. Legen Sie zuerst die passende <strong>Duration</strong> fest und vergleichen Sie dann innerhalb dieser Spanne.</p>
<h2 id="aufschlag">2. Den Risikoaufschlag messen</h2>
<p>Der Renditeabstand zwischen einer Unternehmensanleihe und einer Bundesanleihe gleicher Duration ist der <strong>Kreditaufschlag</strong>. Er sollte das zusätzliche Risiko angemessen bezahlen. Einige Zehntelprozentpunkte für einen Emittenten im unteren Investment-Grade-Bereich sind wenig; ein hoher Aufschlag bei einem soliden Emittenten verdient Aufmerksamkeit, wenn man versteht, warum der Markt ihn verlangt. Mehr dazu im Ratgeber zum <a href="/de/ratgeber/kreditrisiko-anleihen">Kreditrisiko</a>.</p>
<h2 id="rating">3. Auf das Rating achten, nicht auf den Namen</h2>
<p>Ein bekannter Konzernname sagt wenig über das Kreditrisiko. Manche große Unternehmen haben ein sehr gutes Rating, andere bekannte Marken liegen im Hochzinsbereich.</p>
<h2 id="liquiditaet">4. An die Handelbarkeit denken</h2>
<p>Bundeswertpapiere werden in riesigen Volumina gehandelt und lassen sich jederzeit mit geringer Geld-Brief-Spanne verkaufen. Viele Unternehmensanleihen, besonders kleine Emissionen, sind weniger liquide. Wer das Geld vielleicht vor Fälligkeit braucht, sollte das berücksichtigen.</p>
<h2 id="streuung">5. Streuen</h2>
<p>Ein Depot nur aus Bundesanleihen ist sehr sicher, aber auf einen Schuldner konzentriert und niedrig verzinst. Eine Mischung aus Staats- und Unternehmensanleihen verschiedener Branchen und Länder verteilt das Risiko. Die Listen von 10BONDS zeigen deshalb nur eine Anleihe je Emittent.</p>
<h2 id="daten">Aktuelle Daten</h2>
<p>Vergleichen Sie die Zinskurve der <a href="/de/anleihen/bundesanleihen">Bundesanleihen</a> mit <a href="/de/anleihen/unternehmensanleihen">Unternehmensanleihen in Euro</a> und den <a href="/de/anleihen/beste-anleihen">rentabelsten Investment-Grade-Anleihen</a>, täglich aktualisiert.</p>
${cta("legen Sie Horizont und Zielrendite fest und vergleichen Sie Staaten und Unternehmen in einer Liste")}
`,
  },
];
