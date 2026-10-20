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
    relatedSlugs: ["oat-obligations-etat", "risque-de-credit-obligataire"],
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
