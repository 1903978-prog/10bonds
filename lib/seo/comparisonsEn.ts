import { COMPARISONS, type ComparisonDef, type Topic } from "./comparisons";
import { enPath } from "./knowledgeEn";

// English versions of the comparison pages, for readers in the US and the UK (Knowledge Center, /knowledge/bonds).
// They use the same bond data as the Italian, French and German pages and the same ids, so the numbers match.
// The bonds are euro bonds: a reader paid in dollars or pounds also carries currency risk, which each page says.
// Information only, never advice.

export type EnText = { slug: string; h1: string; title: string; description: string; intro: [string, string] };

export const EN_BONDS_BASE = enPath("bonds");
export const enBondsPath = (slug?: string) => (slug ? `${EN_BONDS_BASE}/${slug}` : EN_BONDS_BASE);

const FX = "These are euro bonds: if you earn and spend in dollars or pounds, the exchange rate moves your result on top of the bond's own return.";

export const EN_TEXT: Record<string, EnText> = {
  "gov-de": {
    slug: "german-bunds", h1: "German Bunds: government bond returns by maturity", title: "German Bunds: returns by maturity",
    description: "Return to maturity and duration of German government bonds in euros, one per maturity year, with the date of the data.",
    intro: ["German federal bonds, known as Bunds, are the benchmark for euro government debt. Their return is the reference point from which most other euro bond returns are measured, in the way a Treasury yield is in the United States and a gilt yield is in the United Kingdom.", `The table shows one bond per maturity year, a simplified yield curve. ${FX}`],
  },
  "gov-fr": {
    slug: "french-oat", h1: "French OATs: government bond returns by maturity", title: "French OATs: returns by maturity",
    description: "Return to maturity and duration of French government bonds (OATs) in euros, one per maturity year, updated daily.",
    intro: ["OATs (Obligations Assimilables du Trésor) are the bonds France issues to finance the state. They usually pay a little more than German Bunds of the same maturity, and the gap between the two is one of the most watched numbers in the euro market.", `The table shows one OAT per maturity year. Inflation-linked OATs are left out, because their payments depend on inflation and cannot be compared directly with a fixed return. ${FX}`],
  },
  "gov-it": {
    slug: "italian-btp", h1: "Italian BTPs: government bond returns by maturity", title: "Italian BTPs: returns by maturity",
    description: "Return to maturity and duration of Italian government bonds (BTPs) in euros, one per maturity year, with the data date.",
    intro: ["BTPs (Buoni del Tesoro Poliennali) are Italy's medium and long term government bonds. They have historically paid more than German Bunds because rating agencies see more credit risk in Italy, and the gap, known as the spread, is a standard gauge of stress in the euro area.", `Read the table next to the Bund and OAT pages: the same maturity year can carry very different returns depending on the issuer. ${FX}`],
  },
  best: {
    slug: "highest-returning-investment-grade-bonds", h1: "Investment grade euro bonds with the highest returns, by horizon", title: "Highest-returning investment grade euro bonds",
    description: "Investment grade euro bonds with the highest return to maturity at 2, 5 and 10 years of duration, one per issuer, updated daily.",
    intro: ["Higher return is not the same as better. This page applies one transparent rule: for three horizons, 2, 5 and 10 years of duration, it lists the investment grade bonds (10BONDS risk 1 to 6) with the highest return to maturity, one per issuer.", `At the same horizon a higher return usually reflects higher risk, so read the risk column before the return. ${FX}`],
  },
  corporate: {
    slug: "euro-corporate-bonds", h1: "Euro corporate bonds compared", title: "Euro corporate bonds: returns compared",
    description: "Euro bonds issued by companies and banks: return to maturity, duration and risk, one per issuer, updated every day.",
    intro: ["Corporate bonds are issued by companies and banks rather than governments. They tend to pay more than government bonds of the same maturity because the credit risk is higher: the issuer can fail to pay in a way a sovereign with its own central bank rarely does.", `Governments, agencies and supranational lenders are removed by the issuer's name, and each issuer appears once. ${FX}`],
  },
  "high-yield": {
    slug: "euro-high-yield-bonds", h1: "Euro high yield bonds compared", title: "Euro high yield bonds: returns compared",
    description: "High yield euro bonds (10BONDS risk 7 and above): return to maturity, duration and risk, one per issuer, updated daily.",
    intro: ["High yield bonds, sometimes called speculative grade, come from issuers with a higher credit risk (10BONDS risk 7 and above). They pay more because default is more likely, and their prices follow the economic cycle more closely than investment grade bonds do.", `Issuers without a rating and issuers in default are never shown, and each issuer appears once. ${FX}`],
  },
  "investment-grade": {
    slug: "euro-investment-grade-bonds", h1: "Euro investment grade bonds compared", title: "Euro investment grade bonds: returns compared",
    description: "Euro bonds with 10BONDS risk 1 to 6: return to maturity, duration and risk, one per issuer, with daily data.",
    intro: ["Investment grade describes bonds from issuers judged to be solid, which here means 10BONDS risk 1 to 6. Returns are lower than in high yield, in exchange for historically far fewer defaults.", `The table lists the highest-returning investment grade bonds, one per issuer, a starting point for seeing what the sturdier part of the euro market pays today. ${FX}`],
  },
  "issuers-de": {
    slug: "german-issuers", h1: "Euro bonds from German issuers", title: "Euro bonds from German issuers compared",
    description: "Euro bonds from issuers based in Germany: return to maturity, duration and risk, one per issuer, updated daily.",
    intro: ["German banks, development lenders and industrial groups all issue bonds in euros. A familiar name does not lower the risk: credit risk, duration and diversification matter more.", `The table lists euro bonds from issuers with their country in Germany, one per issuer, sorted by return. ${FX}`],
  },
  "issuers-fr": {
    slug: "french-issuers", h1: "Euro bonds from French issuers", title: "Euro bonds from French issuers compared",
    description: "Euro bonds from issuers based in France: return to maturity, duration and risk, one per issuer, updated every day.",
    intro: ["French banks and large industrial groups issue bonds in euros regularly. Owning bonds from several countries instead of one spreads the risk that a single national shock hits every holding at once.", `The table lists euro bonds from issuers with their country in France, one per issuer, sorted by return. ${FX}`],
  },
  "issuers-it": {
    slug: "italian-issuers", h1: "Euro bonds from Italian issuers", title: "Euro bonds from Italian issuers compared",
    description: "Euro bonds from issuers based in Italy: return to maturity, duration and risk, one per issuer, with the date of the data.",
    intro: ["Italian banks, utilities and industrial groups issue a steady flow of euro bonds. Their returns are often shaped by the country's own credit standing as well as the company's, which is why comparing them with similar issuers elsewhere is useful.", `The table lists euro bonds from issuers with their country in Italy, one per issuer, sorted by return. ${FX}`],
  },
  "yield-4": {
    slug: "euro-bonds-returning-4-percent", h1: "Euro bonds returning around 4% a year", title: "Euro bonds returning around 4% a year",
    description: "Euro bonds with a gross return to maturity between 3.5% and 4.5%: issuer, risk, duration and maturity year.",
    intro: ["A gross return to maturity of about 4% is what you would earn by buying today at the current price and holding to redemption, if the issuer pays every coupon and the principal. It is a projection, not a promise.", `At the same return, risk and duration can differ widely: two bonds at 4% can sit at opposite ends of the risk scale. The table shows both. ${FX}`],
  },
  "yield-5": {
    slug: "euro-bonds-returning-5-percent", h1: "Euro bonds returning around 5% a year", title: "Euro bonds returning around 5% a year",
    description: "Euro bonds with a gross return to maturity between 4.5% and 5.5%: issuer, risk, duration and maturity year, updated daily.",
    intro: ["In the euro market, returns near 5% mostly come from issuers with higher credit risk or from long maturities. The extra return is the market's price for that risk, and it can disappear if the issuer's position worsens.", `Check the risk column and the duration before the return: a long bond at 5% can lose far more in price when rates rise than a short one. ${FX}`],
  },
  "duration-5": {
    slug: "euro-bonds-5-years-duration", h1: "Euro bonds with about 5 years of duration", title: "Euro bonds with 5 years of duration compared",
    description: "Euro bonds with modified duration between 4.5 and 5.5 years: return to maturity, risk and maturity year, one per issuer.",
    intro: ["With a duration near 5 years, a one percentage point move in interest rates shifts the bond's price by roughly 5%. It is the middle of the range, often described as a compromise between return and sensitivity to rates.", `The table lists euro bonds with modified duration between 4.5 and 5.5 years, one per issuer, sorted by return. ${FX}`],
  },
  "duration-10": {
    slug: "euro-bonds-10-years-duration", h1: "Euro bonds with about 10 years of duration", title: "Euro bonds with 10 years of duration compared",
    description: "Euro bonds with modified duration between 9.5 and 10.5 years: return to maturity, risk and maturity year, one per issuer.",
    intro: ["A duration of about 10 years makes a bond's price very sensitive to rates: a one point rise in rates costs roughly 10% of price, and a fall adds as much. The higher return of long maturities is paid for with larger price swings.", `The table lists euro bonds with modified duration between 9.5 and 10.5 years, one per issuer, sorted by return. ${FX}`],
  },
};

export const enComparisons = (): ComparisonDef[] => COMPARISONS.filter((c) => EN_TEXT[c.id]);
export const enText = (c: ComparisonDef) => EN_TEXT[c.id];
export const comparisonEnBySlug = (slug: string) => enComparisons().find((c) => EN_TEXT[c.id].slug === slug);

/** Guides that explain a page's topics, in English. */
const GUIDE_FOR_TOPIC: Record<Topic, string> = {
  ytm: "yield-to-maturity", duration: "bond-duration", ig: "investment-grade-bonds", credit: "bond-credit-risk",
  hy: "high-yield-bonds", gov: "european-government-bonds", compare: "how-to-compare-bonds-2026",
};
export const guidesFor = (c: ComparisonDef): string[] => [...new Set(c.topics.map((t) => GUIDE_FOR_TOPIC[t]))].slice(0, 3);
