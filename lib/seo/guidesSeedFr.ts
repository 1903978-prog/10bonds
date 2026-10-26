import type { SeedGuide } from "./guidesSeed";

// Guides written for French investors (OAT, French taxation and vocabulary), not translations of the Italian ones.
// OAT and yield-to-maturity guides were replaced by the owner's articles (guidesOwnerFr.ts) on 19 Oct 2026.
// Added in "review": the tax paragraphs in particular must be checked before publication.

const cta = (text: string) => `<p><strong>Essayez :</strong> <a href="/fr">${text}</a>. Deux curseurs, dix obligations, sans engagement.</p>`;

export const SEED_GUIDES_FR: SeedGuide[] = [
  {
    locale: "fr",
    topic: "credit",
    slug: "risque-de-credit-obligataire",
    title: "Risque de crédit : comment l'évaluer sur une obligation",
    seoTitle: "Risque de crédit obligataire : comment l'évaluer",
    metaDescription: "Le risque de crédit est le risque que l'émetteur ne rembourse pas. Notation, spread, rang de créance et diversification expliqués simplement.",
    primaryKeyword: "risque de crédit obligation",
    relatedKeywords: ["notation obligation", "spread de crédit", "défaut émetteur"],
    relatedSlugs: ["calcul-rendement-obligation", "obligations-etat-ou-entreprise"],
    bodyHtml: `
<p>Acheter une obligation, c'est prêter de l'argent, avec une question en tête : le reverrai-je ? Le <strong>risque de crédit</strong> est le risque que l'émetteur ne verse pas ses coupons ou ne rende pas son capital, en tout ou en partie. C'est le risque principal des obligations d'entreprise, et la raison pour laquelle certaines paient beaucoup plus que d'autres.</p>
<h2 id="notation">Premier indicateur : la notation</h2>
<p>S&amp;P, Moody's et Fitch condensent le risque de crédit en une note, de AAA à D. Une frontière compte plus que les autres : celle qui sépare l'<a href="/fr/obligations/investment-grade">investment grade</a> (jusqu'à BBB-) du <a href="/fr/obligations/haut-rendement">haut rendement</a> (à partir de BB+). La note rend service, mais elle a souvent un train de retard : un point de départ, pas une garantie.</p>
<h2 id="spread">Deuxième indicateur : le spread</h2>
<p>Le <strong>spread</strong> est l'écart entre le rendement de l'obligation et celui d'un emprunt d'État quasi sans risque de même durée, souvent le Bund allemand ou l'OAT. C'est le prix que réclame le marché pour dormir moins bien : plus il est large, plus la compensation exigée est forte. Un spread très éloigné de celui des émetteurs de même note est un signal à prendre au sérieux.</p>
<h2 id="perte">Combien perd-on en cas de défaut ?</h2>
<p>Un défaut n'est pas forcément une page blanche. Ce que l'on récupère dépend :</p>
<ul>
<li>du <strong>rang de la créance</strong> : les obligations <em>senior</em> passent avant les <em>subordonnées</em>, qui rapportent davantage justement parce qu'elles attendent dans le couloir ;</li>
<li>des <strong>garanties</strong> : les obligations sécurisées, comme les obligations foncières (covered bonds), récupèrent davantage ;</li>
<li>des actifs de l'émetteur et de son secteur.</li>
</ul>
<p>Les banques européennes ajoutent le <strong>renflouement interne</strong> (bail-in) : en cas de crise, les autorités peuvent imposer des pertes aux créanciers, en commençant par les titres subordonnés.</p>
<h2 id="diversifier">Le remède le plus simple : diversifier</h2>
<p>Répartir son capital entre plusieurs émetteurs, secteurs et pays limite les dégâts d'un défaut isolé ; le proverbe des œufs et du panier n'a pas pris une ride. D'où la règle des listes de 10BONDS : <strong>une seule obligation par émetteur</strong>, soit dix obligations et dix émetteurs différents.</p>
<h2 id="rendement-risque">Rendement et risque vont ensemble</h2>
<p>À duration égale, un rendement plus élevé est presque toujours le salaire d'un risque de crédit plus élevé. Pas de repas gratuit ici, seulement des additions différées. Si une obligation paie bien plus que ses voisines de même note, demandez-vous pourquoi. Comparez les <a href="/fr/obligations/investment-grade">obligations investment grade</a> et les <a href="/fr/obligations/haut-rendement">obligations à haut rendement</a>.</p>
${cta("réglez le curseur de notation sur le niveau de risque de crédit que vous acceptez")}
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
    relatedSlugs: ["oat-obligations-etat", "risque-de-credit-obligataire"],
    bodyHtml: `
<p>Les <strong>OAT</strong> et autres obligations d'État, ou les <strong>obligations d'entreprise</strong>, plus rémunératrices ? Le débat anime les déjeuners de famille depuis des générations. La réponse dépend de votre situation ; la méthode de comparaison, elle, ne change pas.</p>
<h2 id="horizon">1. Comparer à horizon égal</h2>
<p>Opposer une OAT à 2 ans et une obligation d'entreprise à 10 ans, c'est comparer un Paris-Lyon à un Paris-Tokyo et s'étonner de l'écart de prix. Si la seconde rapporte plus, c'est en partie parce qu'elle est plus longue et plus sensible aux taux. Fixez d'abord la <strong>duration</strong> qui correspond à votre horizon, puis comparez les rendements dans cette zone.</p>
<h2 id="prime">2. Mesurer la prime de risque</h2>
<p>L'écart de rendement entre une obligation d'entreprise et une OAT de même duration s'appelle la <strong>prime de crédit</strong> : la rémunération du doute. Quelques centièmes de point pour un émetteur moins bien noté que l'État français, c'est un risque payé au lance-pierre ; une prime confortable chez un émetteur solide mérite l'attention, à condition de comprendre pourquoi le marché l'exige. Notre guide sur le <a href="/fr/guides/risque-de-credit-obligataire">risque de crédit</a> explique comment la lire.</p>
<h2 id="notation">3. Regarder la notation plutôt que le nom</h2>
<p>Certaines grandes entreprises européennes sont mieux notées que la France, et leurs obligations peuvent rapporter moins que les OAT. D'autres, très connues, figurent en haut rendement. La notoriété d'une marque renseigne sur son budget publicitaire, pas sur son risque de crédit.</p>
<h2 id="liquidite">4. Penser à la liquidité</h2>
<p>Les OAT s'échangent en volumes considérables : on les revend sans peine, avec un faible écart entre prix d'achat et de vente. Beaucoup d'obligations d'entreprise sont moins liquides, surtout les petites émissions, où trouver un acheteur tient parfois de la chasse au taxi un soir d'averse. Si vous risquez d'avoir besoin de votre argent avant l'échéance, ce point compte.</p>
<h2 id="diversifier">5. Diversifier</h2>
<p>Un portefeuille fait uniquement d'OAT n'a qu'un débiteur, l'État français, aussi solide soit-il. Ajouter des émetteurs d'autres secteurs et d'autres pays réduit cette dépendance. C'est pourquoi les listes 10BONDS ne retiennent qu'une obligation par émetteur.</p>
<h2 id="donnees">Les données du jour</h2>
<p>Comparez la courbe des <a href="/fr/obligations/oat">OAT</a> avec les <a href="/fr/obligations/obligations-entreprise">obligations d'entreprise en euros</a> et les <a href="/fr/obligations/meilleures-obligations">obligations investment grade les mieux rémunérées</a>, toutes mises à jour chaque jour.</p>
${cta("fixez votre horizon et votre rendement cible, puis comparez États et entreprises dans une seule liste")}
`,
  },
];
