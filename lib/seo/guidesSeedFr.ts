import type { SeedGuide } from "./guidesSeed";

// Guides written for French investors (OAT, French taxation and vocabulary), not translations of the Italian ones.
// Added in "review": the tax paragraphs in particular must be checked before publication.

const cta = (text: string) => `<p><strong>Essayez :</strong> <a href="/fr">${text}</a>. Deux curseurs, dix obligations, sans engagement.</p>`;

export const SEED_GUIDES_FR: SeedGuide[] = [
  {
    locale: "fr",
    topic: "gov",
    slug: "oat-obligations-etat-francaises",
    title: "OAT : comprendre les obligations d'État françaises",
    seoTitle: "OAT : rendements et échéances des obligations d'État",
    metaDescription: "Les OAT expliquées : fonctionnement, OATi et OAT€i, risque de taux, spread avec le Bund et comment comparer leurs rendements.",
    primaryKeyword: "oat rendement",
    relatedKeywords: ["oat", "obligations d'état françaises", "oat 10 ans", "oat indexée inflation"],
    relatedSlugs: ["obligations-etat-ou-entreprise", "rendement-a-l-echeance"],
    bodyHtml: `
<p>Les <strong>OAT</strong>, Obligations Assimilables du Trésor, sont les titres de dette à moyen et long terme de l'État français. Elles sont émises par l'<strong>Agence France Trésor</strong> (AFT) et servent de référence pour l'ensemble des taux en France : le taux de l'OAT à 10 ans influence les crédits immobiliers, le rendement des fonds en euros de l'assurance-vie et le coût de financement des entreprises.</p>
<h2 id="fonctionnement">Comment fonctionne une OAT</h2>
<p>Une OAT classique verse un <strong>coupon fixe une fois par an</strong> et rembourse sa valeur nominale à l'échéance, de 2 à 50 ans. « Assimilable » signifie que l'AFT peut rouvrir une ligne existante et émettre de nouveaux titres identiques aux anciens, ce qui rend les OAT très liquides. Les particuliers les achètent sur le marché secondaire, via leur banque ou un courtier, ou indirectement à travers des fonds et l'assurance-vie.</p>
<h2 id="indexees">OATi et OAT€i : les OAT indexées sur l'inflation</h2>
<p>L'<strong>OATi</strong> est indexée sur l'inflation française hors tabac, l'<strong>OAT€i</strong> sur l'inflation de la zone euro hors tabac. Le capital et les coupons sont réévalués avec l'indice des prix : elles protègent contre une inflation plus forte que prévu. Leur rendement « réel » ne se compare pas directement au rendement nominal d'une OAT classique ; c'est pourquoi elles ne figurent pas dans nos tableaux.</p>
<h2 id="spread">Le spread OAT-Bund</h2>
<p>L'écart entre le rendement de l'OAT et celui du Bund allemand à même échéance mesure la prime exigée par les investisseurs pour prêter à la France plutôt qu'à l'Allemagne. Il s'élargit quand le marché s'inquiète des finances publiques françaises ou de la situation politique, et se resserre quand la confiance revient. Vous pouvez comparer les deux courbes sur nos pages <a href="/fr/obligations/oat">OAT</a> et <a href="/fr/obligations/bund-allemands">Bund allemands</a>.</p>
<h2 id="risques">Les risques</h2>
<p>Le principal risque d'une OAT pour un particulier est le <strong>risque de taux</strong> : si les taux montent, le prix des OAT déjà émises baisse, d'autant plus que l'échéance est lointaine. La <em>duration</em> mesure cette sensibilité. Le <strong>risque de crédit</strong> de l'État français est jugé faible par les agences de notation, mais la note de la France a été abaissée ces dernières années : ce n'est pas un placement sans risque au sens strict. Enfin, en cas de revente avant l'échéance, le prix obtenu peut être inférieur au prix d'achat.</p>
<h2 id="fiscalite">Fiscalité</h2>
<p>Pour un particulier résident en France, les coupons et plus-values d'une OAT détenue en compte-titres relèvent en principe du prélèvement forfaitaire unique (la « flat tax »), avec option possible pour le barème progressif. Son taux a évolué ces dernières années : vérifiez le taux en vigueur auprès de votre banque ou sur impots.gouv.fr. Les rendements affichés sur 10BONDS sont toujours bruts.</p>
<h2 id="comparer">Comment comparer les OAT</h2>
<p>Choisissez d'abord l'horizon qui vous correspond, puis comparez le <a href="/fr/guides/rendement-a-l-echeance">rendement à l'échéance</a> des OAT avec celui d'autres émetteurs de même duration, par exemple les <a href="/fr/obligations/obligations-entreprise">obligations d'entreprise</a>. Notre guide <a href="/fr/guides/obligations-etat-ou-entreprise">obligations d'État ou d'entreprise ?</a> détaille la méthode.</p>
${cta("choisissez une duration et un rendement cible et voyez où se situent les OAT")}
`,
  },
  {
    locale: "fr",
    topic: "ytm",
    slug: "rendement-a-l-echeance",
    title: "Rendement à l'échéance : comment le calculer et l'utiliser",
    seoTitle: "Rendement à l'échéance d'une obligation : calcul",
    metaDescription: "Le rendement à l'échéance (taux actuariel) d'une obligation expliqué : différence avec le coupon, formule, exemple chiffré et hypothèses.",
    primaryKeyword: "rendement à l'échéance",
    relatedKeywords: ["taux actuariel obligation", "calcul rendement obligation", "yield to maturity"],
    relatedSlugs: ["oat-obligations-etat-francaises", "risque-de-credit-obligataire"],
    bodyHtml: `
<p>Le <strong>rendement à l'échéance</strong>, aussi appelé <em>taux actuariel</em> ou <em>yield to maturity</em>, est le chiffre clé pour comparer des obligations. Il indique le rendement annuel que vous obtiendriez en achetant une obligation à son prix actuel et en la conservant jusqu'à son remboursement, si l'émetteur paie tous les coupons et le capital.</p>
<h2 id="coupon">Coupon et rendement : la différence</h2>
<p>Le <strong>coupon</strong> est fixé à l'émission et calculé sur la valeur nominale (100). Le <strong>prix</strong>, lui, varie chaque jour en fonction des taux et de la qualité de l'émetteur. Acheter en dessous de 100 ajoute un gain au remboursement ; acheter au-dessus de 100 crée une perte à l'échéance. Le rendement à l'échéance combine ces deux éléments : c'est pourquoi deux obligations à coupon de 3 % peuvent avoir des rendements très différents.</p>
<h2 id="formule">La formule</h2>
<p>Le rendement à l'échéance est le taux <em>y</em> qui égalise le prix actuel et la valeur actualisée des flux futurs :</p>
<p><code>Prix = C/(1+y) + C/(1+y)² + … + (C+100)/(1+y)ⁿ</code></p>
<p>avec <em>C</em> le coupon annuel et <em>n</em> le nombre d'années restantes. Il n'y a pas de solution directe : on la trouve par itérations, comme le fait la fonction <code>TRI</code> ou <code>RENDEMENT.TITRE</code> d'un tableur.</p>
<h2 id="exemple">Exemple chiffré</h2>
<p>Une obligation verse un coupon annuel de 3 %, rembourse dans 5 ans et cote 95 % du nominal :</p>
<ul>
<li>chaque année, vous recevez 3 € pour 100 € de nominal ;</li>
<li>à l'échéance, vous recevez 100 €, soit 5 € de plus que le prix payé ;</li>
<li>le taux qui égalise 95 et la valeur actuelle de ces flux est d'environ <strong>4,13 %</strong> par an.</li>
</ul>
<p>Une approximation rapide : <code>(C + (100 − Prix) / n) / ((100 + Prix) / 2)</code>, soit (3 + 1) / 97,5 = 4,10 %.</p>
<h2 id="hypotheses">Les hypothèses à garder en tête</h2>
<ul>
<li>L'obligation est conservée <strong>jusqu'à l'échéance</strong> ; en cas de vente anticipée, tout dépend du prix du moment.</li>
<li>L'émetteur <strong>ne fait pas défaut</strong> (voir notre guide sur le <a href="/fr/guides/risque-de-credit-obligataire">risque de crédit</a>).</li>
<li>Les coupons sont <strong>réinvestis au même taux</strong>, ce qui n'est jamais exactement le cas.</li>
<li>L'obligation n'est <strong>pas remboursée par anticipation</strong> ; pour une obligation remboursable par anticipation, regardez aussi le rendement au premier remboursement possible.</li>
</ul>
<h2 id="brut">Rendement brut, rendement net</h2>
<p>Les rendements affichés sur 10BONDS sont bruts, avant impôts et frais. Votre rendement net dépend de votre fiscalité et de l'enveloppe utilisée (compte-titres, assurance-vie, PEA ne pouvant pas détenir d'obligations en direct).</p>
<h2 id="utiliser">Comment l'utiliser</h2>
<p>Comparez toujours le rendement avec la <strong>duration</strong>, qui mesure la sensibilité aux taux, et avec la <strong>notation</strong>, qui mesure le risque de l'émetteur. Exemples à jour : les <a href="/fr/obligations/rendement-4-pourcent">obligations proches de 4 %</a> ou celles d'une <a href="/fr/obligations/duration-5-ans">duration d'environ 5 ans</a>.</p>
${cta("indiquez votre horizon et votre rendement cible pour voir les 10 obligations les plus proches")}
`,
  },
  {
    locale: "fr",
    topic: "credit",
    slug: "risque-de-credit-obligataire",
    title: "Risque de crédit : comment l'évaluer sur une obligation",
    seoTitle: "Risque de crédit obligataire : comment l'évaluer",
    metaDescription: "Le risque de crédit est le risque que l'émetteur ne rembourse pas. Notation, spread, rang de créance et diversification expliqués simplement.",
    primaryKeyword: "risque de crédit obligation",
    relatedKeywords: ["notation obligation", "spread de crédit", "défaut émetteur"],
    relatedSlugs: ["rendement-a-l-echeance", "obligations-etat-ou-entreprise"],
    bodyHtml: `
<p>Acheter une obligation, c'est prêter de l'argent à un émetteur. Le <strong>risque de crédit</strong> est le risque que cet émetteur ne paie pas ses coupons ou ne rembourse pas son capital, en tout ou en partie. C'est le principal risque des obligations d'entreprise et la raison pour laquelle certaines rapportent beaucoup plus que d'autres.</p>
<h2 id="notation">Premier indicateur : la notation</h2>
<p>S&amp;P, Moody's et Fitch résument le risque de crédit par une note, de AAA à D. La frontière essentielle sépare l'<a href="/fr/obligations/investment-grade">investment grade</a> (jusqu'à BBB-) du <a href="/fr/obligations/haut-rendement">haut rendement</a> (à partir de BB+). La notation est utile mais réagit souvent avec retard : c'est un point de départ, pas une garantie.</p>
<h2 id="spread">Deuxième indicateur : le spread</h2>
<p>Le <strong>spread</strong> est l'écart entre le rendement de l'obligation et celui d'un emprunt d'État quasi sans risque de même durée, souvent le Bund allemand ou l'OAT. Plus il est large, plus le marché exige de compensation. Un spread qui s'écarte nettement de celui des émetteurs de même notation est un signal à prendre au sérieux.</p>
<h2 id="perte">Combien perd-on en cas de défaut ?</h2>
<p>Un défaut ne signifie pas tout perdre. Le montant récupéré dépend :</p>
<ul>
<li>du <strong>rang de la créance</strong> : les obligations <em>senior</em> sont remboursées avant les <em>subordonnées</em>, qui rapportent plus justement pour cette raison ;</li>
<li>des <strong>garanties</strong> : les obligations sécurisées, comme les obligations foncières (covered bonds), récupèrent davantage ;</li>
<li>des actifs et du secteur de l'émetteur.</li>
</ul>
<p>Pour les banques européennes s'ajoute le <strong>renflouement interne</strong> (bail-in) : en cas de crise, les autorités peuvent imposer des pertes aux créanciers, en commençant par les titres subordonnés.</p>
<h2 id="diversifier">Le remède le plus simple : diversifier</h2>
<p>Répartir son capital entre plusieurs émetteurs, secteurs et pays limite l'impact d'un défaut isolé. C'est pourquoi les listes de 10BONDS ne retiennent <strong>qu'une obligation par émetteur</strong> : dix obligations, dix émetteurs différents.</p>
<h2 id="rendement-risque">Rendement et risque vont ensemble</h2>
<p>À duration égale, un rendement plus élevé est presque toujours la contrepartie d'un risque de crédit plus élevé. Si une obligation rapporte beaucoup plus que les autres de même notation, demandez-vous pourquoi. Comparez par exemple les <a href="/fr/obligations/investment-grade">obligations investment grade</a> et les <a href="/fr/obligations/haut-rendement">obligations à haut rendement</a>.</p>
${cta("utilisez le curseur de notation pour choisir le niveau de risque de crédit que vous acceptez")}
`,
  },
  {
    locale: "fr",
    topic: "compare",
    slug: "obligations-etat-ou-entreprise",
    title: "Obligations d'État ou obligations d'entreprise ?",
    seoTitle: "Obligations d'État ou d'entreprise : que choisir ?",
    metaDescription: "OAT ou obligations d'entreprise : comparer rendement, risque de crédit, liquidité et diversification avec une méthode simple en cinq étapes.",
    primaryKeyword: "obligations d'état ou obligations d'entreprise",
    relatedKeywords: ["comment comparer rendement et risque obligataire", "obligations d'entreprise", "oat ou corporate"],
    relatedSlugs: ["oat-obligations-etat-francaises", "risque-de-credit-obligataire"],
    bodyHtml: `
<p>Faut-il privilégier les <strong>OAT</strong> et autres obligations d'État, ou les <strong>obligations d'entreprise</strong>, plus rémunératrices ? La réponse dépend de votre situation, mais la méthode de comparaison, elle, est toujours la même.</p>
<h2 id="horizon">1. Comparer à horizon égal</h2>
<p>Une OAT à 2 ans et une obligation d'entreprise à 10 ans ne se comparent pas : la seconde rapporte plus en partie parce qu'elle est plus longue et plus sensible aux taux. Fixez d'abord la <strong>duration</strong> qui correspond à votre horizon, puis comparez les rendements dans cette zone.</p>
<h2 id="prime">2. Mesurer la prime de risque</h2>
<p>L'écart de rendement entre une obligation d'entreprise et une OAT de même duration est la <strong>prime de crédit</strong>. Quelques centièmes de point pour un émetteur moins bien noté que l'État français rémunèrent mal le risque ; une prime confortable sur un émetteur solide mérite l'attention, à condition de comprendre pourquoi le marché l'exige. Notre guide sur le <a href="/fr/guides/risque-de-credit-obligataire">risque de crédit</a> explique comment la lire.</p>
<h2 id="notation">3. Regarder la notation plutôt que le nom</h2>
<p>Certaines grandes entreprises européennes sont mieux notées que la France, et leurs obligations peuvent rapporter moins que les OAT. D'autres, très connues, sont en haut rendement. Une marque familière ne dit rien du risque de crédit.</p>
<h2 id="liquidite">4. Penser à la liquidité</h2>
<p>Les OAT s'échangent en très grandes quantités : on peut les revendre facilement, avec un faible écart entre prix d'achat et de vente. Beaucoup d'obligations d'entreprise sont moins liquides, surtout les petites émissions. Si vous risquez d'avoir besoin de votre argent avant l'échéance, ce point compte.</p>
<h2 id="diversifier">5. Diversifier</h2>
<p>Un portefeuille composé uniquement d'OAT dépend entièrement de l'État français. Ajouter des émetteurs de secteurs et de pays différents réduit cette dépendance. Les listes 10BONDS ne retiennent qu'une obligation par émetteur pour cette raison.</p>
<h2 id="donnees">Les données du jour</h2>
<p>Comparez la courbe des <a href="/fr/obligations/oat">OAT</a> avec les <a href="/fr/obligations/obligations-entreprise">obligations d'entreprise en euros</a> et les <a href="/fr/obligations/meilleures-obligations">obligations investment grade les mieux rémunérées</a>, mises à jour chaque jour.</p>
${cta("fixez votre horizon et votre rendement cible pour comparer États et entreprises dans la même liste")}
`,
  },
];
