import type { Metadata } from "next";
import type { CalculatorText } from "./calculators";
import { CALCULATORS } from "./calculators";
import { EN_GUIDES, type EnGuide } from "./guidesEn";
import type { KcSection } from "./knowledge";
import { LOCALE, LOCALES, pathOf, type Locale } from "./locales";

// The English (international) Knowledge Center at /knowledge: the same six sections as the language sites, with
// English guides and an English calculator, so English readers are never sent to another language.

export const EN_BASE = "/knowledge";
export const enPath = (slug?: string) => (slug ? `${EN_BASE}/${slug}` : EN_BASE);

export const KC_TEXT_EN = {
  title: "Knowledge: bond guides, comparisons and calculators · 10BONDS",
  description: "The 10BONDS Knowledge Center: how to compare bonds, government bonds, yield calculator, broker fees, risk and ratings, and guides to get started.",
  h1: "Everything about bonds",
  lead: "Plain-language guides, a yield calculator and the bond finder, to understand the numbers before you choose.",
  empty: "Pages for this section are being prepared.",
  sections: {
    best: { name: "Best bonds", intro: "How to compare euro bonds by yield, rating and maturity." },
    government: { name: "Government bonds", intro: "BTP, OAT, Bund and other European government bonds." },
    calculators: { name: "Calculators", intro: "Gross and after-tax yield, before you buy." },
    brokers: { name: "Brokers & fees", intro: "What it costs to buy a bond at each broker, by country." },
    risk: { name: "Risk & ratings", intro: "Ratings, duration and credit risk explained simply." },
    academy: { name: "Bond academy", intro: "The basics to get started, step by step." },
  } satisfies Record<KcSection, { name: string; intro: string }>,
  finder: "Bond finder: the 10 bonds the model selects",
  brokersIn: { it: "Broker fees in Italy", fr: "Broker fees in France", de: "Broker fees in Germany" } satisfies Record<Locale, string>,
};

const IT = CALCULATORS.it;
const DE = CALCULATORS.de;

/** English yield calculator. Tax presets are the ones already sourced for the Italian and German calculators. */
export const CALCULATOR_EN: CalculatorText = {
  slug: "bond-yield-calculator",
  title: "Bond yield calculator: yield to maturity, gross and net · 10BONDS",
  description: "Calculate a bond's yield to maturity before and after tax: enter price, coupon and maturity. Free, in your browser.",
  h1: "Bond yield calculator",
  intro: [
    "Enter the price, coupon and maturity: the calculator shows the yield to maturity before and after tax.",
    "Pick a tax preset or type your own rate. Nothing you enter leaves your browser.",
  ],
  presets: [
    { label: "Gross 0%", rate: 0 },
    ...IT.presets.filter((p) => p.rate > 0).map((p) => ({ label: `Italy ${p.rate.toLocaleString("en-GB")}%`, rate: p.rate })),
    ...DE.presets.filter((p) => p.rate > 0).map((p) => ({ label: `Germany ${p.rate.toLocaleString("en-GB")}%`, rate: p.rate })),
  ],
  defaultRate: 0,
  taxNote: "Italy: 12.5% on Italian and equivalent government bonds, 26% on other bond income (D.L. 66/2014). Germany: 25% withholding tax plus 5.5% solidarity surcharge on it (26.375%), without church tax or allowance. Check your own situation with a tax adviser.",
  labels: {
    price: "Price (clean, per 100)", coupon: "Annual coupon (%)", frequency: "Coupon payments", annual: "Annual", semi: "Semi-annual", quarterly: "Quarterly",
    maturity: "Maturity", settlement: "Purchase date", tax: "Tax", custom: "Tax rate (%)", gross: "Yield to maturity (gross)", net: "Yield to maturity (after tax)",
    current: "Current yield", accrued: "Accrued interest", dirty: "Price incl. accrued interest", years: "Years to maturity", invalid: "Please check the inputs.",
    flows: "Cash flows", date: "Date", grossFlow: "Gross", netFlow: "Net",
  },
  how: {
    h2: "How it is calculated",
    paras: [
      "The yield to maturity is the annual rate at which the price paid (plus accrued interest) equals the present value of all coupons and the redemption.",
      "After tax, each coupon is reduced by the chosen rate; at maturity a gain (100 minus the purchase price) is taxed at the same rate. Losses are not offset.",
    ],
  },
};

export const enGuide = (slug: string): EnGuide | null => EN_GUIDES.find((g) => g.slug === slug) ?? null;
export const enGuideByGroup = (group: string | null): EnGuide | null => (group ? EN_GUIDES.find((g) => g.group === group) ?? null : null);

/** hreflang for a page whose English version is at `en` and language versions at `langs`. */
export function withEnglish(canonical: string, en: string | null, langs: Partial<Record<Locale, string>>): Metadata["alternates"] {
  const languages: Record<string, string> = {};
  for (const l of LOCALES) if (langs[l]) languages[LOCALE[l].hreflang] = langs[l]!;
  if (en) {
    languages.en = en;
    languages["x-default"] = en;
  }
  return Object.keys(languages).length ? { canonical, languages } : { canonical };
}

export const hubLangs = () => Object.fromEntries(LOCALES.map((l) => [l, pathOf(l, "knowledge")])) as Record<Locale, string>;
export const calcLangs = () => Object.fromEntries(LOCALES.map((l) => [l, pathOf(l, "tools", CALCULATORS[l].slug)])) as Record<Locale, string>;
