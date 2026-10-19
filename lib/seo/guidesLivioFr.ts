import type { SeedGuide } from "./guidesSeed";

// Livio's three French articles (19 Oct 2026). His text is kept word for word (only turned into HTML; his notes to us
// are left out). The sections marked "complément" below his text were added at his request so the French guides match
// the Italian ones: live data, the calculator, worked numbers and a FAQ. Educational only, no invented market data.
// A paragraph [[10bonds:...]] is replaced on the page by a live block (see GuidePage): bonds:<comparison id> or calculator.
// Each article takes over an earlier French guide on the same topic (oldSlug), which now redirects to it.

export type LivioFrGuide = SeedGuide & { oldSlug: string };

const updated = `<p><strong>Mis à jour : 19 octobre 2026</strong></p>`;

export const SEED_GUIDES_LIVIO_FR: LivioFrGuide[] = [
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
<p>Les obligations d'État françaises, appelées <strong>Obligations Assimilables du Trésor (OAT)</strong>, occupent une place importante sur le marché obligataire européen. Elles permettent à l'État français de financer ses besoins à moyen et long terme et offrent aux investisseurs une exposition à la dette souveraine française.</p>
<p>Pour un particulier, les OAT peuvent sembler simples : un capital prêté à l'État, des intérêts éventuellement versés chaque année, puis un remboursement à l'échéance. Pourtant, leur rendement réel dépend de plusieurs éléments qui ne sont pas toujours immédiatement visibles, notamment le prix d'achat, la durée restante et les conditions de marché.</p>
<p>Comprendre ces mécanismes est indispensable pour comparer deux OAT ou examiner leurs différences avec des obligations émises par des entreprises.</p>
<h2 id="qu-est-ce-qu-une-oat">Qu'est-ce qu'une OAT ?</h2>
<p>Une OAT est un titre de dette émis par la République française. En acquérant ce titre, l'investisseur devient créancier de l'État, qui s'engage à respecter les conditions financières prévues lors de l'émission.</p>
<p>L'Agence France Trésor, chargée de la gestion de la dette et de la trésorerie de l'État, émet des OAT dont les maturités initiales peuvent aller de deux à cinquante ans.</p>
<p>La plupart des OAT classiques sont des obligations à taux fixe. Elles versent un coupon annuel et prévoient le remboursement du nominal à leur date d'échéance. Certaines OAT sont toutefois indexées sur l'inflation et répondent à des mécanismes différents.</p>
<p>Une particularité du marché français est le principe d'assimilation. L'État peut émettre de nouvelles tranches d'une obligation existante plutôt que créer systématiquement un nouveau titre. Ces tranches partagent les mêmes caractéristiques contractuelles, ce qui contribue à concentrer les échanges et à favoriser la liquidité.</p>
<h2 id="coupon-et-rendement">Coupon et rendement : pourquoi faut-il les distinguer ?</h2>
<p>C'est probablement la distinction la plus importante pour comprendre les OAT.</p>
<p>Le coupon indique le montant d'intérêt calculé sur la valeur nominale. Le rendement actuariel, également appelé rendement à l'échéance, mesure la rémunération théorique de l'investissement en tenant compte du prix payé et des flux futurs prévus.</p>
<p>Prenons une obligation fictive de nominal 1 000 €, avec un coupon annuel de 3 % et une échéance dans cinq ans.</p>
<p>Si son prix d'achat est de 1 000 €, le coupon annuel est de 30 € et le rendement actuariel correspond à 3 %, avant frais et fiscalité, dans cet exemple simplifié.</p>
<p>Si cette même obligation s'achète à 950 €, l'investisseur continue de recevoir 30 € par an, mais bénéficie également, sous réserve du remboursement prévu, de la différence entre son prix d'achat et les 1 000 € remboursés à l'échéance. Son rendement actuariel devient supérieur à 3 %.</p>
<p>À l'inverse, un prix d'achat de 1 050 € réduirait son rendement actuariel.</p>
<p>C'est pourquoi une OAT affichant un coupon de 4 % n'est pas nécessairement plus rémunératrice qu'une OAT offrant un coupon de 2 %.</p>
<h2 id="prix-des-oat">Pourquoi le prix des OAT évolue-t-il ?</h2>
<p>Les OAT sont négociées sur le marché secondaire. Leur valeur évolue en fonction des conditions économiques, des anticipations de taux d'intérêt, de la perception du risque souverain et de la demande des investisseurs.</p>
<p>Il existe une relation fondamentale entre prix et rendement : lorsque les rendements exigés par le marché augmentent, le prix des obligations à taux fixe déjà émises tend à diminuer. Lorsque ces rendements baissent, leur prix tend à augmenter.</p>
<p>L'ampleur de cette variation dépend notamment de la sensibilité du titre aux taux, mesurée par sa duration.</p>
<p>Une OAT à vingt ans peut connaître des fluctuations de prix nettement plus importantes qu'une obligation arrivant à échéance dans deux ans, toutes choses égales par ailleurs.</p>
<p>Cette volatilité concerne particulièrement l'investisseur qui souhaite revendre son titre avant son échéance.</p>
<h2 id="trois-oat">Trois OAT, trois profils différents</h2>
<p>Pour illustrer les différences entre émissions, considérons trois obligations françaises dont les caractéristiques contractuelles sont publiées par l'Agence France Trésor.</p>
<table>
<thead><tr><th scope="col">Émission</th><th scope="col">Coupon annuel</th><th scope="col">Échéance</th></tr></thead>
<tbody>
<tr><td>OAT FR0013286192</td><td>0,75 %</td><td>25 mai 2028</td></tr>
<tr><td>OAT FR001400Z2L7</td><td>2,70 %</td><td>25 février 2031</td></tr>
<tr><td>OAT FR0014007L00</td><td>0,00 %</td><td>25 mai 2032</td></tr>
</tbody>
</table>
<p>Ces trois émissions diffèrent par leur coupon et leur date de remboursement.</p>
<p>L'OAT à coupon zéro ne distribue pas de revenu annuel. Son rendement dépend de la différence entre son prix d'acquisition et les montants contractuellement dus, en tenant compte de son échéance.</p>
<p>Les deux autres versent des coupons, mais leurs taux nominaux ne suffisent pas à déterminer laquelle offre le rendement actuariel le plus élevé.</p>
<p>Il faut connaître leur prix de marché à une date donnée pour effectuer cette comparaison. Le tableau présente des caractéristiques contractuelles, pas des rendements actuels.</p>
<h2 id="risques">Quels sont les risques d'une obligation d'État française ?</h2>
<p>Même lorsqu'elle est émise par un État, une obligation n'est pas dépourvue de risque.</p>
<p>Le premier est le risque de crédit : la capacité de l'émetteur à honorer ses engagements financiers. À ce risque s'ajoute le risque de taux, particulièrement important en cas de revente avant échéance.</p>
<p>Il faut également considérer l'inflation. Une obligation versant un coupon fixe peut conserver ses paiements nominaux tout en perdant du pouvoir d'achat si les prix augmentent fortement.</p>
<p>Enfin, la liquidité varie entre les différentes émissions. Certaines OAT sont activement négociées, tandis que d'autres peuvent présenter des écarts plus importants entre prix acheteur et prix vendeur.</p>
<h2 id="comparer-europe">Comment comparer les OAT avec d'autres obligations européennes ?</h2>
<p>Comparer uniquement les rendements affichés conduit souvent à des conclusions incomplètes.</p>
<p>Une approche plus rigoureuse consiste à rapprocher des obligations ayant des durées ou des durations comparables, puis à examiner la rémunération supplémentaire associée à leurs différences de risque de crédit.</p>
<p>Une obligation corporate française ou allemande peut, par exemple, afficher un rendement supérieur à celui d'une OAT présentant une duration voisine. Cette différence peut refléter le risque de l'entreprise, la liquidité du titre ou sa structure contractuelle.</p>
<p>L'analyse doit aussi tenir compte des éventuelles clauses de remboursement anticipé, de la devise et des frais de transaction.</p>
<h2 id="rendements-oat-aujourd-hui">Les rendements des OAT aujourd'hui</h2>
<p>Le tableau ci-dessous complète les caractéristiques contractuelles présentées plus haut avec des rendements de marché. Il est construit à partir des données obligataires de 10BONDS, mises à jour chaque jour ouvré, et retient une OAT à taux fixe par année d'échéance : c'est une courbe des taux française simplifiée.</p>
<p>[[10bonds:bonds:gov-fr]]</p>
<p>Pour chaque ligne, le rendement indiqué est un rendement actuariel brut, calculé sur le dernier prix disponible, avant frais et fiscalité. La duration permet de mesurer la sensibilité du prix aux taux : une duration de 5 signifie qu'une hausse des taux d'un point ferait baisser le prix d'environ 5 %. La date des données figure au-dessus du tableau. Les OAT indexées sur l'inflation sont exclues, car leur rendement réel ne se compare pas directement à un rendement nominal.</p>
<p>La courbe complète, mise à jour quotidiennement, est disponible sur la page <a href="/fr/obligations/oat">rendements des OAT par échéance</a>.</p>
<h2 id="spread-oat-bund">OAT, Bund et BTP : lire le spread</h2>
<p>Le rendement d'une OAT prend tout son sens lorsqu'on le compare à celui des autres grands émetteurs souverains de la zone euro. L'écart entre le rendement d'une OAT et celui d'un Bund allemand de même échéance, appelé <strong>spread OAT-Bund</strong>, mesure la prime que les investisseurs demandent pour prêter à la France plutôt qu'à l'Allemagne.</p>
<p>Ce spread s'élargit lorsque le marché s'inquiète de la trajectoire des finances publiques ou de la stabilité politique, et se resserre lorsque la confiance revient. À l'inverse, les BTP italiens offrent en général un rendement supérieur à celui des OAT, en contrepartie d'une notation plus basse.</p>
<p>Vous pouvez comparer échéance par échéance la courbe des <a href="/fr/obligations/oat">OAT</a> avec celle des <a href="/fr/obligations/bund-allemands">Bund allemands</a> et des <a href="/fr/obligations/btp-italiens">BTP italiens</a>.</p>
<h2 id="oat-indexees">OATi et OAT€i : les OAT indexées sur l'inflation</h2>
<p>L'Agence France Trésor émet aussi des OAT dont le capital est indexé sur l'inflation : l'<strong>OATi</strong>, indexée sur l'indice des prix à la consommation français hors tabac, et l'<strong>OAT€i</strong>, indexée sur l'indice des prix de la zone euro hors tabac. Le nominal est réévalué avec l'indice, et le coupon est calculé sur ce nominal réévalué.</p>
<p>Ces titres protègent contre une inflation plus forte que prévu. Leur rendement est exprimé en termes réels : il ne se compare pas directement à celui d'une OAT classique. La différence entre les deux, appelée point mort d'inflation, indique l'inflation moyenne anticipée par le marché.</p>
<h2 id="acheter-oat">Comment acheter des OAT en direct ?</h2>
<p>Un particulier achète des OAT sur le marché secondaire, via un compte-titres ouvert auprès d'une banque ou d'un courtier. Les frais varient fortement d'un intermédiaire à l'autre : courtage, montant minimum, droits de garde. Notre <a href="/fr/courtiers-obligations">comparatif des courtiers pour acheter des obligations</a> les calcule pour plusieurs montants à partir des grilles tarifaires officielles.</p>
<p>Les obligations ne peuvent pas être détenues en direct dans un PEA. Pour un résident fiscal français, les coupons et plus-values perçus en compte-titres relèvent en principe du prélèvement forfaitaire unique : 12,8 % d'impôt sur le revenu et, depuis le 1<sup>er</sup> janvier 2026, 18,6 % de prélèvements sociaux, soit 31,4 % au total, avec une option possible pour le barème progressif. Notre guide sur le <a href="/fr/guides/calcul-rendement-obligation">calcul du rendement d'une obligation</a> montre l'effet de cette fiscalité sur un exemple chiffré.</p>
<h2 id="faq">Questions fréquentes</h2>
<h3>Quelle est la différence entre une OAT et un livret d'épargne ?</h3>
<p>Un livret réglementé garantit le capital à tout moment et son taux peut changer. Une OAT verse un coupon fixé à l'émission et rembourse le nominal à l'échéance, mais son prix varie avant cette date : une revente anticipée peut entraîner une perte ou un gain.</p>
<h3>Une OAT peut-elle perdre de la valeur ?</h3>
<p>Oui. Si les taux de marché montent, le prix des OAT déjà émises baisse, d'autant plus fortement que leur duration est élevée. Conservée jusqu'à l'échéance, l'OAT rembourse son nominal, sous réserve que l'État honore ses engagements.</p>
<h3>Quel montant faut-il pour acheter une OAT ?</h3>
<p>Le nominal unitaire d'une OAT est en général de 1 euro, mais les intermédiaires appliquent souvent un montant ou des frais minimums qui rendent les petits ordres coûteux. Vérifiez la grille tarifaire de votre courtier avant d'acheter.</p>
<h3>Où trouver le rendement de l'OAT à 10 ans ?</h3>
<p>Le tableau de cette page et notre page <a href="/fr/obligations/oat">rendements des OAT</a> indiquent le rendement des OAT par année d'échéance, avec la date des données. Le chiffre de l'OAT à 10 ans est celui de la ligne dont l'échéance est la plus proche de dix ans.</p>
<h2 id="comparer-10bonds">Comparer les obligations avec 10BONDS</h2>
<p>10BONDS permet d'examiner des obligations européennes à partir de deux critères simples : une duration et un rendement annuel cible.</p>
<p>La plateforme présente ensuite une sélection comparative de dix émissions, accompagnées de leurs caractéristiques financières, afin de faciliter l'examen des différences de rendement et de risque.</p>
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
<p>Lorsqu'un investisseur consulte une obligation, plusieurs pourcentages peuvent apparaître : le taux du coupon, le rendement courant, le rendement à l'échéance ou encore le rendement net. Ces indicateurs ne mesurent pas la même chose.</p>
<p>Le <strong>rendement actuariel à l'échéance</strong>, souvent désigné par l'expression anglaise <em>Yield to Maturity</em> (YTM), est particulièrement utile pour comparer des obligations ayant des coupons et des prix différents.</p>
<p>Il permet de prendre en compte l'ensemble des flux financiers contractuellement prévus jusqu'au remboursement du titre.</p>
<p>Encore faut-il comprendre comment il est calculé et quelles sont ses limites.</p>
<h2 id="coupon-rendement">Pourquoi le coupon ne correspond-il pas au rendement ?</h2>
<p>Le coupon est fixé selon les conditions de l'obligation. Dans le cas d'un titre à taux fixe, il correspond généralement à un pourcentage de la valeur nominale, indépendamment du prix auquel le titre est acheté sur le marché secondaire.</p>
<p>Imaginons une obligation dont la valeur nominale est de 1 000 € et le coupon annuel de 40 €.</p>
<p>Son taux nominal est donc de 4 %.</p>
<p>Mais si cette obligation s'échange à 950 €, les 40 € de coupon représentent déjà environ 4,21 % du prix payé. Ce calcul correspond au rendement courant simplifié, avant prise en compte du remboursement final.</p>
<p>Le rendement actuariel va plus loin : il intègre aussi la différence entre les 950 € déboursés et les 1 000 € susceptibles d'être remboursés à l'échéance.</p>
<h2 id="exemple-cinq-ans">Un exemple de rendement à cinq ans</h2>
<p>Considérons une obligation fictive présentant les caractéristiques suivantes.</p>
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
<p>Dans cette hypothèse simplifiée, l'investisseur reçoit cinq coupons annuels de 40 € et récupère 1 000 € à la fin de la cinquième année.</p>
<p>Le taux actuariel correspond au taux qui actualise ces flux futurs pour retrouver les 950 € initialement investis.</p>
<p>Il s'élève à environ <strong>5,16 % par an</strong>.</p>
<p>Pourquoi ce rendement est-il supérieur au coupon de 4 % ? Parce que l'investisseur bénéficie, en plus des coupons, de l'écart de 50 € entre le prix d'achat et le remboursement prévu.</p>
<p>Il s'agit toutefois d'un rendement théorique avant fiscalité et frais, sous réserve du paiement intégral de tous les flux.</p>
<h2 id="formule">La formule du rendement actuariel</h2>
<p>Pour une obligation à coupon annuel, la relation s'écrit :</p>
<p><strong>P = Σ[C / (1 + r)^t] + N / (1 + r)^n</strong></p>
<p>Dans cette expression, P représente le prix payé, C le coupon annuel, N le nominal remboursé, n le nombre d'années restantes et r le taux actuariel recherché.</p>
<p>Le calcul consiste à trouver la valeur de r qui permet d'égaliser le prix payé et la somme des flux actualisés.</p>
<p>Dans la pratique, le calcul peut être plus complexe. Les obligations utilisent différentes fréquences de coupons, conventions de décompte des jours et dates de règlement. Le prix affiché est parfois un prix « pied de coupon », auquel s'ajoutent les intérêts courus.</p>
<p>Il est donc préférable d'utiliser un moteur de calcul obligataire intégrant les caractéristiques exactes du titre plutôt qu'une approximation annuelle.</p>
<h2 id="pair">Le prix au-dessus ou en dessous du pair</h2>
<p>Lorsqu'une obligation est achetée sous le pair, c'est-à-dire sous sa valeur nominale de remboursement, cet écart peut contribuer positivement à son rendement à l'échéance.</p>
<p>À l'inverse, un achat au-dessus du pair peut réduire le rendement actuariel, même si le coupon paraît élevé.</p>
<p>Cela explique pourquoi deux obligations ayant des coupons différents peuvent finalement afficher des rendements très proches.</p>
<p>Prenons deux titres arrivant à échéance dans cinq ans. Le premier verse un coupon de 2 %, le second un coupon de 5 %. Sans connaître leurs prix respectifs, il serait incorrect de conclure que le second est nécessairement plus rémunérateur.</p>
<p>Le marché ajuste les prix en fonction des rendements demandés et des risques associés aux émissions.</p>
<h2 id="frais-fiscalite">Quel est l'impact des frais et de la fiscalité ?</h2>
<p>Le rendement actuariel brut ne représente pas exactement la performance nette que percevra l'investisseur.</p>
<p>Les frais de transaction augmentent le montant réellement déboursé. La fiscalité peut réduire les coupons reçus ainsi que le résultat fiscal associé au remboursement ou à la vente.</p>
<p>En France, le traitement dépend notamment de la résidence fiscale, du mode de détention, de la nature des revenus et de l'option fiscale retenue.</p>
<p>Pour les revenus mobiliers soumis au régime forfaitaire standard, l'administration fiscale indique en 2026 un prélèvement global de 31,4 %, constitué de 12,8 % au titre de l'impôt sur le revenu et de 18,6 % de prélèvements sociaux. Il existe des situations particulières et une option possible pour le barème progressif.</p>
<p>Le rendement net doit donc être calculé à partir des flux après impôts et frais, et non en appliquant mécaniquement un pourcentage au rendement actuariel brut.</p>
<h2 id="garanti">Le rendement à l'échéance est-il garanti ?</h2>
<p>Non. Le calcul suppose que l'émetteur respecte les paiements prévus et que le titre soit conservé jusqu'à son échéance contractuelle.</p>
<p>Il ne tient pas nécessairement compte du taux auquel les coupons intermédiaires pourront être réinvestis. Il ne garantit pas non plus le résultat d'une vente anticipée.</p>
<p>Le rendement actuariel reste néanmoins très utile pour comparer des titres, à condition de compléter son analyse par une évaluation du risque de crédit, de la duration et de la liquidité.</p>
<h2 id="calculateur">Calculez le rendement actuariel d'une obligation</h2>
<p>Le calculateur ci-dessous applique la méthode décrite plus haut avec les dates exactes : il tient compte de la fréquence des coupons, de la date d'achat et du coupon couru. Le prix se saisit pour 100 de nominal. Pour retrouver l'exemple de cet article, indiquez un prix de 95, un coupon de 4 %, un paiement annuel et une échéance dans cinq ans : le rendement brut affiché est d'environ 5,16 %. Le bouton « PFU 31,4 % » donne le rendement net correspondant.</p>
<p>[[10bonds:calculator]]</p>
<p>Le même outil est disponible en pleine page : <a href="/fr/calculateurs/rendement-actuariel">calculateur de rendement actuariel brut et net</a>. Tous les calculs sont effectués dans votre navigateur ; aucune donnée n'est envoyée.</p>
<h2 id="pas-a-pas">Le calcul pas à pas</h2>
<p>Il n'existe pas de formule directe pour obtenir r : on teste un taux, on calcule la valeur actuelle des flux, puis on corrige. Reprenons l'obligation achetée 950 € :</p>
<table>
<thead><tr><th scope="col">Taux testé</th><th scope="col">Valeur actuelle des flux</th><th scope="col">Comparaison avec 950 €</th></tr></thead>
<tbody>
<tr><td>5,00 %</td><td>956,71 €</td><td>trop élevée : le taux est plus haut</td></tr>
<tr><td>5,20 %</td><td>948,33 €</td><td>trop basse : le taux est plus bas</td></tr>
<tr><td>5,16 %</td><td>950,00 €</td><td>égalité : c'est le rendement actuariel</td></tr>
</tbody>
</table>
<p>Pour un contrôle rapide, une formule approchée donne un résultat proche : <code>(C + (N − P) / n) / ((N + P) / 2)</code>, soit (40 + 50 / 5) / 975 = 5,13 %. L'écart avec le calcul exact grandit lorsque l'échéance est lointaine ou que le prix s'éloigne du pair.</p>
<h2 id="tableur">Dans un tableur</h2>
<p>Dans Excel ou LibreOffice en français, la fonction <code>RENDEMENT.TITRE</code> calcule le rendement actuariel à partir de la date de règlement, de la date d'échéance, du taux du coupon, du prix, de la valeur de remboursement et du nombre de coupons par an. La fonction <code>TRI</code> donne le même résultat si l'on saisit les flux un par un : le prix payé en négatif, puis les coupons et le remboursement final.</p>
<p>Attention au prix utilisé : les obligations se négocient en prix pied de coupon, auquel s'ajoute le coupon couru au moment du règlement. Mélanger les deux fausse le résultat.</p>
<h2 id="brut-net">Du brut au net : l'exemple chiffré</h2>
<p>Appliquons le prélèvement forfaitaire unique de 31,4 % à l'obligation achetée 950 €. Chaque coupon de 40 € devient 27,44 € après impôt. À l'échéance, le gain de 50 € entre le prix d'achat et le remboursement est lui aussi imposé : il reste 34,30 €, soit 984,30 € encaissés au lieu de 1 000 €.</p>
<p>Le taux qui égalise 950 € et ces flux nets est d'environ <strong>3,56 % par an</strong>, contre 5,16 % en brut. L'écart ne correspond pas à 31,4 % du rendement brut : il dépend de la répartition entre coupons et plus-value, et du moment où l'impôt est payé. C'est pourquoi le rendement net se calcule à partir des flux. Cet exemple ne tient pas compte des frais de courtage ni de l'option pour le barème progressif.</p>
<h2 id="autres-rendements">Rendement courant, actuariel et au remboursement anticipé</h2>
<p>Le <strong>rendement courant</strong> divise le coupon par le prix (40 / 950 = 4,21 %) : il ignore l'écart entre prix et remboursement. Le <strong>rendement actuariel</strong> intègre tous les flux jusqu'à l'échéance. Pour une obligation remboursable par anticipation (<em>callable</em>), on calcule aussi le rendement jusqu'à la première date de remboursement possible ; le plus bas des deux, appelé <em>yield to worst</em>, est le chiffre le plus prudent.</p>
<h2 id="faq">Questions fréquentes</h2>
<h3>Quelle est la différence entre taux nominal et taux actuariel ?</h3>
<p>Le taux nominal, ou taux du coupon, est calculé sur la valeur nominale et ne change pas. Le taux actuariel dépend du prix payé et de la durée restante : il mesure la rémunération réelle de l'investissement si l'obligation est conservée jusqu'à l'échéance.</p>
<h3>Pourquoi le rendement monte-t-il quand le prix baisse ?</h3>
<p>Les flux futurs d'une obligation à taux fixe sont connus. Payer moins cher pour recevoir les mêmes coupons et le même remboursement augmente mécaniquement la rémunération de l'investissement.</p>
<h3>Le rendement affiché par 10BONDS est-il brut ou net ?</h3>
<p>Brut : avant frais et fiscalité. Le calculateur de cette page permet d'estimer le rendement net selon le taux d'imposition choisi.</p>
<h2 id="comparer-10bonds">Comparer les rendements sur 10BONDS</h2>
<p>L'objectif de 10BONDS est de faciliter la comparaison de titres obligataires en utilisant des mesures financières homogènes.</p>
<p>En indiquant une duration et un rendement annuel cible, l'utilisateur peut consulter une sélection d'obligations européennes et examiner les écarts entre taux actuariel, duration et risque.</p>
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
<p>L'investisseur qui souhaite s'exposer au marché obligataire dispose de deux grandes possibilités : acheter directement des obligations ou investir dans un fonds indiciel coté spécialisé, appelé ETF obligataire.</p>
<p>À première vue, les deux solutions peuvent sembler équivalentes. Dans les deux cas, l'investisseur s'expose à des titres de dette émis par des États, des entreprises ou d'autres emprunteurs.</p>
<p>Pourtant, leur fonctionnement diffère sensiblement. La question ne se limite pas aux frais : elle concerne également la prévisibilité des flux, la diversification, la durée de détention et la manière dont le capital évolue lorsque les taux d'intérêt changent.</p>
<h2 id="obligation-directe">Acheter une obligation directement : que possède-t-on ?</h2>
<p>Une obligation individuelle est un contrat de dette représenté par un titre financier.</p>
<p>Lorsqu'un investisseur achète une obligation à taux fixe, il connaît les conditions contractuelles de paiement des coupons et de remboursement, sous réserve que l'émetteur respecte ses engagements.</p>
<p>Prenons une obligation fictive de 1 000 € de nominal, versant un coupon annuel de 3 % et arrivant à échéance dans cinq ans.</p>
<p>Le titre prévoit un coupon de 30 € par an et le remboursement du nominal à la date définie. Si l'investisseur l'achète à 970 €, son rendement actuariel sera supérieur au taux de coupon grâce à la différence entre le prix payé et le remboursement prévu.</p>
<p>Cette prévisibilité des flux constitue l'une des caractéristiques fondamentales des obligations individuelles.</p>
<p>Elle ne signifie toutefois pas que le placement soit sans risque : un défaut de l'émetteur, une modification contractuelle ou une vente avant échéance peuvent modifier le résultat.</p>
<h2 id="fonctionnement-etf">Comment fonctionne un ETF obligataire ?</h2>
<p>Un ETF obligataire est un fonds coté qui détient, directement ou indirectement, un ensemble d'obligations.</p>
<p>Certains ETF investissent dans des obligations souveraines européennes, d'autres dans des obligations d'entreprises ou dans des émissions présentant une certaine qualité de crédit.</p>
<p>Plutôt que de sélectionner individuellement chaque titre, l'investisseur détient des parts du fonds.</p>
<p>Les ETF obligataires traditionnels suivent souvent un indice dont la composition évolue au fil du temps. Lorsque des obligations arrivent à échéance ou cessent de satisfaire les critères de l'indice, elles peuvent être remplacées.</p>
<p>Le fonds maintient ainsi une exposition obligataire qui peut se prolonger indéfiniment.</p>
<p>Cette caractéristique crée une différence importante avec une obligation individuelle : un ETF traditionnel n'a généralement pas une échéance unique à laquelle l'investisseur récupère une valeur nominale contractuelle.</p>
<h2 id="hausse-des-taux">Que se passe-t-il lorsque les taux augmentent ?</h2>
<p>Supposons qu'un investisseur possède une obligation à taux fixe dont le coupon devient moins attractif à la suite d'une hausse générale des taux.</p>
<p>Le prix de marché de cette obligation tend à diminuer.</p>
<p>Si l'investisseur la conserve jusqu'à son échéance et que l'émetteur honore ses obligations, les paiements contractuels restent ceux qui étaient prévus.</p>
<p>La situation d'un ETF obligataire est différente. Sa valeur liquidative reflète en permanence les variations des prix des titres qui composent son portefeuille.</p>
<p>Le fonds peut progressivement renouveler certaines positions avec des obligations offrant des rendements plus élevés. Cette réallocation peut améliorer son rendement futur, sans effacer automatiquement les pertes de valeur antérieures.</p>
<p>La sensibilité de chaque solution dépend notamment de sa duration.</p>
<p>Il serait donc incorrect de considérer que les obligations individuelles ne fluctuent pas, ou que les ETF obligataires sont systématiquement plus risqués. Les deux sont sensibles aux taux ; la structure des flux et de la détention diffère.</p>
<h2 id="etf-a-echeance">ETF obligataire à échéance : un cas particulier</h2>
<p>Il existe également des ETF obligataires à échéance définie.</p>
<p>Ces produits détiennent des obligations dont les remboursements sont concentrés autour d'une année déterminée. Ils cherchent à combiner une certaine visibilité temporelle avec les avantages d'un fonds diversifié.</p>
<p>Ils ne sont cependant pas identiques à une obligation individuelle.</p>
<p>Leur valeur finale dépend notamment des titres détenus, des défauts éventuels, des frais du fonds et des modalités de liquidation.</p>
<p>Il faut donc examiner leur documentation avant de les comparer à un titre à échéance fixe.</p>
<h2 id="diversification">Diversification : l'avantage du portefeuille</h2>
<p>Une obligation individuelle expose directement l'investisseur à un émetteur et aux caractéristiques d'une émission.</p>
<p>Un ETF peut répartir cette exposition entre des dizaines ou des centaines de titres. Cette diversification limite potentiellement l'effet d'un défaut isolé, sans supprimer le risque général du marché obligataire.</p>
<p>Elle peut également introduire d'autres caractéristiques, comme une exposition à des devises étrangères, des secteurs économiques spécifiques ou des catégories de crédit plus risquées.</p>
<p>Pour une comparaison pertinente, il faut comprendre ce que contient réellement le fonds.</p>
<p>Un ETF composé d'obligations d'entreprises à haut rendement n'est pas directement comparable à une obligation souveraine de qualité de crédit élevée.</p>
<h2 id="frais">Les frais : deux structures différentes</h2>
<p>Lorsqu'un particulier achète une obligation directement, il peut supporter une commission de courtage, un écart entre le prix acheteur et vendeur ainsi que certains frais de compte.</p>
<p>Un ETF obligataire présente également des coûts de transaction, auxquels s'ajoutent les frais courants du fonds. Le fonds supporte en outre certains coûts liés à la gestion de ses positions.</p>
<p>Le coût pertinent dépend de l'intermédiaire, de la durée de détention et du produit utilisé.</p>
<p>Prenons un exemple purement illustratif : une commission de 15 € pour acheter 10 000 € d'obligations représente 0,15 % du montant investi.</p>
<p>Un ETF dont les frais courants sont de 0,20 % par an représente, à valeur de portefeuille inchangée, environ 20 € de frais annuels pour 10 000 € investis, sans compter les autres coûts éventuels.</p>
<p>Ces deux montants ne sont pas directement équivalents : l'un est ponctuel, l'autre récurrent.</p>
<p>Comparer les coûts suppose donc de préciser la durée envisagée et les opérations nécessaires.</p>
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
<p>Reprenons l'exemple illustratif de 10 000 € investis, avec les mêmes hypothèses : 15 € de courtage à l'achat dans les deux cas, une obligation conservée jusqu'à son échéance et un ETF dont les frais courants sont de 0,20 % par an sur une valeur supposée constante.</p>
<table>
<thead><tr><th scope="col">Durée de détention</th><th scope="col">Obligation en direct</th><th scope="col">ETF obligataire (0,20 % par an)</th></tr></thead>
<tbody>
<tr><td>1 an</td><td>15 €</td><td>35 €</td></tr>
<tr><td>3 ans</td><td>15 €</td><td>75 €</td></tr>
<tr><td>5 ans</td><td>15 €</td><td>115 €</td></tr>
<tr><td>10 ans</td><td>15 €</td><td>215 €</td></tr>
</tbody>
</table>
<p>Le calcul ne retient que ces deux postes. Il ignore l'écart entre prix acheteur et vendeur, les éventuels droits de garde, la commission de revente de l'ETF et le fait qu'un portefeuille d'obligations en direct suffisamment diversifié demande plusieurs ordres, donc plusieurs commissions. Avec cinq lignes à 15 € chacune, l'obligation en direct coûterait 75 € à l'achat. L'avantage dépend donc du nombre de titres et de la durée de détention : c'est un calcul à refaire avec la grille de votre courtier. Notre <a href="/fr/courtiers-obligations">comparatif des courtiers</a> détaille ces frais.</p>
<h2 id="duration-dans-le-temps">La duration dans le temps : un écart souvent oublié</h2>
<p>La duration d'une obligation détenue en direct diminue à mesure que l'échéance approche. Une obligation à 5 ans avec un coupon de 3 %, achetée au pair, a une duration modifiée d'environ 4,6. Deux ans plus tard, il lui reste trois ans à courir et sa duration n'est plus que d'environ 2,8 : une hausse des taux d'un point ne ferait plus baisser son prix que d'environ 2,8 %.</p>
<p>Un ETF obligataire traditionnel garde au contraire une duration à peu près stable, puisqu'il remplace les titres proches de l'échéance. Son risque de taux ne s'éteint pas avec le temps. C'est l'une des raisons pour lesquelles les investisseurs qui ont une date précise de besoin d'argent regardent souvent des obligations arrivant à échéance à cette date, ou des ETF à échéance définie.</p>
<h2 id="donnees-du-jour">Ce que rapportent aujourd'hui les obligations en direct</h2>
<p>Pour comparer un ETF à des obligations individuelles, le plus utile est de rapprocher des profils semblables : une duration proche et une qualité de crédit comparable. Le tableau ci-dessous présente, à partir des données obligataires de 10BONDS mises à jour chaque jour ouvré, des obligations notées <em>investment grade</em> pour des durations d'environ 2, 5 et 10 ans, une par émetteur.</p>
<p>[[10bonds:bonds:best]]</p>
<p>Pour la comparaison, l'émetteur d'un ETF publie dans sa fiche produit la duration moyenne du portefeuille et, souvent, un rendement à l'échéance moyen. Rapprochez ce rendement des lignes de duration voisine, puis déduisez les frais courants du fonds. Un écart important s'explique en général par une différence de qualité de crédit, de duration ou de composition, et non par un avantage « gratuit ». Les rendements présentés ici sont bruts et ne constituent pas une recommandation.</p>
<h2 id="fiscalite">Et la fiscalité en France ?</h2>
<p>En compte-titres, les coupons et plus-values d'obligations détenues en direct relèvent en principe du prélèvement forfaitaire unique, de 31,4 % en 2026 (12,8 % d'impôt sur le revenu et 18,6 % de prélèvements sociaux), avec une option possible pour le barème progressif. Les plus-values de cession de parts d'ETF détenues en compte-titres y sont en principe aussi soumises. Les obligations ne peuvent pas être détenues en direct dans un PEA, et la plupart des ETF obligataires n'y sont pas éligibles. Certains contrats d'assurance-vie proposent des ETF obligataires en unités de compte, avec une fiscalité différente.</p>
<h2 id="faq">Questions fréquentes</h2>
<h3>Un ETF obligataire peut-il perdre de l'argent ?</h3>
<p>Oui. Sa valeur liquidative baisse lorsque les taux montent ou lorsque la qualité de crédit des émetteurs se dégrade. Comme il n'a généralement pas d'échéance, il n'existe pas de date à laquelle cette baisse est mécaniquement rattrapée.</p>
<h3>Faut-il beaucoup d'argent pour acheter des obligations en direct ?</h3>
<p>Cela dépend des titres. Certaines obligations d'entreprise ont des coupures minimales élevées, tandis que les OAT ont en général un nominal unitaire faible. Les frais minimums du courtier comptent souvent davantage que la coupure.</p>
<h3>Comment comparer le rendement d'un ETF et celui d'une obligation ?</h3>
<p>Comparez le rendement à l'échéance moyen publié pour l'ETF avec celui d'obligations de duration et de notation proches, puis retirez les frais courants du fonds. Le tableau de cette page fournit les rendements bruts d'obligations par duration.</p>
<h2 id="pourquoi-comparer">Pourquoi comparer les obligations individuelles reste utile</h2>
<p>Les investisseurs qui s'intéressent aux obligations en direct doivent examiner un nombre parfois important de titres, dont les caractéristiques sont rarement parfaitement comparables.</p>
<p>Le rendement actuariel, la duration, la notation de crédit et les conditions de remboursement constituent les principaux points de départ de cette analyse.</p>
<p>10BONDS simplifie cette recherche en permettant de comparer des obligations européennes selon une duration et un rendement cible.</p>
<p>La plateforme présente une liste de dix obligations dont les caractéristiques peuvent ensuite être examinées individuellement.</p>
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

/** Earlier French guide slug -> the slug of Livio's article that replaced it. */
export const FR_LIVIO_MOVED: Record<string, string> = Object.fromEntries(SEED_GUIDES_LIVIO_FR.map((g) => [g.oldSlug, g.slug]));
