import type { SeedGuide } from "./guidesSeed";

// The owner's three French articles (19 Oct 2026). His text is kept word for word (only turned into HTML; his notes to us
// are left out). The sections marked "complément" below his text were added at his request so the French guides match
// the Italian ones: live data, the calculator, worked numbers and a FAQ. Educational only, no invented market data.
// A paragraph [[10bonds:...]] is replaced on the page by a live block (see GuidePage): bonds:<comparison id> or calculator.
// Each article takes over an earlier French guide on the same topic (oldSlug), which now redirects to it.

export type OwnerFrGuide = SeedGuide & { oldSlug: string };

const updated = `<p><strong>Mis à jour : 19 octobre 2026</strong></p>`;

export const SEED_GUIDES_OWNER_FR: OwnerFrGuide[] = [
  {
    locale: "fr", topic: "gov", group: "gov", status: "published",
    oldSlug: "oat-obligations-etat-francaises",
    slug: "oat-obligations-etat",
    title: "OAT françaises : comprendre les obligations d'État, leur rendement et leurs risques",
    seoTitle: "OAT françaises : rendement, fonctionnement et risques",
    metaDescription: "Comprenez le fonctionnement des OAT françaises, la différence entre coupon et rendement, les risques et les critères pour comparer les obligations d'État.",
    primaryKeyword: "obligations d'État françaises",
    relatedKeywords: ["OAT France", "OAT rendement", "acheter OAT", "obligations du Trésor"],
    relatedSlugs: ["calcul-rendement-obligation", "obligations-etat-ou-entreprise", "duration-obligations", "obligations-ou-etf-obligataires"],
    bodyHtml: `${updated}
<p>Prêter à l'État français est sans doute le placement le plus banal qui soit, et c'est précisément pour cela qu'on le comprend si mal. Les <strong>Obligations Assimilables du Trésor (OAT)</strong> pèsent lourd sur le marché obligataire européen : c'est par elles que l'État finance ses besoins à moyen et long terme, et par elles que l'investisseur s'expose à la dette souveraine française.</p>
<p>Sur le papier, le contrat tient sur un timbre-poste. Vous prêtez un capital à l'État, il vous verse le cas échéant des intérêts chaque année, puis il vous rembourse à l'échéance. Le rendement que vous obtiendrez réellement dépend pourtant de détails qui ne sautent pas aux yeux : le prix auquel vous achetez, le temps qu'il reste à courir et l'humeur du marché ce jour-là.</p>
<p>Sans ces mécanismes en tête, impossible de départager deux OAT, ou de mesurer ce qui les sépare d'une obligation d'entreprise.</p>
<h2 id="qu-est-ce-qu-une-oat">Qu'est-ce qu'une OAT ?</h2>
<p>Une OAT est un titre de dette émis par la République française. Celui qui l'achète devient créancier de l'État, lequel s'engage à respecter les conditions financières fixées lors de l'émission.</p>
<p>C'est l'Agence France Trésor, gestionnaire de la dette et de la trésorerie publiques, qui émet ces titres. Leur maturité initiale s'étend de deux à cinquante ans : de quoi couvrir à peu près tous les horizons, de l'achat d'une voiture à celui des petits-enfants.</p>
<p>L'OAT classique est une obligation à taux fixe. Elle verse un coupon annuel et rembourse son nominal à la date d'échéance. Une partie des OAT est néanmoins indexée sur l'inflation et obéit à d'autres règles.</p>
<p>Le marché français a une spécialité maison : l'assimilation. Plutôt que de créer à chaque fois un nouveau titre, l'État peut émettre de nouvelles tranches d'une obligation qui existe déjà. Ces tranches partagent exactement les mêmes caractéristiques contractuelles, ce qui concentre les échanges sur un petit nombre de lignes et nourrit leur liquidité.</p>
<h2 id="coupon-et-rendement">Coupon et rendement : pourquoi faut-il les distinguer ?</h2>
<p>Si vous ne retenez qu'une chose de cet article, que ce soit celle-ci.</p>
<p>Le coupon est le montant d'intérêt calculé sur la valeur nominale. Le rendement actuariel, qu'on appelle aussi rendement à l'échéance, mesure la rémunération théorique de votre placement compte tenu du prix payé et des flux futurs prévus. Le premier est gravé dans le contrat, le second dépend du jour où vous entrez.</p>
<p>Prenons une obligation fictive de nominal 1 000 €, avec un coupon annuel de 3 % et une échéance dans cinq ans.</p>
<p>Achetée 1 000 €, elle verse 30 € par an et son rendement actuariel est de 3 %, avant frais et fiscalité, dans cet exemple simplifié. Rien à signaler.</p>
<p>Achetée 950 €, elle verse toujours 30 € par an. Mais l'investisseur empoche aussi, si le remboursement a bien lieu, la différence entre ses 950 € et les 1 000 € rendus à l'échéance. Son rendement actuariel passe alors au-dessus de 3 %.</p>
<p>Payée 1 050 €, la même obligation verrait au contraire son rendement actuariel fondre.</p>
<p>Voilà pourquoi une OAT à 4 % de coupon ne rapporte pas forcément davantage qu'une OAT à 2 %. Le coupon, c'est l'étiquette ; le rendement, c'est ce qu'il y a dans la boîte.</p>
<h2 id="prix-des-oat">Pourquoi le prix des OAT évolue-t-il ?</h2>
<p>Une fois émises, les OAT changent de mains sur le marché secondaire. Leur cours suit la conjoncture, les anticipations de taux d'intérêt, la perception du risque souverain et l'appétit des investisseurs.</p>
<p>La règle de base fonctionne comme une balançoire : quand les rendements exigés par le marché montent, le prix des obligations à taux fixe déjà en circulation tend à baisser. Quand ces rendements reculent, leur prix tend à remonter.</p>
<p>L'amplitude du mouvement dépend surtout de la sensibilité du titre aux taux, que l'on mesure par sa duration.</p>
<p>Toutes choses égales par ailleurs, une OAT à vingt ans peut tanguer bien davantage qu'une obligation qui arrive à échéance dans deux ans.</p>
<p>Cette volatilité ne gêne guère celui qui garde son titre jusqu'au bout. Elle compte en revanche beaucoup pour celui qui envisage de revendre avant l'échéance.</p>
<h2 id="trois-oat">Trois OAT, trois profils différents</h2>
<p>Pour rendre tout cela concret, prenons trois obligations françaises dont l'Agence France Trésor publie les caractéristiques contractuelles.</p>
<table>
<thead><tr><th scope="col">Émission</th><th scope="col">Coupon annuel</th><th scope="col">Échéance</th></tr></thead>
<tbody>
<tr><td>OAT FR0013286192</td><td>0,75 %</td><td>25 mai 2028</td></tr>
<tr><td>OAT FR001400Z2L7</td><td>2,70 %</td><td>25 février 2031</td></tr>
<tr><td>OAT FR0014007L00</td><td>0,00 %</td><td>25 mai 2032</td></tr>
</tbody>
</table>
<p>Elles se distinguent par leur coupon et par leur date de remboursement.</p>
<p>L'OAT à coupon zéro ne verse rien en cours de route, ce qui ne veut pas dire qu'elle ne rapporte rien. Son rendement tient tout entier dans l'écart entre son prix d'acquisition et les montants contractuellement dus, compte tenu de son échéance.</p>
<p>Les deux autres versent des coupons, mais leurs taux nominaux ne disent pas laquelle offre le rendement actuariel le plus élevé.</p>
<p>Pour trancher, il faut leur prix de marché à une date donnée. Le tableau présente des caractéristiques contractuelles, pas des rendements actuels.</p>
<h2 id="risques">Quels sont les risques d'une obligation d'État française ?</h2>
<p>Qu'elle soit émise par un État ne rend pas une obligation sans risque.</p>
<p>Le premier risque est celui de crédit : la capacité de l'émetteur à honorer ses engagements financiers. Vient ensuite le risque de taux, qui pèse surtout sur celui qui revend avant l'échéance.</p>
<p>L'inflation joue aussi les trouble-fêtes. Une obligation à coupon fixe peut verser chacun de ses paiements nominaux à l'euro près et perdre malgré tout du pouvoir d'achat si les prix s'envolent.</p>
<p>Reste la liquidité, qui n'est pas la même d'une émission à l'autre. Certaines OAT se négocient en continu, d'autres affichent des écarts plus larges entre prix acheteur et prix vendeur.</p>
<h2 id="comparer-europe">Comment comparer les OAT avec d'autres obligations européennes ?</h2>
<p>Comparer les seuls rendements affichés, c'est comparer des menus sans regarder les plats : on obtient souvent des conclusions incomplètes.</p>
<p>La méthode sérieuse consiste à rapprocher des obligations de durées ou de durations comparables, puis à regarder quelle rémunération supplémentaire paie la différence de risque de crédit.</p>
<p>Une obligation d'entreprise française ou allemande peut ainsi afficher un rendement supérieur à celui d'une OAT de duration voisine. L'écart peut refléter le risque propre à l'entreprise, la liquidité du titre ou sa structure contractuelle.</p>
<p>Il faut aussi vérifier les éventuelles clauses de remboursement anticipé, la devise et les frais de transaction.</p>
<h2 id="rendements-oat-aujourd-hui">Les rendements des OAT aujourd'hui</h2>
<p>Le tableau qui suit ajoute aux caractéristiques contractuelles vues plus haut ce qui leur manquait : des rendements de marché. Il s'appuie sur les données obligataires de 10BONDS, mises à jour chaque jour ouvré, et retient une OAT à taux fixe par année d'échéance. On obtient ainsi une courbe des taux française simplifiée.</p>
<p>[[10bonds:bonds:gov-fr]]</p>
<p>Le rendement de chaque ligne est un rendement actuariel brut, calculé sur le dernier prix disponible, avant frais et fiscalité. La duration indique la sensibilité du prix aux taux : avec une duration de 5, une hausse des taux d'un point ferait reculer le prix d'environ 5 %. La date des données est indiquée au-dessus du tableau. Les OAT indexées sur l'inflation en sont exclues, car leur rendement réel ne se compare pas directement à un rendement nominal.</p>
<p>La courbe complète, actualisée chaque jour, se trouve sur la page <a href="/fr/obligations/oat">rendements des OAT par échéance</a>.</p>
<h2 id="spread-oat-bund">OAT, Bund et BTP : lire le spread</h2>
<p>Seul, le rendement d'une OAT ne dit pas grand-chose. Il devient parlant quand on le pose à côté de celui des autres grands emprunteurs souverains de la zone euro. L'écart avec un Bund allemand de même échéance, le <strong>spread OAT-Bund</strong>, mesure la prime que les investisseurs réclament pour prêter à la France plutôt qu'à l'Allemagne.</p>
<p>Ce spread s'élargit quand le marché doute de la trajectoire des finances publiques ou de la stabilité politique, et se resserre quand la confiance revient. Il sert en somme de thermomètre. De l'autre côté, les BTP italiens offrent en général un rendement supérieur à celui des OAT, en contrepartie d'une notation plus basse.</p>
<p>Vous pouvez comparer, échéance par échéance, la courbe des <a href="/fr/obligations/oat">OAT</a> avec celle des <a href="/fr/obligations/bund-allemands">Bund allemands</a> et des <a href="/fr/obligations/btp-italiens">BTP italiens</a>.</p>
<h2 id="oat-indexees">OATi et OAT€i : les OAT indexées sur l'inflation</h2>
<p>L'Agence France Trésor émet aussi des OAT dont le capital suit l'inflation. L'<strong>OATi</strong> est indexée sur l'indice des prix à la consommation français hors tabac, l'<strong>OAT€i</strong> sur l'indice des prix de la zone euro hors tabac. Le nominal est réévalué au rythme de l'indice et le coupon se calcule sur ce nominal réévalué.</p>
<p>Ces titres protègent contre une inflation plus forte que prévu. Leur rendement s'exprime en termes réels et ne se compare donc pas directement à celui d'une OAT classique. L'écart entre les deux, le point mort d'inflation, donne l'inflation moyenne que le marché anticipe.</p>
<h2 id="acheter-oat">Comment acheter des OAT en direct ?</h2>
<p>Le particulier achète ses OAT sur le marché secondaire, depuis un compte-titres ouvert dans une banque ou chez un courtier. Les frais varient beaucoup d'un intermédiaire à l'autre : courtage, montant minimum, droits de garde. Notre <a href="/fr/courtiers-obligations">comparatif des courtiers pour acheter des obligations</a> les chiffre pour plusieurs montants à partir des grilles tarifaires officielles.</p>
<p>Le PEA, lui, ne peut pas accueillir d'obligations détenues en direct. Pour un résident fiscal français, les coupons et plus-values encaissés en compte-titres relèvent en principe du prélèvement forfaitaire unique : 12,8 % d'impôt sur le revenu et, depuis le 1<sup>er</sup> janvier 2026, 18,6 % de prélèvements sociaux, soit 31,4 % au total, avec une option possible pour le barème progressif. Notre guide sur le <a href="/fr/guides/calcul-rendement-obligation">calcul du rendement d'une obligation</a> montre sur un exemple chiffré ce que cette fiscalité retire au rendement.</p>
<h2 id="faq">Questions fréquentes</h2>
<h3>Quelle est la différence entre une OAT et un livret d'épargne ?</h3>
<p>Le livret réglementé garantit le capital à tout moment, mais son taux peut changer. L'OAT, elle, verse un coupon fixé à l'émission et rembourse son nominal à l'échéance ; avant cette date, son prix bouge, et une revente anticipée peut se solder par une perte comme par un gain.</p>
<h3>Une OAT peut-elle perdre de la valeur ?</h3>
<p>Oui. Quand les taux de marché montent, le prix des OAT déjà émises baisse, et d'autant plus que leur duration est longue. Gardée jusqu'à l'échéance, l'OAT rembourse son nominal, à condition que l'État honore ses engagements.</p>
<h3>Quel montant faut-il pour acheter une OAT ?</h3>
<p>Le nominal unitaire d'une OAT est en général de 1 euro. Les intermédiaires imposent toutefois souvent un montant ou des frais minimums qui rendent les petits ordres coûteux : jetez un œil à la grille tarifaire de votre courtier avant de passer commande.</p>
<h3>Où trouver le rendement de l'OAT à 10 ans ?</h3>
<p>Le tableau de cette page et notre page <a href="/fr/obligations/oat">rendements des OAT</a> donnent le rendement des OAT par année d'échéance, avec la date des données. Pour l'OAT à 10 ans, retenez la ligne dont l'échéance tombe au plus près de dix ans.</p>
<h2 id="comparer-10bonds">Comparer les obligations avec 10BONDS</h2>
<p>10BONDS passe les obligations européennes au crible de deux critères simples : une duration et un rendement annuel cible.</p>
<p>La plateforme propose ensuite une sélection comparative de dix émissions, avec leurs caractéristiques financières, pour examiner côte à côte ce qui les sépare en rendement et en risque.</p>
<p><a class="cta" href="/fr">Comparer les obligations européennes sur 10BONDS</a></p>
<h3>Sources</h3>
<ul>
<li>Agence France Trésor — Présentation des OAT : <a href="https://www.aft.gouv.fr/fr/presentation-oat">https://www.aft.gouv.fr/fr/presentation-oat</a></li>
<li>Agence France Trésor — Les OAT aux particuliers : <a href="https://www.aft.gouv.fr/fr/oat-particuliers">https://www.aft.gouv.fr/fr/oat-particuliers</a></li>
<li>AMF — Comprendre les obligations avant d'investir : <a href="https://www.amf-france.org/fr/espace-epargnants/comprendre-les-produits-financiers/actions-obligations/obligations/comprendre-les-obligations-avant-dinvestir">https://www.amf-france.org/fr/espace-epargnants/comprendre-les-produits-financiers/actions-obligations/obligations/comprendre-les-obligations-avant-dinvestir</a></li>
<li>Direction générale des Finances publiques — Les revenus mobiliers : <a href="https://www.impots.gouv.fr/particulier/les-revenus-mobiliers">https://www.impots.gouv.fr/particulier/les-revenus-mobiliers</a></li>
</ul>
<p><em>Cet article est publié à des fins d'information générale. Il ne constitue pas un conseil en investissement personnalisé. Les exemples ne sont pas des recommandations d'achat.</em></p>
`,
  },
  {
    locale: "fr", topic: "ytm", group: "ytm", status: "published",
    oldSlug: "rendement-a-l-echeance",
    slug: "calcul-rendement-obligation",
    title: "Comment calculer le rendement d'une obligation ? Comprendre le taux actuariel",
    seoTitle: "Calcul du rendement d'une obligation : guide et exemple",
    metaDescription: "Comment calculer le rendement actuariel d'une obligation ? Découvrez la différence avec le coupon, l'effet du prix d'achat et des exemples de calcul.",
    primaryKeyword: "calcul rendement obligation",
    relatedKeywords: ["rendement actuariel obligation", "taux de rendement à l'échéance", "coupon obligation"],
    relatedSlugs: ["oat-obligations-etat", "duration-obligations", "risque-de-credit-obligataire", "obligations-ou-etf-obligataires"],
    bodyHtml: `${updated}
<p>Ouvrez la fiche d'une obligation et les pourcentages tombent en rafale : taux du coupon, rendement courant, rendement à l'échéance, rendement net. Ils ont l'air de cousins. Ils ne mesurent pourtant pas la même chose.</p>
<p>Le <strong>rendement actuariel à l'échéance</strong>, que les anglophones appellent <em>Yield to Maturity</em> (YTM), est celui qui rend le plus de services quand il s'agit de comparer des obligations aux coupons et aux prix différents.</p>
<p>Sa force tient à ce qu'il embrasse tous les flux financiers contractuellement prévus, jusqu'au remboursement du titre.</p>
<p>Encore faut-il savoir comment on le calcule, et où s'arrête ce qu'il peut dire.</p>
<h2 id="coupon-rendement">Pourquoi le coupon ne correspond-il pas au rendement ?</h2>
<p>Le coupon est fixé par les conditions de l'obligation. Pour un titre à taux fixe, il représente en général un pourcentage de la valeur nominale, quel que soit le prix auquel le titre s'achète ensuite sur le marché secondaire.</p>
<p>Prenons une obligation de 1 000 € de valeur nominale, qui verse un coupon annuel de 40 €.</p>
<p>Son taux nominal est donc de 4 %.</p>
<p>Si elle se négocie à 950 €, ces 40 € représentent déjà environ 4,21 % du prix payé. C'est le rendement courant simplifié, celui qu'on obtient avant de penser au remboursement final.</p>
<p>Le rendement actuariel pousse le raisonnement jusqu'au bout : il compte aussi l'écart entre les 950 € déboursés et les 1 000 € qui doivent être rendus à l'échéance. Autrement dit, il lit le contrat jusqu'à la dernière ligne.</p>
<h2 id="exemple-cinq-ans">Un exemple de rendement à cinq ans</h2>
<p>Voici notre obligation fictive, carte d'identité comprise.</p>
<table>
<thead><tr><th scope="col">Caractéristique</th><th scope="col">Valeur</th></tr></thead>
<tbody>
<tr><td>Valeur nominale</td><td>1 000 €</td></tr>
<tr><td>Prix d'achat</td><td>950 €</td></tr>
<tr><td>Coupon annuel</td><td>40 €</td></tr>
<tr><td>Durée restante</td><td>5 ans</td></tr>
<tr><td>Remboursement final</td><td>1 000 €</td></tr>
</tbody>
</table>
<p>Dans ce scénario simplifié, l'investisseur touche cinq coupons annuels de 40 € et récupère 1 000 € au terme de la cinquième année.</p>
<p>Le taux actuariel est celui qui, appliqué à ces flux futurs pour les actualiser, ramène exactement aux 950 € investis au départ.</p>
<p>Dans notre exemple, ce taux ressort à environ <strong>5,16 % par an</strong>.</p>
<p>D'où vient ce surplus par rapport au coupon de 4 % ? De l'écart de 50 € entre le prix d'achat et le remboursement prévu, qui s'ajoute aux coupons. On a acheté le billet un peu en dessous du prix affiché, et la différence finit dans la poche.</p>
<p>Ce rendement reste théorique : il s'entend avant fiscalité et frais, et suppose que tous les flux soient intégralement payés.</p>
<h2 id="formule">La formule du rendement actuariel</h2>
<p>Pour une obligation à coupon annuel, l'équation s'écrit :</p>
<p><strong>P = Σ[C / (1 + r)^t] + N / (1 + r)^n</strong></p>
<p>P est le prix payé, C le coupon annuel, N le nominal remboursé, n le nombre d'années restantes, et r le taux actuariel que l'on cherche.</p>
<p>Tout l'exercice consiste à trouver la valeur de r qui rend le prix payé égal à la somme des flux actualisés.</p>
<p>Dans la vraie vie, l'affaire se corse. Les obligations obéissent à des fréquences de coupons, des conventions de décompte des jours et des dates de règlement variées. Le prix affiché est parfois un prix « pied de coupon », auquel viennent s'ajouter les intérêts courus.</p>
<p>Mieux vaut donc confier le calcul à un moteur obligataire qui connaît les caractéristiques exactes du titre plutôt que de se contenter d'une approximation annuelle.</p>
<h2 id="pair">Le prix au-dessus ou en dessous du pair</h2>
<p>Acheter une obligation sous le pair, c'est-à-dire en dessous de sa valeur nominale de remboursement, revient à s'offrir un petit bonus final qui peut gonfler le rendement à l'échéance.</p>
<p>À l'inverse, l'achat au-dessus du pair peut rogner le rendement actuariel, même quand le coupon a fière allure.</p>
<p>Voilà comment deux obligations aux coupons très différents peuvent finir par afficher des rendements presque jumeaux.</p>
<p>Imaginons deux titres qui arrivent à échéance dans cinq ans. L'un verse un coupon de 2 %, l'autre de 5 %. Tant qu'on ignore leurs prix, conclure que le second rapporte forcément davantage serait une erreur.</p>
<p>Le marché, qui n'est pas né de la dernière pluie, ajuste les prix en fonction des rendements exigés et des risques de chaque émission.</p>
<h2 id="frais-fiscalite">Quel est l'impact des frais et de la fiscalité ?</h2>
<p>Le rendement actuariel brut n'est pas ce que l'investisseur encaissera réellement.</p>
<p>Les frais de transaction alourdissent la somme effectivement déboursée. La fiscalité, elle, peut amputer les coupons reçus ainsi que le gain imposable lié au remboursement ou à la vente.</p>
<p>En France, le traitement dépend notamment de la résidence fiscale, du mode de détention, de la nature des revenus et de l'option fiscale choisie.</p>
<p>Pour les revenus mobiliers soumis au régime forfaitaire standard, l'administration fiscale indique en 2026 un prélèvement global de 31,4 % : 12,8 % au titre de l'impôt sur le revenu et 18,6 % de prélèvements sociaux. Il existe des situations particulières, ainsi qu'une option possible pour le barème progressif.</p>
<p>Le rendement net se calcule donc à partir des flux après impôts et frais. Appliquer mécaniquement un pourcentage au rendement actuariel brut donne un chiffre faux, ce qui est rarement le but recherché.</p>
<h2 id="garanti">Le rendement à l'échéance est-il garanti ?</h2>
<p>Non. Le calcul suppose que l'émetteur paie ce qu'il a promis et que le titre soit conservé jusqu'à son échéance contractuelle.</p>
<p>Il ne dit pas forcément à quel taux les coupons intermédiaires pourront être replacés. Il ne garantit pas davantage le résultat d'une vente anticipée.</p>
<p>Il n'en reste pas moins un excellent outil de comparaison, à condition de le compléter par une évaluation du risque de crédit, de la duration et de la liquidité.</p>
<h2 id="calculateur">Calculez le rendement actuariel d'une obligation</h2>
<p>Le calculateur ci-dessous applique la méthode exposée plus haut, mais avec les dates exactes : fréquence des coupons, date d'achat et coupon couru sont pris en compte. Le prix se saisit pour 100 de nominal. Pour retrouver l'exemple de cet article, entrez un prix de 95, un coupon de 4 %, un paiement annuel et une échéance à cinq ans : le rendement brut affiché tourne autour de 5,16 %. Le bouton « PFU 31,4 % » affiche le rendement net correspondant.</p>
<p>[[10bonds:calculator]]</p>
<p>Le même outil existe en pleine page : <a href="/fr/calculateurs/rendement-actuariel">calculateur de rendement actuariel brut et net</a>. Tous les calculs se font dans votre navigateur ; aucune donnée n'est envoyée.</p>
<h2 id="pas-a-pas">Le calcul pas à pas</h2>
<p>Il n'existe pas de formule qui livre r directement. On procède comme au jeu du « plus ou moins » : on teste un taux, on calcule la valeur actuelle des flux, puis on corrige. Reprenons l'obligation achetée 950 € :</p>
<table>
<thead><tr><th scope="col">Taux testé</th><th scope="col">Valeur actuelle des flux</th><th scope="col">Comparaison avec 950 €</th></tr></thead>
<tbody>
<tr><td>5,00 %</td><td>956,71 €</td><td>trop élevée : le taux est plus haut</td></tr>
<tr><td>5,20 %</td><td>948,33 €</td><td>trop basse : le taux est plus bas</td></tr>
<tr><td>5,16 %</td><td>950,00 €</td><td>égalité : c'est le rendement actuariel</td></tr>
</tbody>
</table>
<p>Pour vérifier d'un coup d'œil, une formule approchée tombe tout près : <code>(C + (N − P) / n) / ((N + P) / 2)</code>, soit (40 + 50 / 5) / 975 = 5,13 %. L'écart avec le calcul exact se creuse quand l'échéance est lointaine ou que le prix s'éloigne du pair.</p>
<h2 id="tableur">Dans un tableur</h2>
<p>Dans Excel ou LibreOffice en français, la fonction <code>RENDEMENT.TITRE</code> calcule le rendement actuariel à partir de la date de règlement, de la date d'échéance, du taux du coupon, du prix, de la valeur de remboursement et du nombre de coupons par an. La fonction <code>TRI</code> aboutit au même résultat si l'on saisit les flux un à un : le prix payé en négatif, puis les coupons et le remboursement final.</p>
<p>Prudence sur le prix retenu : les obligations se négocient en prix pied de coupon, auquel s'ajoute le coupon couru au moment du règlement. Mélanger les deux, et le tableur vous répondra avec un aplomb parfait un chiffre parfaitement faux.</p>
<h2 id="brut-net">Du brut au net : l'exemple chiffré</h2>
<p>Passons notre obligation achetée 950 € au prélèvement forfaitaire unique de 31,4 %. Chaque coupon de 40 € devient 27,44 € après impôt. À l'échéance, le gain de 50 € entre le prix d'achat et le remboursement est taxé à son tour : il en reste 34,30 €, soit 984,30 € encaissés au lieu de 1 000 €.</p>
<p>Le taux qui égalise 950 € et ces flux nets s'établit à environ <strong>3,56 % par an</strong>, contre 5,16 % en brut. L'écart ne vaut pas 31,4 % du rendement brut : il dépend de la répartition entre coupons et plus-value, et du moment où l'impôt est payé. C'est pour cela que le rendement net se calcule à partir des flux. Cet exemple laisse de côté les frais de courtage et l'option pour le barème progressif.</p>
<h2 id="autres-rendements">Rendement courant, actuariel et au remboursement anticipé</h2>
<p>Le <strong>rendement courant</strong> se contente de diviser le coupon par le prix (40 / 950 = 4,21 %) et ignore l'écart entre prix et remboursement. Le <strong>rendement actuariel</strong> intègre tous les flux jusqu'à l'échéance. Pour une obligation remboursable par anticipation (<em>callable</em>), on calcule en plus le rendement jusqu'à la première date de remboursement possible ; le plus bas des deux, le <em>yield to worst</em>, est le chiffre le plus prudent.</p>
<h2 id="faq">Questions fréquentes</h2>
<h3>Quelle est la différence entre taux nominal et taux actuariel ?</h3>
<p>Le taux nominal, ou taux du coupon, se calcule sur la valeur nominale et ne bouge pas. Le taux actuariel dépend du prix payé et de la durée restante : il mesure ce que rapporte réellement le placement si l'obligation est gardée jusqu'à l'échéance.</p>
<h3>Pourquoi le rendement monte-t-il quand le prix baisse ?</h3>
<p>Parce que les flux futurs d'une obligation à taux fixe sont connus d'avance. Payer moins cher pour toucher les mêmes coupons et le même remboursement augmente mécaniquement la rémunération du placement.</p>
<h3>Le rendement affiché par 10BONDS est-il brut ou net ?</h3>
<p>Brut, c'est-à-dire avant frais et fiscalité. Le calculateur de cette page permet d'estimer le rendement net selon le taux d'imposition choisi.</p>
<h2 id="comparer-10bonds">Comparer les rendements sur 10BONDS</h2>
<p>10BONDS a une ambition modeste mais utile : mettre les obligations sur la même balance, avec des mesures financières homogènes.</p>
<p>Il suffit d'indiquer une duration et un rendement annuel cible pour consulter une sélection d'obligations européennes et comparer leurs écarts de taux actuariel, de duration et de risque.</p>
<p>Exemples à jour : les <a href="/fr/obligations/rendement-4-pourcent">obligations proches de 4 %</a>, celles d'une <a href="/fr/obligations/duration-5-ans">duration d'environ 5 ans</a> ou les <a href="/fr/obligations/oat">rendements des OAT</a>.</p>
<p><a class="cta" href="/fr">Comparer les rendements obligataires sur 10BONDS</a></p>
<h3>Sources</h3>
<ul>
<li>Autorité des marchés financiers — Comprendre les obligations : <a href="https://www.amf-france.org/fr/espace-epargnants/comprendre-les-produits-financiers/actions-obligations/obligations/comprendre-les-obligations-avant-dinvestir">https://www.amf-france.org/fr/espace-epargnants/comprendre-les-produits-financiers/actions-obligations/obligations/comprendre-les-obligations-avant-dinvestir</a></li>
<li>Direction générale des Finances publiques — Revenus mobiliers : <a href="https://www.impots.gouv.fr/particulier/les-revenus-mobiliers">https://www.impots.gouv.fr/particulier/les-revenus-mobiliers</a></li>
<li>Direction générale des Finances publiques — Fiscalité des valeurs mobilières : <a href="https://www.impots.gouv.fr/particulier/questions/jai-des-valeurs-mobilieres-comment-sont-elles-imposees">https://www.impots.gouv.fr/particulier/questions/jai-des-valeurs-mobilieres-comment-sont-elles-imposees</a></li>
</ul>
<p><em>Ce contenu est pédagogique. Les calculs illustratifs ne constituent pas une promesse de rendement ni une recommandation d'investissement.</em></p>
`,
  },
  {
    locale: "fr", topic: "compare", group: "bonds-vs-etf", status: "published",
    oldSlug: "obligations-ou-etf",
    slug: "obligations-ou-etf-obligataires",
    title: "Obligations ou ETF obligataires : comprendre les différences avant de comparer",
    seoTitle: "Obligations ou ETF obligataires : quelles différences ?",
    metaDescription: "Comparez les obligations individuelles et les ETF obligataires : rendement, échéance, diversification, frais, risques et comportement des prix.",
    primaryKeyword: "obligations ou ETF obligataires",
    relatedKeywords: ["ETF obligataire ou obligation", "obligations individuelles", "fonds obligataires"],
    relatedSlugs: ["calcul-rendement-obligation", "oat-obligations-etat", "duration-obligations", "obligations-etat-ou-entreprise"],
    bodyHtml: `${updated}
<p>Pour mettre des obligations dans son portefeuille, on a le choix entre deux portes d'entrée : acheter les titres un par un, ou passer par un fonds indiciel coté spécialisé, l'ETF obligataire.</p>
<p>Vu de loin, c'est blanc bonnet et bonnet blanc. Dans les deux cas, l'investisseur se retrouve exposé à des titres de dette émis par des États, des entreprises ou d'autres emprunteurs.</p>
<p>De près, la mécanique n'a pas grand-chose à voir. Et l'affaire ne se résume pas aux frais : elle touche aussi à la prévisibilité des flux, à la diversification, à la durée de détention et à la façon dont le capital réagit quand les taux d'intérêt bougent.</p>
<h2 id="obligation-directe">Acheter une obligation directement : que possède-t-on ?</h2>
<p>Une obligation individuelle est un contrat de dette, mis en forme dans un titre financier.</p>
<p>Celui qui achète une obligation à taux fixe connaît les conditions contractuelles de versement des coupons et de remboursement, pour autant que l'émetteur tienne parole.</p>
<p>Prenons une obligation fictive de 1 000 € de nominal, avec un coupon annuel de 3 % et une échéance dans cinq ans.</p>
<p>Le titre promet 30 € de coupon par an et le remboursement du nominal à la date prévue. Acheté 970 €, il offrira un rendement actuariel supérieur au taux du coupon, grâce à l'écart entre le prix payé et le remboursement attendu.</p>
<p>Ce calendrier de flux connu d'avance est l'un des traits fondamentaux des obligations individuelles.</p>
<p>Connu d'avance ne veut pas dire sans risque : un défaut de l'émetteur, une modification contractuelle ou une vente avant l'échéance peuvent changer le résultat.</p>
<h2 id="fonctionnement-etf">Comment fonctionne un ETF obligataire ?</h2>
<p>Un ETF obligataire est un fonds coté qui détient, directement ou indirectement, un panier d'obligations.</p>
<p>Certains se consacrent aux obligations souveraines européennes, d'autres aux obligations d'entreprises ou aux émissions d'une certaine qualité de crédit.</p>
<p>L'investisseur ne choisit pas les titres un à un : il achète des parts du fonds, un peu comme on prend l'abonnement plutôt que le billet à l'unité.</p>
<p>Les ETF obligataires traditionnels répliquent souvent un indice dont la composition change avec le temps. Les obligations qui arrivent à échéance, ou qui ne remplissent plus les critères de l'indice, peuvent être remplacées.</p>
<p>Le fonds conserve ainsi une exposition obligataire qui peut durer indéfiniment.</p>
<p>D'où une différence de taille avec l'obligation individuelle : un ETF traditionnel n'a en général pas d'échéance unique à laquelle l'investisseur récupère une valeur nominale contractuelle.</p>
<h2 id="hausse-des-taux">Que se passe-t-il lorsque les taux augmentent ?</h2>
<p>Prenons un investisseur qui détient une obligation à taux fixe dont le coupon a perdu de son attrait après une hausse générale des taux.</p>
<p>Le prix de marché de son obligation tend à baisser.</p>
<p>S'il la garde jusqu'à l'échéance et que l'émetteur tient ses engagements, les paiements contractuels restent ceux qui avaient été prévus.</p>
<p>Pour l'ETF obligataire, le scénario change. Sa valeur liquidative reflète en continu les variations de prix des titres qui composent son portefeuille.</p>
<p>Le fonds peut, au fil du temps, remplacer certaines lignes par des obligations aux rendements plus élevés. Ce renouvellement peut améliorer son rendement futur, sans pour autant effacer d'un coup de baguette les pertes de valeur déjà subies.</p>
<p>Dans les deux cas, la sensibilité dépend notamment de la duration.</p>
<p>Il serait donc faux de croire que les obligations individuelles ne fluctuent pas, ou que les ETF obligataires sont par nature plus risqués. Tous deux réagissent aux taux ; c'est la structure des flux et de la détention qui diffère.</p>
<h2 id="etf-a-echeance">ETF obligataire à échéance : un cas particulier</h2>
<p>Il existe aussi des ETF obligataires à échéance définie.</p>
<p>Ces fonds détiennent des obligations dont les remboursements se concentrent autour d'une année précise. Ils tentent de marier une certaine visibilité dans le temps avec les atouts d'un fonds diversifié.</p>
<p>Ils restent cependant différents d'une obligation individuelle.</p>
<p>Leur valeur finale dépend notamment des titres en portefeuille, des éventuels défauts, des frais du fonds et des modalités de liquidation.</p>
<p>Avant de les comparer à un titre à échéance fixe, il faut donc lire leur documentation, y compris les pages que personne ne lit.</p>
<h2 id="diversification">Diversification : l'avantage du portefeuille</h2>
<p>Avec une obligation individuelle, l'investisseur met tous ses œufs dans le panier d'un seul émetteur et d'une seule émission.</p>
<p>Un ETF peut répartir cette exposition sur des dizaines, voire des centaines de titres. Cette diversification peut atténuer l'effet d'un défaut isolé, mais elle ne supprime pas le risque général du marché obligataire.</p>
<p>Elle peut aussi faire entrer d'autres ingrédients : une exposition à des devises étrangères, à des secteurs économiques particuliers ou à des catégories de crédit plus risquées.</p>
<p>Pour comparer utilement, il faut donc savoir ce que contient vraiment le fonds.</p>
<p>Un ETF d'obligations d'entreprises à haut rendement ne se compare pas directement à une obligation souveraine de qualité de crédit élevée.</p>
<h2 id="frais">Les frais : deux structures différentes</h2>
<p>Le particulier qui achète une obligation en direct peut payer une commission de courtage, l'écart entre prix acheteur et prix vendeur, et certains frais de compte.</p>
<p>L'ETF obligataire a lui aussi ses coûts de transaction, auxquels s'ajoutent les frais courants du fonds. Le fonds supporte en outre certains coûts liés à la gestion de ses positions.</p>
<p>Le coût qui compte dépend de l'intermédiaire, de la durée de détention et du produit choisi.</p>
<p>Un exemple purement illustratif : une commission de 15 € pour acheter 10 000 € d'obligations représente 0,15 % de la somme investie.</p>
<p>Un ETF facturant 0,20 % de frais courants par an coûte, à valeur de portefeuille inchangée, environ 20 € par an pour 10 000 € investis, sans compter les autres coûts éventuels.</p>
<p>Les deux chiffres ne se comparent pas tels quels : l'un se paie une fois, l'autre revient chaque année, comme la redevance d'un service auquel on ne pense plus.</p>
<p>Pour comparer les coûts, il faut donc préciser la durée envisagée et les opérations nécessaires.</p>
<h2 id="criteres">Les principaux critères de comparaison</h2>
<table>
<thead><tr><th scope="col">Critère</th><th scope="col">Obligation individuelle</th><th scope="col">ETF obligataire traditionnel</th></tr></thead>
<tbody>
<tr><td>Émetteur</td><td>Un émetteur par titre</td><td>Portefeuille d'émetteurs</td></tr>
<tr><td>Échéance</td><td>Généralement contractuelle</td><td>Généralement sans échéance unique</td></tr>
<tr><td>Diversification</td><td>À construire</td><td>Intégrée selon le fonds</td></tr>
<tr><td>Coupons</td><td>Selon le titre</td><td>Distribution ou capitalisation selon le fonds</td></tr>
<tr><td>Frais</td><td>Transaction et compte</td><td>Frais courants et transaction</td></tr>
<tr><td>Risque de taux</td><td>Dépend de la duration</td><td>Dépend de la duration du portefeuille</td></tr>
<tr><td>Risque de crédit</td><td>Lié au titre et à l'émetteur</td><td>Réparti entre les titres détenus</td></tr>
</tbody>
</table>
<h2 id="cout-dans-le-temps">Le coût dans le temps : l'exemple prolongé</h2>
<p>Gardons nos 10 000 € illustratifs et les mêmes hypothèses : 15 € de courtage à l'achat dans les deux cas, une obligation conservée jusqu'à l'échéance et un ETF à 0,20 % de frais courants par an sur une valeur supposée constante.</p>
<table>
<thead><tr><th scope="col">Durée de détention</th><th scope="col">Obligation en direct</th><th scope="col">ETF obligataire (0,20 % par an)</th></tr></thead>
<tbody>
<tr><td>1 an</td><td>15 €</td><td>35 €</td></tr>
<tr><td>3 ans</td><td>15 €</td><td>75 €</td></tr>
<tr><td>5 ans</td><td>15 €</td><td>115 €</td></tr>
<tr><td>10 ans</td><td>15 €</td><td>215 €</td></tr>
</tbody>
</table>
<p>Ce calcul ne retient que ces deux postes. Il laisse de côté l'écart entre prix acheteur et vendeur, les éventuels droits de garde, la commission de revente de l'ETF, et le fait qu'un portefeuille d'obligations en direct un tant soit peu diversifié exige plusieurs ordres, donc plusieurs commissions. Avec cinq lignes à 15 € chacune, l'obligation en direct coûterait 75 € à l'achat. Tout dépend donc du nombre de titres et de la durée de détention : le calcul est à refaire avec la grille de votre propre courtier. Notre <a href="/fr/courtiers-obligations">comparatif des courtiers</a> détaille ces frais.</p>
<h2 id="duration-dans-le-temps">La duration dans le temps : un écart souvent oublié</h2>
<p>La duration d'une obligation détenue en direct raccourcit à mesure que l'échéance approche. Une obligation à 5 ans au coupon de 3 %, achetée au pair, affiche une duration modifiée d'environ 4,6. Deux ans plus tard, il ne lui reste que trois ans à courir et sa duration tombe à environ 2,8 : une hausse des taux d'un point ne ferait plus reculer son prix que d'environ 2,8 %.</p>
<p>L'ETF obligataire traditionnel, lui, garde une duration à peu près stable, puisqu'il remplace les titres proches de l'échéance. Son risque de taux ne s'éteint pas avec le temps : il vieillit sans prendre une ride, ce qui n'est pas toujours une bonne nouvelle. C'est l'une des raisons pour lesquelles les investisseurs qui auront besoin de leur argent à une date précise regardent souvent des obligations qui arrivent à échéance à cette date, ou des ETF à échéance définie.</p>
<h2 id="donnees-du-jour">Ce que rapportent aujourd'hui les obligations en direct</h2>
<p>Pour mettre un ETF face à des obligations individuelles, le plus parlant est de rapprocher des profils semblables : une duration proche et une qualité de crédit comparable. Le tableau ci-dessous, tiré des données obligataires de 10BONDS mises à jour chaque jour ouvré, présente des obligations notées <em>investment grade</em> pour des durations d'environ 2, 5 et 10 ans, à raison d'une par émetteur.</p>
<p>[[10bonds:bonds:best]]</p>
<p>En face, l'émetteur d'un ETF publie dans sa fiche produit la duration moyenne du portefeuille et, souvent, un rendement à l'échéance moyen. Rapprochez ce rendement des lignes de duration voisine, puis retranchez les frais courants du fonds. Un écart important tient en général à une différence de qualité de crédit, de duration ou de composition : sur les marchés obligataires comme ailleurs, les repas gratuits se font rares. Les rendements présentés ici sont bruts et ne constituent pas une recommandation.</p>
<h2 id="fiscalite">Et la fiscalité en France ?</h2>
<p>En compte-titres, les coupons et plus-values d'obligations détenues en direct relèvent en principe du prélèvement forfaitaire unique, de 31,4 % en 2026 (12,8 % d'impôt sur le revenu et 18,6 % de prélèvements sociaux), avec une option possible pour le barème progressif. Les plus-values de cession de parts d'ETF détenues en compte-titres y sont en principe soumises elles aussi. Les obligations ne peuvent pas être détenues en direct dans un PEA, et la plupart des ETF obligataires n'y ont pas leur place non plus. Certains contrats d'assurance-vie proposent des ETF obligataires en unités de compte, avec une fiscalité différente.</p>
<h2 id="faq">Questions fréquentes</h2>
<h3>Un ETF obligataire peut-il perdre de l'argent ?</h3>
<p>Oui. Sa valeur liquidative recule quand les taux montent ou quand la qualité de crédit des émetteurs se dégrade. Comme il n'a en général pas d'échéance, aucune date ne vient mécaniquement effacer cette baisse.</p>
<h3>Faut-il beaucoup d'argent pour acheter des obligations en direct ?</h3>
<p>Tout dépend des titres. Certaines obligations d'entreprise ont des coupures minimales élevées, alors que les OAT ont en général un nominal unitaire faible. Ce sont souvent les frais minimums du courtier, plus que la coupure, qui font la différence.</p>
<h3>Comment comparer le rendement d'un ETF et celui d'une obligation ?</h3>
<p>Mettez le rendement à l'échéance moyen publié pour l'ETF en regard de celui d'obligations de duration et de notation proches, puis retirez les frais courants du fonds. Le tableau de cette page donne les rendements bruts d'obligations par duration.</p>
<h2 id="pourquoi-comparer">Pourquoi comparer les obligations individuelles reste utile</h2>
<p>Qui s'intéresse aux obligations en direct doit passer en revue un nombre parfois considérable de titres, rarement comparables trait pour trait.</p>
<p>Rendement actuariel, duration, notation de crédit et conditions de remboursement sont les premiers points de repère de cette analyse.</p>
<p>10BONDS raccourcit la recherche en comparant des obligations européennes à partir d'une duration et d'un rendement cible.</p>
<p>La plateforme affiche une liste de dix obligations, dont chacune peut ensuite être examinée en détail.</p>
<p><a class="cta" href="/fr">Explorer les obligations européennes sur 10BONDS</a></p>
<h3>Sources</h3>
<ul>
<li>AMF — Comprendre les obligations : <a href="https://www.amf-france.org/fr/espace-epargnants/comprendre-les-produits-financiers/actions-obligations/obligations/comprendre-les-obligations-avant-dinvestir">https://www.amf-france.org/fr/espace-epargnants/comprendre-les-produits-financiers/actions-obligations/obligations/comprendre-les-obligations-avant-dinvestir</a></li>
<li>justETF — ETF obligataires : <a href="https://www.justetf.com/fr/academy/academy-overview.html">https://www.justetf.com/fr/academy/academy-overview.html</a></li>
<li>justETF — ETF obligataires à échéance : <a href="https://www.justetf.com/fr-be/how-to/invest-in-maturity-bonds.html">https://www.justetf.com/fr-be/how-to/invest-in-maturity-bonds.html</a></li>
<li>Direction générale des Finances publiques — Les revenus mobiliers : <a href="https://www.impots.gouv.fr/particulier/les-revenus-mobiliers">https://www.impots.gouv.fr/particulier/les-revenus-mobiliers</a></li>
</ul>
<p><em>Cet article est destiné à l'information générale. Il ne vise pas à déterminer l'adéquation d'un instrument financier à la situation personnelle d'un investisseur.</em></p>
`,
  },
];

/** Earlier French guide slug -> the slug of the owner's article that replaced it. */
export const FR_OWNER_MOVED: Record<string, string> = Object.fromEntries(SEED_GUIDES_OWNER_FR.map((g) => [g.oldSlug, g.slug]));
