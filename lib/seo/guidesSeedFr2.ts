import type { SeedGuide } from "./guidesSeed";

// Second batch of French guides, written for French investors (OAT, Bund, compte-titres, PEA, flat tax) from the
// Italian and English versions of the same translation groups. No yields, prices or statistics beyond those in the
// source guides; the default-rate table reproduces the combined figures of the Italian page exactly.

const cta = (text: string) => `<p><strong>Essayez :</strong> <a href="/fr">${text}</a>. Deux curseurs, dix obligations, sans engagement.</p>`;

const disclaimer = `<p><em>Ces informations sont fournies à titre informatif et pédagogique. Elles ne constituent pas une recommandation d'investissement personnalisée. Les rendements et les notations évoluent dans le temps.</em></p>`;

export const SEED_GUIDES_FR2: SeedGuide[] = [
  {
    locale: "fr",
    topic: "duration",
    group: "duration",
    status: "published",
    slug: "duration-obligations",
    title: "Duration d'une obligation : définition et utilisation",
    seoTitle: "Duration d'une obligation : définition et calcul",
    metaDescription: "La duration mesure la sensibilité du prix d'une obligation aux taux. Duration de Macaulay, duration modifiée, exemple chiffré et règle pratique.",
    primaryKeyword: "duration obligation",
    relatedKeywords: ["duration modifiée", "duration de Macaulay", "sensibilité obligation", "risque de taux"],
    relatedSlugs: ["calcul-rendement-obligation", "obligations-investment-grade", "oat-obligations-etat"],
    bodyHtml: `
<p><strong>En bref :</strong> la duration dit de combien le prix d'une obligation bouge quand les taux bougent. Avec une duration modifiée de 5, une hausse des taux d'un point fait reculer le prix d'environ 5 %.</p>
<p>Si le <a href="/fr/guides/calcul-rendement-obligation">rendement à l'échéance</a> est le chiffre que tout le monde regarde, la duration est celui qu'on regrette de ne pas avoir regardé. C'est la deuxième donnée à vérifier avant de choisir une obligation, qu'il s'agisse d'une OAT, d'un Bund ou d'une obligation d'entreprise. En France, on dit aussi <em>sensibilité</em>, terme qu'affectionnent les fiches des fonds obligataires.</p>
<h2 id="deux-durations">Duration de Macaulay ou duration modifiée : quelle différence ?</h2>
<p>La <strong>duration de Macaulay</strong> est la durée de vie moyenne des flux de l'obligation (coupons et remboursement), chacun pondéré par sa valeur actualisée. Elle se compte en années et ne dépasse jamais la durée de vie restante, pour une raison de simple bon sens : les coupons arrivent avant le remboursement final.</p>
<p>La <strong>duration modifiée</strong> en découle directement (on divise la première par 1 + rendement) et mesure sans détour la sensibilité du prix aux taux. Moins élégante, plus utile : c'est elle que 10BONDS emploie dans ses curseurs et ses tableaux.</p>
<h2 id="regle">Comment utiliser la duration au quotidien ?</h2>
<p>La règle tient au dos d'un ticket de métro. Avec une duration modifiée de <em>D</em> années, si les rendements du marché montent d'un point de pourcentage, le prix baisse d'environ <em>D</em> %. S'ils reculent d'un point, il monte d'environ <em>D</em> %.</p>
<table>
<thead><tr><th scope="col">Duration modifiée</th><th scope="col">Effet d'une hausse des taux d'un point</th><th scope="col">Profil</th></tr></thead>
<tbody>
<tr><td>2</td><td>environ −2 % sur le prix</td><td>Faible sensibilité aux taux</td></tr>
<tr><td>5</td><td>environ −5 % sur le prix</td><td>Zone intermédiaire</td></tr>
<tr><td>10</td><td>environ −10 % sur le prix</td><td>Forte sensibilité aux taux</td></tr>
</tbody>
</table>
<p><strong>Exemple :</strong> prenons une obligation à coupon de 3 %, remboursable dans 5 ans et offrant un rendement de 4,13 %. Sa duration de Macaulay ressort à environ 4,7 ans, sa duration modifiée à environ 4,5. La règle fonctionne bien pour de petites variations. Quand les taux font de grands écarts, entre en scène la <strong>convexité</strong>, qui rend les hausses de prix un peu plus fortes que les baisses : une asymétrie, pour une fois, plutôt aimable envers le porteur.</p>
<h2 id="facteurs">Qu'est-ce qui allonge ou raccourcit la duration ?</h2>
<ul>
<li><strong>L'échéance</strong> : plus elle est lointaine, plus la duration s'allonge. Une OAT à 30 ans réagit aux taux bien plus vivement qu'une OAT à 2 ans.</li>
<li><strong>Le coupon</strong> : un coupon généreux rend davantage d'argent plus tôt, ce qui raccourcit la duration. À l'extrême, une obligation zéro coupon a une duration de Macaulay égale à sa durée de vie restante : tout arrive à la fin, d'un seul coup.</li>
<li><strong>Le niveau des rendements</strong> : des rendements plus élevés raccourcissent légèrement la duration.</li>
</ul>
<h2 id="horizon">Comment choisir sa duration selon son horizon ?</h2>
<p>Si vous savez déjà quand vous aurez besoin de votre argent, une duration proche de cet horizon limite le risque. Que les taux montent, et le prix baisse, certes, mais les coupons se réinvestissent à des taux plus élevés : les deux effets tendent à se neutraliser, comme les deux plateaux d'une balance. Le cas inverse est moins confortable : avec un horizon court et une duration longue, une hausse des taux peut obliger à revendre en moins-value.</p>
<p>Pour comparer les obligations par tranche de duration : <a href="/fr/obligations/duration-2-ans">environ 2 ans</a>, <a href="/fr/obligations/duration-5-ans">environ 5 ans</a>, <a href="/fr/obligations/duration-10-ans">environ 10 ans</a>.</p>
<h2 id="limites">Que ne mesure pas la duration ?</h2>
<p>La duration ne mesure qu'une chose, le <strong>risque de taux</strong>. Sur la solidité de l'émetteur, elle reste muette comme une carpe : il faut pour cela la notation et le spread, présentés dans le guide sur le <a href="/fr/guides/risque-de-credit-obligataire">risque de crédit</a>. Elle est aussi mal à l'aise avec les obligations à taux variable ou remboursables par anticipation, qui réagissent autrement aux taux, et elle ne s'applique pas telle quelle aux OAT indexées sur l'inflation.</p>
<h2 id="faq">Questions fréquentes</h2>
<h3>Duration et échéance, est-ce la même chose ?</h3>
<p>Non. L'échéance est une date, celle du remboursement ; la duration est une mesure, celle de la sensibilité du prix aux taux. Une obligation à 10 ans n'a pas forcément une duration de 10.</p>
<h3>Un ETF obligataire a-t-il une duration ?</h3>
<p>Oui : la duration moyenne de son portefeuille. Mais elle reste à peu près stable dans le temps, alors que celle d'une obligation détenue en direct raccourcit à mesure que l'échéance approche. Voir notre comparaison <a href="/fr/guides/obligations-ou-etf-obligataires">obligations ou ETF obligataires</a>.</p>
${cta("choisissez la duration qui colle à votre horizon et le rendement que vous visez")}
${disclaimer}
`,
  },
  {
    locale: "fr",
    topic: "ig",
    group: "ig",
    status: "published",
    slug: "obligations-investment-grade",
    title: "Obligations investment grade : définition et notations",
    seoTitle: "Obligations investment grade : définition et notes",
    metaDescription: "Ce que signifie investment grade, comment lire les notes de S&P, Moody's et Fitch, et ce qui change entre BBB- et BB+ pour un investisseur.",
    primaryKeyword: "obligations investment grade",
    relatedKeywords: ["notation obligation", "BBB-", "obligations notées", "fallen angel"],
    relatedSlugs: ["risque-de-credit-obligataire", "obligations-haut-rendement", "probabilite-defaut-notation"],
    bodyHtml: `
<p><strong>En bref :</strong> une obligation <em>investment grade</em> porte une note d'au moins BBB- chez S&amp;P et Fitch (Baa3 chez Moody's) : les agences estiment son risque de défaut faible. Sous ce seuil commence le haut rendement, ou catégorie spéculative.</p>
<p>C'est la ligne de démarcation la plus surveillée du marché obligataire, une sorte de physionomiste à l'entrée du club : de nombreux fonds, assureurs et investisseurs institutionnels n'ont le droit de détenir que des obligations situées au-dessus. Les OAT, les Bund et la plupart des grandes entreprises du CAC 40 se trouvent du bon côté de la porte.</p>
<h2 id="echelle">Comment lire l'échelle des notations ?</h2>
<p>Les trois grandes agences emploient des échelles voisines, à quelques majuscules et chiffres près. Relèvent de l'investment grade :</p>
<table>
<thead><tr><th scope="col">S&amp;P et Fitch</th><th scope="col">Moody's</th><th scope="col">Appréciation</th></tr></thead>
<tbody>
<tr><td>AAA</td><td>Aaa</td><td>Qualité maximale</td></tr>
<tr><td>AA+, AA, AA-</td><td>Aa1, Aa2, Aa3</td><td>Très haute qualité</td></tr>
<tr><td>A+, A, A-</td><td>A1, A2, A3</td><td>Haute qualité</td></tr>
<tr><td>BBB+, BBB, BBB-</td><td>Baa1, Baa2, Baa3</td><td>Qualité satisfaisante</td></tr>
</tbody>
</table>
<p>À partir de BB+ (Ba1 chez Moody's) commence le <a href="/fr/guides/obligations-haut-rendement">haut rendement</a>, ou <em>high yield</em>, que l'on dit aussi « spéculatif ».</p>
<h2 id="ce-que-dit">Que dit vraiment une notation ?</h2>
<p>Une notation est une opinion : celle d'une agence sur la capacité de l'émetteur à payer ses coupons et à rembourser son capital. Ce n'est ni une garantie ni un conseil d'achat. Historiquement, les défauts ont été bien plus rares chez les émetteurs investment grade que chez les émetteurs high yield ; rares ne veut pas dire impossibles. Notre page sur les <a href="/fr/guides/probabilite-defaut-notation">probabilités de défaut par notation</a> reprend les moyennes tirées des études historiques publiques sur les défauts. Une note peut enfin changer pendant que vous détenez le titre : la France elle-même a vu la sienne abaissée ces dernières années.</p>
<h2 id="seuil">Pourquoi le seuil BBB- compte-t-il autant ?</h2>
<p>Lorsqu'un émetteur glisse de BBB- à BB+, il devient un <strong>fallen angel</strong> (« ange déchu »), expression qui dit assez bien la hauteur de la chute. Beaucoup d'investisseurs sont alors tenus de vendre, et le prix peut reculer davantage que ne le justifierait la seule dégradation du crédit : on vend rarement bien quand tout le monde vend en même temps. Voilà pourquoi les obligations notées BBB- rapportent en général un peu plus que celles notées A : le marché facture d'avance le risque de franchir la ligne.</p>
<h2 id="rendement">Combien rapportent les obligations investment grade ?</h2>
<p>Trois ingrédients font le rendement : le niveau général des taux (celui de l'OAT et du Bund), la <a href="/fr/guides/duration-obligations">duration</a> et la notation. À duration égale, la règle générale ne varie guère : plus la note baisse, plus le rendement monte. Les chiffres du jour figurent sur la page des <a href="/fr/obligations/investment-grade">obligations investment grade en euros</a>, actualisée quotidiennement, et sur celle des <a href="/fr/obligations/meilleures-obligations">obligations investment grade les mieux rémunérées</a>.</p>
<p>Pour un particulier résident en France, les coupons perçus sur un compte-titres relèvent en principe du prélèvement forfaitaire unique (la « flat tax »), avec une option possible pour le barème progressif. Vérifiez le taux en vigueur : en matière fiscale, le législateur a la plume facile. Les rendements affichés sur 10BONDS sont bruts.</p>
<h2 id="agences">Que faire quand les agences ne sont pas d'accord ?</h2>
<p>Il arrive que deux agences ne voient pas la même obligation : BBB- pour l'une, BB+ pour l'autre. Sur 10BONDS, nous affichons plutôt un risque de 1 à 10, une échelle maison qui n'est pas une notation. Quant aux obligations sans notation, elles n'apparaissent pas dans nos listes.</p>
${cta("fixez la notation minimale avec le curseur de risque, puis comparez les 10 obligations")}
${disclaimer}
`,
  },
  {
    locale: "fr",
    topic: "hy",
    group: "hy",
    status: "published",
    slug: "obligations-haut-rendement",
    title: "Obligations à haut rendement : risques et fonctionnement",
    seoTitle: "Obligations haut rendement (high yield) : les risques",
    metaDescription: "Les obligations à haut rendement (high yield) expliquées : pourquoi elles rapportent plus, quels risques elles comportent et comment les comparer.",
    primaryKeyword: "obligations haut rendement",
    relatedKeywords: ["obligations high yield", "high yield euro", "obligations spéculatives", "junk bonds"],
    relatedSlugs: ["risque-de-credit-obligataire", "obligations-investment-grade", "probabilite-defaut-notation"],
    bodyHtml: `
<p><strong>En bref :</strong> les obligations à haut rendement, ou <em>high yield</em>, sont émises par des sociétés notées sous BBB- (Baa3 chez Moody's). Si elles rapportent davantage, c'est que le risque de ne pas être payé par l'émetteur est plus élevé.</p>
<p>Le high yield européen n'est pas peuplé que d'inconnus : on y croise nombre d'entreprises familières du grand public, françaises comprises. Une enseigne que l'on voit tous les jours ne dit rien de sa note de crédit. Voici comment fonctionnent ces obligations, et comment les comparer sans se laisser hypnotiser par le seul rendement.</p>
<h2 id="pourquoi">Pourquoi les obligations high yield rapportent-elles plus ?</h2>
<p>Le surplus de rendement par rapport aux emprunts d'État comme l'OAT ou le Bund, le <strong>spread</strong>, rémunère trois choses : la probabilité de défaut, la perte attendue si le défaut survient et la difficulté plus grande à revendre le titre. Quand l'économie ralentit, les spreads high yield s'écartent vite et les prix reculent. Ces obligations portent le costume d'une obligation, mais ont en partie, par gros temps, le tempérament d'une action.</p>
<h2 id="risques">Quels sont les principaux risques ?</h2>
<ul>
<li><strong>Le défaut</strong> : c'est le risque principal. Dans un portefeuille peu diversifié, un seul défaut peut effacer des années de coupons.</li>
<li><strong>La liquidité</strong> : de nombreuses émissions sont modestes et peu échangées, et l'écart entre prix d'achat et prix de vente peut être important.</li>
<li><strong>Le remboursement anticipé</strong> : beaucoup d'obligations high yield sont remboursables au gré de l'émetteur (<em>callable</em>). Si les taux baissent, l'émetteur peut rembourser, et le rendement espéré reste sur le papier.</li>
<li><strong>La dégradation</strong> : un nouvel abaissement de la note fait chuter le prix.</li>
</ul>
<h2 id="bb-b">Tout le high yield se vaut-il ?</h2>
<p>Non, et la différence n'a rien de cosmétique. La catégorie BB, voisine immédiate de l'investment grade, a connu historiquement des défauts bien moins fréquents que les catégories B et CCC. Les moyennes historiques publiques figurent dans notre tableau des <a href="/fr/guides/probabilite-defaut-notation">probabilités de défaut par notation</a>.</p>
<table>
<thead><tr><th scope="col">Catégorie</th><th scope="col">Position</th><th scope="col">Sur 10BONDS</th></tr></thead>
<tbody>
<tr><td>BB+, BB, BB-</td><td>Juste sous l'investment grade</td><td>Sélectionnable (note la plus basse proposée)</td></tr>
<tr><td>B+, B, B-</td><td>Spéculatif</td><td>Non affiché</td></tr>
<tr><td>CCC et en dessous</td><td>Très spéculatif</td><td>Non affiché</td></tr>
<tr><td>Sans notation</td><td>Non évalué</td><td>Non affiché</td></tr>
</tbody>
</table>
<h2 id="comparer">Comment comparer des obligations à haut rendement ?</h2>
<p>Avant de regarder le rendement, regardez ce qui le justifie : la notation, la <a href="/fr/guides/duration-obligations">duration</a> et le rang de la créance (senior ou subordonnée). Comparez ensuite le spread à celui d'émetteurs semblables. Si une obligation paie beaucoup plus que ses pairs de même note, ce n'est pas de la générosité : le marché y voit un risque particulier. Le guide sur le <a href="/fr/guides/risque-de-credit-obligataire">risque de crédit</a> explique comment le lire.</p>
<p>La page des <a href="/fr/obligations/haut-rendement">obligations à haut rendement en euros</a> affiche chaque jour les rendements les plus élevés, à raison d'une obligation par émetteur. Pour mettre ces chiffres en regard de titres plus solides, voyez les <a href="/fr/obligations/rendement-5-pourcent">obligations proches de 5 %</a> ou les <a href="/fr/guides/obligations-investment-grade">obligations investment grade</a>.</p>
<h2 id="place">Quelle place donner au high yield ?</h2>
<p>Tout dépend de votre situation, de vos objectifs et du risque que vous êtes en mesure de supporter : c'est une décision à prendre, le cas échéant, avec un conseiller habilité. Une règle, elle, vaut pour tout le monde : plus le rendement recherché est élevé, plus il importe de diversifier entre de nombreux émetteurs. Côté fiscalité, les coupons d'obligations détenues sur un compte-titres relèvent en principe du prélèvement forfaitaire unique, comme ceux des OAT ; les obligations, en revanche, ne peuvent pas être logées en direct dans un PEA.</p>
${cta("descendez le curseur de risque jusqu'à BB et regardez ce que deviennent les rendements")}
${disclaimer}
`,
  },
  {
    locale: "fr",
    topic: "compare",
    group: "compare-bonds-2026",
    status: "published",
    slug: "obligations-2026-comment-comparer",
    title: "Obligations 2026 : comment comparer rendements, notations et échéances",
    seoTitle: "Meilleures obligations 2026 : comment les comparer",
    metaDescription: "Comparer des obligations en 2026 : rendement à l'échéance, notation, échéance et duration, OAT et obligations d'entreprise, liquidité, frais et fiscalité.",
    primaryKeyword: "meilleures obligations 2026",
    relatedKeywords: ["comparer obligations", "rendement à l'échéance", "notation obligations", "oat ou obligations d'entreprise"],
    relatedSlugs: ["calcul-rendement-obligation", "duration-obligations", "obligations-etat-ou-entreprise", "risque-de-credit-obligataire"],
    bodyHtml: `
<p><strong>Mis à jour : 19 octobre 2026</strong></p>
<p><strong>En bref :</strong> pour comparer des obligations en 2026, regardez ensemble le rendement à l'échéance, le risque de crédit, l'échéance (et la duration) et le prix d'achat. Un rendement plus élevé, à lui seul, ne fait pas de meilleures conditions.</p>
<p>L'épargnant français n'a que l'embarras du choix, et c'est bien là l'embarras : OAT, Bund et autres emprunts d'État européens comme les BTP italiens, obligations d'entreprise, émissions courtes, titres à plus de dix ans. Voici une méthode en six points pour trier tout cela avec objectivité.</p>
<h2 id="rendement">1. Pourquoi partir du rendement à l'échéance ?</h2>
<p>Le <a href="/fr/guides/calcul-rendement-obligation">rendement à l'échéance</a>, ou taux actuariel (<em>yield to maturity</em>), est le taux qui rend égaux le prix d'achat et la valeur actuelle des flux futurs prévus par le titre. Le coupon est la vitrine ; le rendement à l'échéance est l'addition, puisqu'il tient compte du prix payé et du remboursement final.</p>
<p>Ainsi, une obligation à coupon annuel de 3 % achetée sous le pair peut offrir un rendement supérieur à 3 % ; achetée au-dessus du pair, elle peut rapporter moins que son coupon. Le calcul repose sur deux hypothèses : tous les flux contractuels sont payés et le titre est conservé jusqu'à l'échéance. Ce n'est donc pas un rendement garanti.</p>
<h2 id="notation">2. Comment interpréter la notation ?</h2>
<p>Les agences de notation rangent la qualité de crédit des émetteurs en deux grandes familles :</p>
<table>
<thead><tr><th scope="col">Catégorie</th><th scope="col">Note S&amp;P indicative</th><th scope="col">Caractéristiques</th></tr></thead>
<tbody>
<tr><td>Investment grade</td><td>De AAA à BBB−</td><td>Qualité de crédit relativement plus élevée</td></tr>
<tr><td>Spéculatif (high yield)</td><td>De BB+ à D</td><td>Risque de crédit généralement plus élevé</td></tr>
</tbody>
</table>
<p>La note évalue la solvabilité ; elle ne fait pas disparaître le risque de défaut. Deux obligations de même note peuvent se ressembler autant que deux bouteilles de la même appellation, c'est-à-dire parfois assez peu : rendement, liquidité, rang de subordination et échéance diffèrent parfois nettement. Voir aussi nos guides sur les <a href="/fr/guides/obligations-investment-grade">obligations investment grade</a> et les <a href="/fr/guides/probabilite-defaut-notation">probabilités de défaut par notation</a>.</p>
<h2 id="echeance">3. Quelle échéance comparer : 3, 5, 7 ou 10 ans ?</h2>
<p>À conditions égales, plus l'échéance est lointaine, plus le prix réagit aux variations de taux. Cette sensibilité porte un nom, la <a href="/fr/guides/duration-obligations">duration</a>, et il faut se garder de la confondre avec sa cousine :</p>
<ul>
<li><strong>L'échéance résiduelle</strong> : le temps qui reste jusqu'au remboursement contractuel ;</li>
<li><strong>La duration</strong> : la sensibilité du prix aux variations des rendements du marché.</li>
</ul>
<p>Une obligation à dix ans d'échéance n'a pas nécessairement une duration de dix ans : regardez toujours les deux chiffres.</p>
<h2 id="oat-entreprise">4. OAT et obligations d'entreprise : quelles différences ?</h2>
<table>
<thead><tr><th scope="col">Caractéristique</th><th scope="col">OAT</th><th scope="col">Obligations d'entreprise</th></tr></thead>
<tbody>
<tr><td>Émetteur</td><td>État français (Agence France Trésor)</td><td>Société ou banque</td></tr>
<tr><td>Risque de crédit</td><td>Lié à l'État français</td><td>Lié à l'émetteur et à la structure du titre</td></tr>
<tr><td>Coupons</td><td>Fixes et annuels pour les OAT classiques</td><td>Selon les conditions d'émission</td></tr>
<tr><td>Fiscalité (particulier résident, compte-titres)</td><td>En principe prélèvement forfaitaire unique</td><td>En principe prélèvement forfaitaire unique</td></tr>
<tr><td>Liquidité</td><td>Généralement élevée</td><td>Variable selon l'émission</td></tr>
</tbody>
</table>
<p>Contrairement à l'Italie, où les BTP bénéficient d'un taux réduit, la France ne réserve pas en principe aux OAT une fiscalité plus douce qu'aux obligations d'entreprise : le fisc ne fait pas de remise à ceux qui prêtent à l'État. Un rendement plus élevé côté entreprise peut donc refléter un risque de crédit supérieur, une liquidité moindre ou d'autres clauses. Notre guide <a href="/fr/guides/obligations-etat-ou-entreprise">obligations d'État ou d'entreprise ?</a> détaille la comparaison.</p>
<h2 id="cinq-points">5. Quels sont les cinq points à vérifier avant de comparer deux obligations ?</h2>
<ul>
<li><strong>Rendement à l'échéance</strong> : ce que rapporte le prix de marché, sous les hypothèses du calcul.</li>
<li><strong>Notation et risque de crédit</strong> : la qualité de crédit de l'émetteur.</li>
<li><strong>Échéance et duration</strong> : la durée du placement et la manière dont le prix peut réagir aux taux.</li>
<li><strong>Liquidité</strong> : la facilité avec laquelle on revend avant l'échéance.</li>
<li><strong>Frais et fiscalité</strong> : leur poids sur le rendement réellement encaissé (frais de courtage, droits de garde, flat tax ; les obligations ne peuvent pas être détenues en direct dans un PEA).</li>
</ul>
<h2 id="simple">6. Comment comparer plus simplement ?</h2>
<p>Éplucher des dizaines de titres un par un est un passe-temps honorable pour les longues soirées d'hiver, beaucoup moins pour le reste de l'année. Un outil de comparaison range l'information selon des critères homogènes. Avec <a href="/fr">le comparateur 10BONDS</a>, vous réglez deux paramètres, le niveau de risque et la durée souhaitée, et obtenez une sélection de dix obligations, une par émetteur, avec rendements, notations et échéances, selon une méthodologie documentée.</p>
<h2 id="faq">Questions fréquentes</h2>
<h3>Les obligations au rendement le plus élevé sont-elles les plus intéressantes ?</h3>
<p>Pas forcément. Un rendement élevé est souvent le reflet d'un risque plus important, qu'il soit de crédit, de liquidité ou de structure.</p>
<h3>Peut-on perdre de l'argent avec une obligation investment grade ?</h3>
<p>Oui. La notation ne garantit pas le remboursement, et le prix de marché peut baisser entre-temps.</p>
<h3>Que se passe-t-il si je vends avant l'échéance ?</h3>
<p>Vous vendez au prix du marché du jour, quel qu'il soit : selon les conditions du moment, vous réaliserez une plus-value ou une moins-value.</p>
<h3>Rendement à l'échéance et coupon, est-ce la même chose ?</h3>
<p>Non. Le coupon est le paiement périodique fixé par le contrat ; le rendement à l'échéance intègre en plus le prix d'achat et l'ensemble des flux jusqu'au remboursement.</p>
${cta("choisissez votre niveau de risque et votre horizon, puis comparez dix obligations")}
${disclaimer}
`,
  },
  {
    locale: "fr",
    topic: "credit",
    group: "default-rates",
    status: "published",
    slug: "probabilite-defaut-notation",
    title: "Quelle est la probabilité historique de défaut d'une note BBB ?",
    seoTitle: "Probabilité de défaut par notation : BBB, A, BB…",
    metaDescription: "Probabilité historique de défaut par notation, de AAA à CCC : un émetteur BBB a fait défaut dans 1,40 % des cas à 5 ans et 3,40 % à 10 ans (moyennes de long terme).",
    primaryKeyword: "probabilité de défaut notation bbb",
    relatedKeywords: ["probabilité de défaut par notation", "taux de défaut par notation", "défaut obligation bbb"],
    relatedSlugs: ["risque-de-credit-obligataire", "obligations-investment-grade", "obligations-haut-rendement"],
    bodyHtml: `
<p><strong>En bref :</strong> selon les études historiques publiques sur les défauts, un émetteur noté BBB a fait défaut dans 0,15 % des cas en 1 an, 1,40 % en 5 ans et 3,40 % en 10 ans. Autrement dit, sur 100 émetteurs BBB, moins de 4 en moyenne ont fait défaut en dix ans.</p>
<p>Le tableau qui suit donne les taux de défaut cumulés moyens pour chaque cran de notation, de 1 à 15 ans. Un taux cumulé se lit simplement : c'est la part des émetteurs qui portaient cette note au début de la période et qui ont fait défaut avant qu'elle ne s'achève.</p>
<h2 id="tableau">Quels sont les taux de défaut cumulés par notation ?</h2>
<table><thead><tr><th scope="col">Note</th><th scope="col">Risque 10BONDS</th><th scope="col">1 an</th><th scope="col">3 ans</th><th scope="col">5 ans</th><th scope="col">7 ans</th><th scope="col">10 ans</th><th scope="col">15 ans</th></tr></thead><tbody>
<tr><td>AAA</td><td>1</td><td>0,00 %</td><td>0,01 %</td><td>0,07 %</td><td>0,17 %</td><td>0,31 %</td><td>0,51 %</td></tr>
<tr><td>AA+</td><td>2</td><td>0,00 %</td><td>0,04 %</td><td>0,14 %</td><td>0,26 %</td><td>0,46 %</td><td>0,69 %</td></tr>
<tr><td>AA</td><td>2</td><td>0,01 %</td><td>0,07 %</td><td>0,20 %</td><td>0,36 %</td><td>0,60 %</td><td>0,97 %</td></tr>
<tr><td>AA−</td><td>2</td><td>0,03 %</td><td>0,12 %</td><td>0,30 %</td><td>0,49 %</td><td>0,78 %</td><td>1,20 %</td></tr>
<tr><td>A+</td><td>3</td><td>0,04 %</td><td>0,17 %</td><td>0,38 %</td><td>0,62 %</td><td>1,10 %</td><td>1,80 %</td></tr>
<tr><td>A</td><td>3</td><td>0,05 %</td><td>0,21 %</td><td>0,48 %</td><td>0,80 %</td><td>1,40 %</td><td>2,20 %</td></tr>
<tr><td>A−</td><td>3</td><td>0,07 %</td><td>0,28 %</td><td>0,59 %</td><td>0,98 %</td><td>1,70 %</td><td>2,60 %</td></tr>
<tr><td>BBB+</td><td>4</td><td>0,10 %</td><td>0,44 %</td><td>0,93 %</td><td>1,50 %</td><td>2,40 %</td><td>3,90 %</td></tr>
<tr><td>BBB</td><td>5</td><td>0,15 %</td><td>0,65 %</td><td>1,40 %</td><td>2,10 %</td><td>3,40 %</td><td>5,30 %</td></tr>
<tr><td>BBB−</td><td>6</td><td>0,26 %</td><td>1,10 %</td><td>2,40 %</td><td>3,70 %</td><td>5,50 %</td><td>8,00 %</td></tr>
<tr><td>BB+</td><td>7</td><td>0,41 %</td><td>1,80 %</td><td>3,60 %</td><td>5,40 %</td><td>7,90 %</td><td>11,20 %</td></tr>
<tr><td>BB</td><td>7</td><td>0,63 %</td><td>2,70 %</td><td>5,20 %</td><td>7,60 %</td><td>10,80 %</td><td>14,80 %</td></tr>
<tr><td>BB−</td><td>7</td><td>1,00 %</td><td>4,30 %</td><td>8,00 %</td><td>11,20 %</td><td>15,20 %</td><td>20,10 %</td></tr>
<tr><td>B+</td><td>8</td><td>1,60 %</td><td>6,00 %</td><td>10,30 %</td><td>14,00 %</td><td>18,40 %</td><td>23,80 %</td></tr>
<tr><td>B</td><td>8</td><td>2,60 %</td><td>8,80 %</td><td>14,00 %</td><td>18,20 %</td><td>23,10 %</td><td>28,50 %</td></tr>
<tr><td>B−</td><td>8</td><td>4,60 %</td><td>13,20 %</td><td>19,70 %</td><td>24,50 %</td><td>29,90 %</td><td>35,40 %</td></tr>
<tr><td>CCC+</td><td>9</td><td>12,00 %</td><td>24,50 %</td><td>32,30 %</td><td>37,40 %</td><td>42,60 %</td><td>47,50 %</td></tr>
<tr><td>CCC / C</td><td>9–10</td><td>24,50 %</td><td>38,90 %</td><td>45,60 %</td><td>49,80 %</td><td>54,10 %</td><td>58,00 %</td></tr>
</tbody></table>
<p><em>Source : 10BONDS, d'après les études historiques publiques sur les défauts : taux de défaut cumulés moyens des entreprises par cran de notation (moyennes de long terme, combinées et arrondies). La colonne « Risque 10BONDS » indique le score de risque de 1 à 10 auquel correspond chaque note dans notre comparateur.</em></p>
<h2 id="lire">Comment lire ce tableau ?</h2>
<p>Plus la note descend, plus la probabilité de défaut grimpe, et pas à pas réguliers : à 5 ans, elle passe de 1,40 % pour BBB à 2,40 % pour BBB−, puis bondit à 5,20 % pour BB, premier cran pleinement spéculatif. L'escalier, à cet endroit, change franchement de pente. La frontière entre <a href="/fr/guides/obligations-investment-grade">investment grade</a> (jusqu'à BBB−) et catégorie spéculative (à partir de BB+) est précisément le point où le risque change de rythme.</p>
<p>Le temps compte autant que la note. Une probabilité à 1 an ne se compare pas à une probabilité à 10 ans, pas plus qu'on ne compare un sprint à un marathon : pour une obligation BBB remboursable dans 5 ans, c'est la colonne des 5 ans qui fait foi. Dans le <a href="/fr">comparateur 10BONDS</a>, le curseur de risque reprend la correspondance de la deuxième colonne.</p>
<h2 id="limites">Que ne dit pas ce tableau ?</h2>
<p>Un tableau, si bien rangé soit-il, a ses angles morts. Trois en particulier :</p>
<ul>
<li>Ce sont des moyennes passées, calculées sur de nombreux émetteurs et plusieurs cycles économiques : elles ne prédisent pas le sort d'un émetteur donné.</li>
<li>Un défaut ne veut pas dire tout perdre : le montant récupéré dépend du rang de la créance (senior ou subordonnée) et des garanties attachées à l'obligation.</li>
<li>Les données concernent les entreprises ; les emprunts d'État comme les OAT, les Bund ou les BTP ont leur propre historique de défaut, qui est différent.</li>
</ul>
<h2 id="faq">Questions fréquentes</h2>
<h3>Une obligation BBB est-elle risquée ?</h3>
<p>Elle reste dans l'investment grade. Selon les moyennes historiques publiques, le taux de défaut cumulé à 10 ans d'un émetteur BBB est de 3,40 %, contre 10,80 % pour BB et 23,10 % pour B.</p>
<h3>Comment relier probabilité de défaut et rendement ?</h3>
<p>Le spread d'une obligation rémunère notamment la perte attendue, qui combine deux éléments : la probabilité de défaut et le montant perdu si le défaut survient. Le guide sur le <a href="/fr/guides/risque-de-credit-obligataire">risque de crédit</a> montre comment ces pièces s'emboîtent, et celui sur les <a href="/fr/guides/obligations-haut-rendement">obligations à haut rendement</a> détaille les catégories spéculatives.</p>
${cta("comparez des obligations selon le risque, le rendement et la duration")}
${disclaimer}
`,
  },
];
