import type { SeedGuide } from "./guidesSeed";

// Zweite Welle deutscher Ratgeber: für Anleger in Deutschland geschrieben (Bund, Depot, Abgeltungsteuer), keine
// wörtlichen Übersetzungen. Jede Seite trägt die Übersetzungsgruppe ihrer italienischen Vorlage. Zahlen stammen nur
// aus den Vorlagen (Duration-Beispiel, Ausfalltabelle); keine Renditen, Kurse oder ISINs erfunden.

const cta = (text: string) => `<p><strong>Jetzt ausprobieren:</strong> <a href="/de">${text}</a>. Zwei Regler, zehn Anleihen, unverbindlich.</p>`;

const hinweis = `<p><em>Die Informationen dienen ausschließlich der Information und Bildung. Sie sind keine Anlageberatung und keine Empfehlung zum Kauf oder Verkauf. Renditen und Ratings können sich jederzeit ändern.</em></p>`;

export const SEED_GUIDES_DE2: SeedGuide[] = [
  {
    locale: "de",
    topic: "duration",
    group: "duration",
    status: "published",
    slug: "duration-anleihen",
    title: "Duration bei Anleihen: Was sie misst und wie Sie sie nutzen",
    seoTitle: "Duration bei Anleihen einfach erklärt",
    metaDescription: "Die Duration zeigt, wie stark der Kurs einer Anleihe auf Zinsänderungen reagiert. Macaulay- und modifizierte Duration mit Beispiel und Faustregel.",
    primaryKeyword: "duration anleihen",
    relatedKeywords: ["modifizierte duration", "macaulay duration", "zinsänderungsrisiko anleihen", "duration berechnen"],
    relatedSlugs: ["rendite-bis-faelligkeit", "bundesanleihen", "investment-grade-anleihen"],
    bodyHtml: `
<p><strong>Kurz gesagt:</strong> Die Duration verrät, um wie viel Prozent der Kurs einer Anleihe ungefähr fällt, wenn die Marktzinsen um einen Prozentpunkt steigen. Eine Duration von 5 heißt: rund 5 % Kursverlust bei einem Zinsanstieg um einen Prozentpunkt, rund 5 % Kursgewinn bei einem Rückgang.</p>
<p>Wer nur auf die <a href="/de/ratgeber/rendite-bis-faelligkeit">Rendite bis Fälligkeit</a> schaut, kauft ein Auto nach dem Verbrauch, ohne nach den Bremsen zu fragen. Die Duration ist die zweite Zahl, die Sie vor jedem Anleihekauf kennen sollten. Zwei Anleihen können exakt dieselbe Rendite bieten und sich trotzdem völlig verschieden benehmen, sobald sich die Zinsen bewegen. Die Duration macht diesen Unterschied sichtbar.</p>
<h2 id="zwei-arten">Welche Arten von Duration gibt es?</h2>
<p>Die <strong>Macaulay-Duration</strong> ist die durchschnittliche Kapitalbindungsdauer: der Zeitpunkt aller Zahlungen der Anleihe, also Kupons und Rückzahlung, gewichtet mit ihrem Barwert. Gemessen wird sie in Jahren, und sie ist nie länger als die Restlaufzeit, weil die Kupons schon vor der Rückzahlung fließen.</p>
<p>Die <strong>modifizierte Duration</strong> wird daraus abgeleitet (man teilt durch 1 + Rendite) und misst unmittelbar, wie empfindlich der Kurs auf Zinsänderungen reagiert. Mit dieser Kennzahl arbeitet 10BONDS, und sie steckt auch hinter dem Duration-Regler im Anleihen-Finder. Wenn am Markt jemand beiläufig „Duration“ sagt, meint er fast immer die modifizierte.</p>
<h2 id="faustregel">Wie lautet die Faustregel für die Duration bei Anleihen?</h2>
<p>Die Regel ist so schlicht, dass sie auf eine Serviette passt. Bei einer modifizierten Duration von <em>D</em> Jahren gilt: Steigen die Marktrenditen um einen Prozentpunkt, fällt der Kurs um etwa <em>D</em> %. Fallen sie um einen Prozentpunkt, steigt er um etwa <em>D</em> %.</p>
<table>
<thead><tr><th scope="col">Modifizierte Duration</th><th scope="col">Kursänderung bei +1 Prozentpunkt Zins</th><th scope="col">Typische Anleihe</th></tr></thead>
<tbody>
<tr><td>2</td><td>etwa −2 %</td><td>kurze Laufzeit, etwa ein Schatz</td></tr>
<tr><td>5</td><td>etwa −5 %</td><td>mittlere Laufzeit, etwa eine Bobl</td></tr>
<tr><td>10</td><td>etwa −10 %</td><td>lange Laufzeit, etwa eine lange Bundesanleihe</td></tr>
</tbody>
</table>
<p>Ein Beispiel aus dem Lehrbuch: Eine Anleihe mit 3 % Kupon, Fälligkeit in 5 Jahren und einer Rendite von 4,13 % hat eine Macaulay-Duration von rund 4,7 Jahren und eine modifizierte Duration von rund 4,5. Bei kleinen Zinsbewegungen leistet die Faustregel gute Dienste. Bei großen Sprüngen meldet sich die <strong>Konvexität</strong> zu Wort: Sie sorgt dafür, dass Kursgewinne etwas größer ausfallen als Kursverluste, eine der wenigen angenehmen Überraschungen der Anleihemathematik.</p>
<p>Die Regel wirkt in beide Richtungen. Eine lange Duration ist daher nicht bloß ein Risiko, sondern ein Hebel: Sie verliert mehr, wenn die Zinsen steigen, und gewinnt mehr, wenn sie fallen.</p>
<h2 id="einflussfaktoren">Was verlängert oder verkürzt die Duration?</h2>
<ul>
<li><strong>Restlaufzeit</strong>: Je weiter die Fälligkeit entfernt liegt, desto länger die Duration.</li>
<li><strong>Kupon</strong>: Hohe Kupons geben mehr Geld früher zurück und verkürzen die Duration. Bei einer Nullkuponanleihe entspricht die Macaulay-Duration genau der Restlaufzeit.</li>
<li><strong>Renditeniveau</strong>: Höhere Renditen verkürzen die Duration leicht.</li>
</ul>
<p>Darum haben zwei Anleihen mit demselben Fälligkeitstag oft eine unterschiedliche Duration. Die mit dem höheren Kupon zahlt unterwegs mehr aus und ist dadurch etwas weniger zinsempfindlich.</p>
<h2 id="horizont">Wie passt die Duration zu Ihrem Anlagehorizont?</h2>
<p>Wissen Sie, wann Sie das Geld brauchen, dann begrenzt eine Duration nahe an diesem Zeitpunkt das Risiko. Steigen die Zinsen, fällt zwar der Kurs, doch die Kupons lassen sich zu höheren Zinsen wieder anlegen; beide Effekte gleichen sich tendenziell aus. Ist der Horizont dagegen kurz und die Duration lang, kann ein Zinsanstieg Sie zwingen, mit Verlust aus dem Depot zu verkaufen, und zwar genau dann, wenn es am wenigsten passt.</p>
<p>Anleihen nach Duration vergleichen können Sie auf unseren Seiten zu <a href="/de/anleihen/duration-2-jahre">rund 2 Jahren</a>, <a href="/de/anleihen/duration-5-jahre">rund 5 Jahren</a> und <a href="/de/anleihen/duration-10-jahre">rund 10 Jahren</a> Duration.</p>
<h2 id="grenzen">Was misst die Duration nicht?</h2>
<p>Die Duration kennt nur ein Thema: das <strong>Zinsänderungsrisiko</strong>. Zur Bonität des Emittenten schweigt sie. Dafür brauchen Sie Rating und Spread, beides erklärt im Ratgeber zum <a href="/de/ratgeber/kreditrisiko-anleihen">Kreditrisiko</a>. Bei variabel verzinslichen oder kündbaren Anleihen taugt sie zudem nur eingeschränkt, weil diese anders auf Zinsänderungen reagieren.</p>
<p>Außerdem ist die Duration eine Momentaufnahme, kein Stempel im Pass. Mit der Zeit und mit jeder Renditeänderung verschiebt sie sich. Eine Anleihe, die Sie mit einer Duration von 5 kaufen, hat ein Jahr später eine kürzere.</p>
<h2 id="faq">Häufige Fragen</h2>
<h3>Ist eine kurze Duration immer sicherer?</h3>
<p>Sie bedeutet geringere Kursschwankungen, wenn sich die Zinsen ändern. Am Ausfallrisiko des Emittenten ändert sie nichts.</p>
<h3>Haben Bundesanleihen auch ein Duration-Risiko?</h3>
<p>Ja. Auch eine Bundesanleihe mit Bestnote verliert an Kurs, wenn die Zinsen steigen, und das umso stärker, je länger ihre Duration ist. Die Bestnote schützt vor dem Ausfall, nicht vor der Mathematik.</p>
${cta("stellen Sie die gewünschte Duration und Zielrendite ein")}
${hinweis}
`,
  },
  {
    locale: "de",
    topic: "ig",
    group: "ig",
    status: "published",
    slug: "investment-grade-anleihen",
    title: "Investment-Grade-Anleihen: Was das Rating bedeutet",
    seoTitle: "Investment-Grade-Anleihen: Rating einfach erklärt",
    metaDescription: "Was Investment Grade bedeutet, wie Sie die Ratings von S&P, Moody's und Fitch lesen und warum die Grenze zwischen BBB- und BB+ so wichtig ist.",
    primaryKeyword: "investment grade anleihen",
    relatedKeywords: ["anleihen rating", "bbb rating", "sichere anleihen", "ratingskala"],
    relatedSlugs: ["kreditrisiko-anleihen", "hochzinsanleihen-chancen-risiken", "ausfallwahrscheinlichkeit-rating"],
    bodyHtml: `
<p><strong>Kurz gesagt:</strong> Investment-Grade-Anleihen stammen von Emittenten, denen die Ratingagenturen ein geringes Ausfallrisiko bescheinigen, also ein Rating von AAA bis BBB- (bei Moody's Aaa bis Baa3). Darunter beginnt der Hochzinsbereich.</p>
<p>Diese Grenze ist die wichtigste Linie am Anleihemarkt, so etwas wie die Türsteherregel vor dem besseren Club. Viele Fonds, Versicherer und andere institutionelle Anleger dürfen nur Anleihen oberhalb dieser Schwelle halten. Für Privatanleger mit eigenem Depot ist sie eine erste Orientierung, wie viel Kreditrisiko in einem Papier steckt.</p>
<h2 id="skala">Wie ist die Ratingskala aufgebaut?</h2>
<p>Die drei großen Agenturen arbeiten mit ähnlichen Skalen, nur die Schreibweise unterscheidet sich. Zum Investment Grade zählen:</p>
<table>
<thead><tr><th scope="col">S&amp;P und Fitch</th><th scope="col">Moody's</th><th scope="col">Einstufung</th></tr></thead>
<tbody>
<tr><td>AAA</td><td>Aaa</td><td>Höchste Bonität</td></tr>
<tr><td>AA+, AA, AA-</td><td>Aa1, Aa2, Aa3</td><td>Sehr gute Bonität</td></tr>
<tr><td>A+, A, A-</td><td>A1, A2, A3</td><td>Gute Bonität</td></tr>
<tr><td>BBB+, BBB, BBB-</td><td>Baa1, Baa2, Baa3</td><td>Angemessene Bonität</td></tr>
</tbody>
</table>
<p>Ab BB+ (Moody's: Ba1) abwärts spricht man von <a href="/de/ratgeber/hochzinsanleihen-chancen-risiken">Hochzinsanleihen</a>, High Yield oder „spekulativen“ Anleihen. Bundesanleihen tragen bei allen großen Agenturen die Bestnote AAA. Viele andere Staaten des Euroraums, deren Anleihen wie OAT oder BTP ebenfalls an deutschen Börsen gehandelt werden, liegen darunter, meist aber noch im Investment Grade.</p>
<h2 id="aussage">Was sagt ein Rating wirklich aus?</h2>
<p>Ein Rating ist eine Meinung, wenn auch eine sehr gut recherchierte: die Einschätzung einer Agentur, ob der Emittent Kupons und Kapital zahlen kann. Es ist weder Garantie noch Kaufempfehlung. Historisch sind Ausfälle bei Investment-Grade-Emittenten deutlich seltener gewesen als im Hochzinsbereich, unmöglich waren sie nie. Wie selten genau, zeigt unsere Übersicht zur <a href="/de/ratgeber/ausfallwahrscheinlichkeit-rating">Ausfallwahrscheinlichkeit nach Rating</a>.</p>
<p>Ratings sind außerdem nicht in Stein gemeißelt. Ein Emittent kann herabgestuft werden, während seine Anleihe in Ihrem Depot liegt, und die Agenturen reagieren auf neue Entwicklungen oft mit Verzögerung.</p>
<h2 id="schwelle">Warum ist die Schwelle bei BBB- so wichtig?</h2>
<p>Rutscht ein Emittent von BBB- auf BB+, wird er zum <strong>Fallen Angel</strong>, einem gefallenen Engel. Viele Anleger müssen dann verkaufen, ob sie wollen oder nicht, und der Kurs kann stärker fallen, als die reine Verschlechterung der Bonität rechtfertigen würde. Deshalb rentieren BBB-Anleihen meist etwas höher als A-Anleihen: Der Markt preist das Risiko ein, dass die Schwelle unterschritten wird.</p>
<h2 id="rendite">Wovon hängt die Rendite von Investment-Grade-Anleihen ab?</h2>
<p>Drei Stellschrauben bestimmen sie: das allgemeine Zinsniveau, die <a href="/de/ratgeber/duration-anleihen">Duration</a> und das Rating. Bei gleicher Duration gilt in der Regel, je niedriger das Rating, desto höher die Rendite. Den Renditeabstand zur Bundesanleihe gleicher Laufzeit nennt man Spread. Aktuelle Werte zeigt die Seite <a href="/de/anleihen/investment-grade">Investment-Grade-Anleihen in Euro</a>, täglich aktualisiert.</p>
<h2 id="uneinig">Was gilt, wenn die Agenturen sich nicht einig sind?</h2>
<p>Auch Experten streiten sich: Es kommt vor, dass eine Anleihe bei einer Agentur BBB- und bei einer anderen BB+ hat. 10BONDS zeigt stattdessen ein Risiko von 1 bis 10, eine eigene Skala, die kein Rating ist. Anleihen ohne Rating erscheinen nicht in unseren Listen. Details finden Sie in der <a href="/de/methodik">Methodik</a>.</p>
<h2 id="faq">Häufige Fragen</h2>
<h3>Kann ich mit einer Investment-Grade-Anleihe Geld verlieren?</h3>
<p>Ja. Das Rating garantiert keine Rückzahlung, und der Kurs kann fallen, etwa wenn die Zinsen steigen oder der Emittent herabgestuft wird.</p>
<h3>Wie werden die Erträge besteuert?</h3>
<p>Zinsen und Kursgewinne unterliegen in Deutschland grundsätzlich der Abgeltungsteuer von 25 % zuzüglich Solidaritätszuschlag und gegebenenfalls Kirchensteuer. Die Renditen auf 10BONDS sind Bruttowerte, das Finanzamt kommt also noch.</p>
${cta("wählen Sie mit dem Risiko-Regler das Mindestrating und sehen Sie die 10 Anleihen")}
${hinweis}
`,
  },
  {
    locale: "de",
    topic: "hy",
    group: "hy",
    status: "published",
    slug: "hochzinsanleihen-chancen-risiken",
    title: "Hochzinsanleihen: Chancen und Risiken von High Yield",
    seoTitle: "Hochzinsanleihen: Chancen und Risiken erklärt",
    metaDescription: "Was Hochzinsanleihen (High Yield) sind, warum sie mehr zahlen, welche Risiken sie haben und wie Sie sie sinnvoll mit anderen Anleihen vergleichen.",
    primaryKeyword: "hochzinsanleihen",
    relatedKeywords: ["high yield anleihen", "hochzinsanleihen euro", "junk bonds", "spekulative anleihen"],
    relatedSlugs: ["kreditrisiko-anleihen", "investment-grade-anleihen", "ausfallwahrscheinlichkeit-rating"],
    bodyHtml: `
<p><strong>Kurz gesagt:</strong> Hochzinsanleihen, auch High Yield genannt, stammen von Emittenten mit einem Rating unter BBB- (bei Moody's unter Baa3). Sie zahlen höhere Kupons und Renditen, weil Anleger ein deutlich größeres Risiko tragen, dass der Emittent nicht zahlt.</p>
<p>Am Anleihemarkt gibt es keinen Rabatt ohne Grund, und die Mehrrendite der Hochzinsanleihen ist keine Ausnahme. Sie ist real, doch ein Teil davon wird im Durchschnitt von den Ausfällen aufgezehrt, die tatsächlich eintreten. Dieser Ratgeber zeigt, woher die zusätzliche Rendite kommt, welche Risiken sie begleiten und worauf es beim Vergleich ankommt.</p>
<h2 id="warum">Warum rentieren Hochzinsanleihen höher?</h2>
<p>Der Renditeaufschlag gegenüber Staatsanleihen wie dem Bund, der <strong>Spread</strong>, ist eine Art Gefahrenzulage. Er entschädigt für drei Dinge: die Wahrscheinlichkeit eines Ausfalls, den erwarteten Verlust im Ausfall und die geringere Handelbarkeit der Anleihe. Kühlt sich die Konjunktur ab, weiten sich die Spreads schnell aus und die Kurse fallen. Hochzinsanleihen benehmen sich deshalb zeitweise eher wie Aktien als wie brave Rentenpapiere.</p>
<p>Die angezeigte Rendite ist also kein Versprechen dessen, was Sie verdienen werden, sondern der Preis, den der Markt für das Risiko verlangt.</p>
<h2 id="risiken">Welche Risiken sind die wichtigsten?</h2>
<ul>
<li><strong>Zahlungsausfall</strong>: das größte Risiko. Ein einziger Ausfall kann in einem schlecht gestreuten Depot die Kupons mehrerer Jahre zunichtemachen.</li>
<li><strong>Liquidität</strong>: Viele Emissionen sind klein und werden selten gehandelt; die Spanne zwischen Geld- und Briefkurs kann groß sein.</li>
<li><strong>Vorzeitige Kündigung</strong>: Viele Hochzinsanleihen sind kündbar. Fallen die Zinsen, kann der Emittent früher zurückzahlen, und die erwartete Rendite wird nicht erreicht.</li>
<li><strong>Herabstufung</strong>: Eine weitere Ratingsenkung drückt den Kurs.</li>
</ul>
<p>Unangenehm ist, dass diese Risiken selten allein kommen. In einem Abschwung häufen sich die Herabstufungen, die Spreads steigen und die Anleihen lassen sich schwerer verkaufen, alles zur selben Zeit. Sie reisen gewissermaßen in der Gruppe.</p>
<h2 id="bb-und-b">Ist High Yield gleich High Yield?</h2>
<p>Keineswegs. Der Bereich BB liegt am nächsten am <a href="/de/ratgeber/investment-grade-anleihen">Investment Grade</a> und hatte historisch deutlich weniger Ausfälle als die Bereiche B und CCC. Die Abstände sind beträchtlich: Die Tabelle zur <a href="/de/ratgeber/ausfallwahrscheinlichkeit-rating">Ausfallwahrscheinlichkeit nach Rating</a> zeigt die langjährigen Durchschnittswerte für jede Stufe.</p>
<p>Auf 10BONDS ist BB das niedrigste Rating, das Sie einstellen können. Spekulativere Bereiche und Anleihen ohne Rating erscheinen nie in unseren Listen; das Kellergeschoss bleibt abgeschlossen.</p>
<h2 id="vergleichen">Wie vergleichen Sie Hochzinsanleihen sinnvoll?</h2>
<p>Die Rendite kommt zuletzt. Schauen Sie zuerst auf Rating, <a href="/de/ratgeber/duration-anleihen">Duration</a> und Rang der Anleihe (vorrangig oder nachrangig). Vergleichen Sie dann den Spread mit dem ähnlicher Emittenten: Rentiert eine Anleihe deutlich höher als andere mit gleichem Rating, sieht der Markt ein besonderes Risiko. Wie Sie es einschätzen, erklärt der Ratgeber zum <a href="/de/ratgeber/kreditrisiko-anleihen">Kreditrisiko</a>.</p>
<p>Bei kündbaren Anleihen ist die <a href="/de/ratgeber/rendite-bis-faelligkeit">Rendite bis Fälligkeit</a> nur die halbe Geschichte; die Rendite bis zum ersten Kündigungstermin gehört genauso dazu.</p>
<p>Die Seite <a href="/de/anleihen/hochzinsanleihen">Hochzinsanleihen in Euro</a> zeigt täglich die höchsten Renditen, eine Anleihe je Emittent. Zum Vergleich mit solideren Emittenten eignet sich die Seite <a href="/de/anleihen/rendite-5-prozent">Anleihen mit rund 5 % Rendite</a>.</p>
<h2 id="gewicht">Wie viel Gewicht im Depot?</h2>
<p>Das hängt von Ihrer Situation, Ihren Zielen und Ihrer Risikotragfähigkeit ab; diese Entscheidung treffen Sie am besten mit einer zugelassenen Beratung. Allgemein gilt: Je höher die angestrebte Rendite, desto wichtiger wird die Streuung über viele Emittenten. Steuerlich gibt es keine Sonderbehandlung: Zinsen und Kursgewinne werden in Deutschland wie bei anderen Anleihen grundsätzlich mit der Abgeltungsteuer von 25 % zuzüglich Solidaritätszuschlag erfasst.</p>
<h2 id="faq">Häufige Fragen</h2>
<h3>Bedeutet ein Ausfall immer einen Totalverlust?</h3>
<p>Nein. Wie viel zurückfließt, hängt vom Rang der Anleihe und von den Sicherheiten ab. Die Verluste können aber erheblich sein.</p>
${cta("schieben Sie den Risiko-Regler bis BB und vergleichen Sie die Renditen")}
${hinweis}
`,
  },
  {
    locale: "de",
    topic: "compare",
    group: "compare-bonds-2026",
    status: "published",
    slug: "anleihen-2026-vergleichen",
    title: "Anleihen 2026: So vergleichen Sie Rendite, Rating und Laufzeit",
    seoTitle: "Beste Anleihen 2026: Rendite, Rating, Laufzeit",
    metaDescription: "Anleihen 2026 richtig vergleichen: Rendite bis Fälligkeit, Rating, Laufzeit und Duration, Bund und Unternehmensanleihen, Liquidität, Kosten, Steuern.",
    primaryKeyword: "beste anleihen 2026",
    relatedKeywords: ["anleihen vergleichen", "anleihen 2026", "rendite bis fälligkeit", "bund oder unternehmensanleihe"],
    relatedSlugs: ["rendite-bis-faelligkeit", "duration-anleihen", "staatsanleihen-oder-unternehmensanleihen", "kreditrisiko-anleihen"],
    bodyHtml: `
<p><strong>Stand: 19. Oktober 2026</strong></p>
<p><strong>Kurz gesagt:</strong> Die „beste“ Anleihe gibt es so wenig wie den besten Schuh: Es kommt darauf an, wer ihn trägt und wie weit er laufen will. Fair vergleichen Sie nur, wenn Sie Rendite bis Fälligkeit, Kreditrisiko, Laufzeit und Kaufkurs gleichzeitig betrachten; eine höhere Rendite allein bedeutet nicht automatisch bessere Konditionen.</p>
<p>Wer 2026 Anleihen für sein Depot sucht, steht vor einem gut gefüllten Regal: Bundesanleihen, Staatsanleihen anderer Euro-Länder wie OAT oder BTP, Unternehmensanleihen, kurze Laufzeiten und Papiere mit mehr als zehn Jahren Restlaufzeit. Die folgenden Schritte bringen Ordnung in diese Auswahl.</p>
<h2 id="rendite">Welche Rendite zählt beim Vergleich?</h2>
<p>Maßgeblich ist die <a href="/de/ratgeber/rendite-bis-faelligkeit">Rendite bis Fälligkeit</a> (Yield to Maturity, kurz YTM). Sie ist der Zinssatz, bei dem der Kaufkurs dem Barwert aller künftigen Zahlungen der Anleihe entspricht.</p>
<p>Anders als der Kupon berücksichtigt sie auch, was Sie bezahlt haben und was Sie bei Fälligkeit zurückbekommen. Eine Anleihe mit 3 % Jahreskupon, die Sie unter 100 kaufen, kann mehr als 3 % Rendite bieten. Kaufen Sie dieselbe Anleihe über 100, kann die Rendite unter den Kupon rutschen. Der Kupon ist das Etikett, die Rendite der Kassenbon.</p>
<p>Die berechnete Rendite setzt voraus, dass alle vertraglichen Zahlungen geleistet werden und Sie die Anleihe bis zur Fälligkeit halten. Eine garantierte Rendite ist sie nicht.</p>
<h2 id="rating">Wie lesen Sie das Rating?</h2>
<p>Ratingagenturen benoten die Bonität der Emittenten. Grob lassen sich zwei Lager unterscheiden:</p>
<table>
<thead><tr><th scope="col">Kategorie</th><th scope="col">S&amp;P-Rating (Richtwert)</th><th scope="col">Merkmal</th></tr></thead>
<tbody>
<tr><td>Investment Grade</td><td>AAA bis BBB−</td><td>Vergleichsweise hohe Bonität</td></tr>
<tr><td>Speculative Grade (Hochzins)</td><td>BB+ bis D</td><td>In der Regel höheres Kreditrisiko</td></tr>
</tbody>
</table>
<p>Das Rating bewertet die Kreditwürdigkeit, aus der Welt schafft es das Ausfallrisiko nicht. Selbst zwei Anleihen mit identischem Rating können sich bei Rendite, Handelbarkeit, Rang und Laufzeit deutlich unterscheiden, wie zwei Zeugnisse mit derselben Gesamtnote. Mehr dazu im Ratgeber zu <a href="/de/ratgeber/investment-grade-anleihen">Investment-Grade-Anleihen</a>.</p>
<h2 id="laufzeit">Welche Laufzeit: 3, 5, 7 oder 10 Jahre?</h2>
<p>Die Restlaufzeit ist einer der wichtigsten Parameter. Anleihen mit späterer Fälligkeit reagieren bei sonst gleichen Bedingungen meist stärker auf Zinsänderungen, und diese Empfindlichkeit misst die Duration. Zwei Begriffe sollten Sie auseinanderhalten:</p>
<ul>
<li><strong>Restlaufzeit</strong>: die Zeit bis zur vertraglichen Rückzahlung.</li>
<li><strong>Duration</strong>: ein Maß dafür, wie stark der Kurs auf Änderungen der Marktrenditen reagiert.</li>
</ul>
<p>Eine Anleihe mit zehn Jahren Restlaufzeit hat nicht zwingend eine Duration von zehn Jahren. Für einen fairen Vergleich lohnt der Blick auf beides; die Einzelheiten erklärt der Ratgeber zur <a href="/de/ratgeber/duration-anleihen">Duration</a>.</p>
<h2 id="bund-unternehmen">Bundesanleihen oder Unternehmensanleihen: Was unterscheidet sie?</h2>
<table>
<thead><tr><th scope="col">Merkmal</th><th scope="col">Bundesanleihen</th><th scope="col">Unternehmensanleihen</th></tr></thead>
<tbody>
<tr><td>Emittent</td><td>Bundesrepublik Deutschland</td><td>Unternehmen oder Bank</td></tr>
<tr><td>Kreditrisiko</td><td>An den Bund gebunden</td><td>An den Emittenten und die Ausgestaltung der Anleihe gebunden</td></tr>
<tr><td>Kupon</td><td>Fest, je nach Emission</td><td>Je nach Emissionsbedingungen</td></tr>
<tr><td>Liquidität</td><td>Je nach Emission</td><td>Je nach Emission</td></tr>
</tbody>
</table>
<p>Eine höhere Rendite bei Unternehmensanleihen kann ein höheres Kreditrisiko, geringere Liquidität oder besondere Vertragsklauseln widerspiegeln, meist steckt also etwas dahinter. Staatsanleihen anderer Länder wie OAT oder BTP liegen beim Risiko dazwischen und rentieren in der Regel über dem Bund. Mehr im Ratgeber <a href="/de/ratgeber/staatsanleihen-oder-unternehmensanleihen">Staatsanleihen oder Unternehmensanleihen?</a></p>
<h2 id="fuenf-punkte">Welche fünf Punkte sollten Sie prüfen?</h2>
<ul>
<li><strong>Rendite bis Fälligkeit</strong>: was der Marktpreis nach den Annahmen der Berechnung abwirft.</li>
<li><strong>Rating und Kreditrisiko</strong>: wie es um die Bonität des Emittenten steht.</li>
<li><strong>Laufzeit und Duration</strong>: wie lange das Geld gebunden ist und wie der Kurs auf Zinsen reagieren kann.</li>
<li><strong>Liquidität</strong>: wie leicht sich die Anleihe vor Fälligkeit wieder verkaufen lässt.</li>
<li><strong>Kosten und Steuern</strong>: Depot- und Ordergebühren sowie die Abgeltungsteuer von 25 % zuzüglich Solidaritätszuschlag mindern den tatsächlich erzielten Ertrag.</li>
</ul>
<h2 id="einfacher">Wie geht der Vergleich einfacher?</h2>
<p>Dutzende Anleihen einzeln durchzusehen ist etwa so vergnüglich wie eine Steuererklärung ohne Software. Ein Vergleichswerkzeug ordnet die Daten stattdessen nach einheitlichen Kriterien. Im Anleihen-Finder von 10BONDS wählen Sie zwei Parameter, Risikoniveau und gewünschte Laufzeit, und erhalten eine Auswahl von zehn Anleihen mit Rendite, Rating und Fälligkeit nach einer dokumentierten <a href="/de/methodik">Methodik</a>.</p>
<h2 id="faq">Häufige Fragen</h2>
<h3>Sind die Anleihen mit der höchsten Rendite die besten?</h3>
<p>Nicht unbedingt. Hohe Renditen spiegeln oft höhere Kredit-, Liquiditäts- oder Strukturrisiken wider.</p>
<h3>Kann ich mit einer Investment-Grade-Anleihe Geld verlieren?</h3>
<p>Ja. Das Rating garantiert keine Rückzahlung, und der Kurs kann fallen.</p>
<h3>Was passiert, wenn ich vor Fälligkeit verkaufe?</h3>
<p>Dann entscheidet die Marktlage am Verkaufstag über den Kurs. Am Ende kann ein Kursgewinn stehen oder ein Kursverlust.</p>
<h3>Sind Rendite bis Fälligkeit und Kupon dasselbe?</h3>
<p>Nein. Der Kupon ist die vertraglich vereinbarte regelmäßige Zahlung; die Rendite bis Fälligkeit bezieht zusätzlich den Kaufkurs und alle Zahlungen bis zur Rückzahlung ein.</p>
${cta("vergleichen Sie Anleihen nach Risiko und Laufzeit")}
${hinweis}
`,
  },
  {
    locale: "de",
    topic: "credit",
    group: "default-rates",
    status: "published",
    slug: "ausfallwahrscheinlichkeit-rating",
    title: "Wie hoch ist die historische Ausfallwahrscheinlichkeit bei BBB?",
    seoTitle: "Ausfallwahrscheinlichkeit nach Rating: BBB, A, BB",
    metaDescription: "Historische Ausfallraten nach Rating, von AAA bis CCC: BBB-Emittenten fielen in 1,40 % der Fälle binnen 5 und in 3,40 % binnen 10 Jahren aus (Langzeitdurchschnitt).",
    primaryKeyword: "ausfallwahrscheinlichkeit rating bbb",
    relatedKeywords: ["ausfallwahrscheinlichkeit rating", "ausfallraten nach rating", "default rate anleihen", "bbb anleihen ausfall"],
    relatedSlugs: ["kreditrisiko-anleihen", "investment-grade-anleihen", "hochzinsanleihen-chancen-risiken"],
    bodyHtml: `
<p><strong>Kurz gesagt:</strong> Laut öffentlichen historischen Ausfallstudien ist ein Emittent mit BBB-Rating in 0,15 % der Fälle innerhalb von 1 Jahr ausgefallen, in 1,40 % innerhalb von 5 Jahren und in 3,40 % innerhalb von 10 Jahren. Von 100 BBB-Emittenten haben also im Schnitt weniger als 4 binnen zehn Jahren ihre Gläubiger im Stich gelassen.</p>
<p>BBB ist die unterste Etage des Investment Grade, und entsprechend oft wird gefragt, wie wackelig sie ist. Die Tabelle beantwortet das nüchtern: Sie zeigt die durchschnittlichen kumulierten Ausfallraten für jede Ratingstufe über 1 bis 15 Jahre. Eine kumulierte Rate gibt an, welcher Anteil der Emittenten, die zu Beginn des Zeitraums dieses Rating trugen, bis zu dessen Ende ausgefallen ist.</p>
<h2 id="tabelle">Kumulierte Ausfallraten nach Rating (%)</h2>
<table><thead><tr><th scope="col">Rating</th><th scope="col">10BONDS-Risiko</th><th scope="col">1 Jahr</th><th scope="col">3 Jahre</th><th scope="col">5 Jahre</th><th scope="col">7 Jahre</th><th scope="col">10 Jahre</th><th scope="col">15 Jahre</th></tr></thead><tbody>
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
<p><em>Quelle: 10BONDS, auf Basis öffentlicher historischer Ausfallstudien: durchschnittliche kumulierte Ausfallraten von Unternehmen nach Ratingstufe (langjährige Durchschnitte, kombiniert und gerundet). Die Spalte „10BONDS-Risiko“ zeigt, welcher Risikostufe von 1 bis 10 jedes Rating in unserem Anleihen-Finder entspricht.</em></p>
<h2 id="lesen">Wie lesen Sie die Tabelle?</h2>
<p>Je schlechter das Rating, desto höher die Ausfallwahrscheinlichkeit, doch die Kurve verläuft nicht gleichmäßig, sondern mit einer deutlichen Stufe. Über 5 Jahre steigt die Rate von 1,40 % bei BBB auf 2,40 % bei BBB− und springt dann auf 5,20 % bei BB, der ersten vollwertigen Stufe im spekulativen Bereich. An der Grenze zwischen <a href="/de/ratgeber/investment-grade-anleihen">Investment Grade</a> (bis BBB−) und <a href="/de/ratgeber/hochzinsanleihen-chancen-risiken">Hochzins</a> (ab BB+) wechselt das Risiko gewissermaßen den Gang.</p>
<p>Die Zeit zählt ebenso wie das Rating. Eine Wahrscheinlichkeit über 1 Jahr mit einer über 10 Jahre zu vergleichen, wäre wie die Unfallstatistik einer Taxifahrt mit der eines ganzen Berufslebens. Für eine BBB-Anleihe, die in 5 Jahren fällig wird, ist die Spalte „5 Jahre“ die richtige.</p>
<h2 id="grenzen">Was sagt die Tabelle nicht?</h2>
<ul>
<li>Es sind Durchschnittswerte der Vergangenheit über viele Emittenten und Konjunkturzyklen, keine Prognose für einen einzelnen Emittenten.</li>
<li>Ein Ausfall heißt nicht, alles zu verlieren: Wie viel zurückfließt, hängt vom Rang der Anleihe und von Sicherheiten ab.</li>
<li>Die Daten betreffen Unternehmen. Staatsanleihen wie Bundesanleihen, OAT oder BTP haben eine andere Ausfallgeschichte.</li>
</ul>
<p>Statistik beschreibt die Herde, nicht das einzelne Schaf. Wer eine bestimmte Anleihe prüft, muss den einzelnen Emittenten trotzdem anschauen.</p>
<h2 id="nutzen">Wie nutzen Sie diese Zahlen im Depot?</h2>
<p>Die Tabelle übersetzt eine Risikostufe im Anleihen-Finder in Geschichte: Sie zeigt, was diese Stufe in der Vergangenheit bedeutet hat. Wer etwa eine Anleihe mit 10BONDS-Risiko 5 betrachtet, findet hier die Ausfallraten der Stufe BBB. Eine höhere Rendite bei schlechterem Rating ist der Ausgleich für das höhere Risiko; die Streuung über viele Emittenten begrenzt die Folgen eines einzelnen Ausfalls. Wie Rating, Ausfallwahrscheinlichkeit und erwarteter Verlust zusammenspielen, erklärt der Ratgeber zum <a href="/de/ratgeber/kreditrisiko-anleihen">Kreditrisiko bei Anleihen</a>.</p>
<h2 id="faq">Häufige Fragen</h2>
<h3>Wie oft ist ein AAA-Emittent ausgefallen?</h3>
<p>Selten, aber nicht nie: im langjährigen Durchschnitt in 0,31 % der Fälle innerhalb von 10 Jahren und in 0,51 % innerhalb von 15 Jahren.</p>
<h3>Wie hoch ist die Ausfallrate bei BB über 5 Jahre?</h3>
<p>Im langjährigen Durchschnitt 5,20 %, also fast das Vierfache der 1,40 % bei BBB.</p>
${cta("vergleichen Sie Anleihen nach Risiko, Rendite und Duration")}
${hinweis}
`,
  },
  {
    locale: "de",
    topic: "compare",
    group: "bonds-vs-etf",
    status: "published",
    slug: "anleihen-etf-oder-einzelanleihen",
    title: "Anleihen-ETF oder Einzelanleihen: Was ist der Unterschied?",
    seoTitle: "Anleihen-ETF oder Einzelanleihen? Unterschiede",
    metaDescription: "Einzelanleihe bis zur Fälligkeit oder Anleihen-ETF: planbare Rendite, Laufzeit, Kosten, Streuung, Zinsrisiko und Steuern einfach verglichen.",
    primaryKeyword: "anleihen etf oder einzelanleihen",
    relatedKeywords: ["anleihen etf", "einzelanleihen kaufen", "rentenfonds oder anleihen", "anleihen direkt kaufen"],
    relatedSlugs: ["rendite-bis-faelligkeit", "duration-anleihen", "staatsanleihen-oder-unternehmensanleihen", "bundesanleihen"],
    bodyHtml: `
<p><strong>Kurz gesagt:</strong> Eine Einzelanleihe hat ein festes Fälligkeitsdatum; wer sie bis zum Ende hält, kennt die Rendite schon beim Kauf, sofern der Emittent zahlt. Ein klassischer Anleihen-ETF hat keine Fälligkeit, tauscht laufend Anleihen aus und schwankt deshalb dauerhaft mit den Zinsen, bietet dafür aber breite Streuung mit wenig Kapital.</p>
<p>Beide Wege führen an den Anleihemarkt, nur mit sehr unterschiedlichem Fahrplan. Eine Bundesanleihe, eine OAT oder eine Unternehmensanleihe im Depot ist ein einzelnes Wertpapier eines einzelnen Emittenten, also eine Fahrkarte mit Zielbahnhof. Ein Anleihen-ETF ist ein börsengehandelter Fonds, der einen Korb aus vielen Anleihen hält und meist einem Index folgt, eher eine Ringbahn, die nie ankommt.</p>
<h2 id="faelligkeit">Was passiert bei Fälligkeit?</h2>
<p>Eine klassische Einzelanleihe zahlt an einem festen Tag den Nennwert zurück. Die <a href="/de/ratgeber/rendite-bis-faelligkeit">Rendite bis Fälligkeit</a> steht mit dem Kaufkurs fest: Was der Kurs zwischendurch treibt, spielt keine Rolle, wenn Sie bis zum Ende halten und der Emittent zahlt.</p>
<p>Ein klassischer Anleihen-ETF dagegen zahlt nie an einem bestimmten Tag zurück. Er verkauft Anleihen, bevor sie fällig werden, und ersetzt sie durch neue mit längerer Laufzeit. Seine Duration bleibt dadurch ungefähr konstant, und sein Kurs reagiert dauerhaft auf Zinsänderungen. Die ausgewiesene Rendite eines ETF ist ein Durchschnitt über alle gehaltenen Anleihen, der sich täglich ändert.</p>
<p>Daneben gibt es Anleihen-ETFs mit festem Laufzeitende. Sie verhalten sich anders als die klassischen und ähneln eher einem Korb aus Anleihen mit ähnlicher Fälligkeit.</p>
<h2 id="streuung">Wie unterscheiden sich Streuung und Risiko?</h2>
<p>Mit einer Einzelanleihe tragen Sie das Kreditrisiko genau eines Emittenten. Bei Bundesanleihen ist das kaum der Rede wert, bei einer Unternehmensanleihe durchaus. Ein breit aufgestellter ETF verteilt das Geld auf viele Emittenten und Laufzeiten, sodass ein einzelner Ausfall weniger ins Gewicht fällt.</p>
<p>Auch mit mehreren Einzelanleihen lässt sich streuen, das verlangt aber mehr Kapital, denn manche Unternehmensanleihen haben eine hohe Mindeststückelung. Das Zinsänderungsrisiko tragen Sie in beiden Fällen; wie stark es wirkt, zeigt die <a href="/de/ratgeber/duration-anleihen">Duration</a>.</p>
<h2 id="kosten">Welche Kosten fallen an?</h2>
<ul>
<li><strong>Einzelanleihe</strong>: Ordergebühren beim Kauf und gegebenenfalls beim Verkauf, die Geld-Brief-Spanne an der Börse und eventuell Depotgebühren. Laufende Fondskosten gibt es nicht.</li>
<li><strong>Anleihen-ETF</strong>: zusätzlich die laufenden Kosten des Fonds (TER), die jedes Jahr still und leise vom Fondsvermögen abgehen, plus Ordergebühren und Spanne. Viele Broker bieten ETF-Sparpläne an.</li>
</ul>
<h2 id="steuern">Wie sieht es mit den Steuern aus?</h2>
<p>Zinsen und Kursgewinne aus Einzelanleihen unterliegen in Deutschland grundsätzlich der Abgeltungsteuer von 25 % zuzüglich Solidaritätszuschlag und gegebenenfalls Kirchensteuer. Für Fonds und ETFs gelten die Regeln des Investmentsteuergesetzes, etwa die Vorabpauschale bei thesaurierenden Fonds, ein Begriff, der schon beim Aussprechen nach Formular klingt. Lassen Sie Ihre persönliche Situation von Ihrer Bank oder einem Steuerberater prüfen.</p>
<h2 id="vergleich">Anleihen-ETF oder Einzelanleihen: die Unterschiede im Überblick</h2>
<table>
<thead><tr><th scope="col">Merkmal</th><th scope="col">Einzelanleihe</th><th scope="col">Klassischer Anleihen-ETF</th></tr></thead>
<tbody>
<tr><td>Fälligkeit</td><td>Fester Rückzahlungstermin</td><td>Keine, laufende Umschichtung</td></tr>
<tr><td>Rendite</td><td>Beim Kauf bekannt, wenn bis Fälligkeit gehalten</td><td>Durchschnitt, ändert sich täglich</td></tr>
<tr><td>Streuung</td><td>Ein Emittent</td><td>Viele Emittenten und Laufzeiten</td></tr>
<tr><td>Laufende Kosten</td><td>Keine Fondskosten</td><td>TER</td></tr>
<tr><td>Zinsrisiko</td><td>Nimmt mit der Restlaufzeit ab</td><td>Bleibt etwa gleich</td></tr>
</tbody>
</table>
<h2 id="wann">Wann passt welcher Weg?</h2>
<p>Eine Antwort für alle gibt es nicht, weil die beiden Instrumente unterschiedlich gebaut sind. Wer zu einem bestimmten Termin einen festen Betrag braucht, achtet oft auf Anleihen mit genau dieser Fälligkeit. Wer mit wenig Kapital breit streuen oder regelmäßig sparen möchte, schaut eher auf ETFs. Ein Entweder-oder ist es ohnehin nicht: Beide lassen sich kombinieren. Wie sich Staats- und Unternehmensanleihen unterscheiden, erklärt der Ratgeber <a href="/de/ratgeber/staatsanleihen-oder-unternehmensanleihen">Staatsanleihen oder Unternehmensanleihen?</a></p>
<h2 id="faq">Häufige Fragen</h2>
<h3>Kann ein Anleihen-ETF Verluste machen, wenn ich lange halte?</h3>
<p>Ja. Ein klassischer ETF wird nie fällig, also gibt es auch keinen Termin, an dem die Rückzahlung Kursverluste wieder ausgleicht. Umgekehrt profitiert er davon, dass er neue Anleihen zu höheren Zinsen kauft.</p>
<h3>Wo sehe ich die Rendite einzelner Anleihen?</h3>
<p>Im Anleihen-Finder von 10BONDS und auf der Seite zu den <a href="/de/anleihen/bundesanleihen">Bundesanleihen</a> mit der aktuellen Zinskurve.</p>
${cta("finden Sie Einzelanleihen nach Rendite und Laufzeit")}
${hinweis}
`,
  },
];
