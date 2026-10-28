import { SITE_URL } from "@/lib/seo/crawl";
import { EN_GUIDES } from "@/lib/seo/guidesEn";
import { CALCULATOR_EN, enPath } from "@/lib/seo/knowledgeEn";
import { insightsPath } from "@/lib/seo/insights";
import { bondMapPath } from "@/lib/seo/bondMap";
import { bundCurvePath } from "@/lib/seo/bundCurve";
import { LOCALE, LOCALES, pathOf, type Section } from "@/lib/seo/locales";
import { HOME } from "@/lib/seo/pagesText";
import { curvePath } from "@/lib/seo/yieldCurves";

// /llms.txt: a short plain-text map of the public site for AI assistants (llmstxt.org format). Only public
// pages, the same ones the sitemap lists; the text comes from the pages' own titles and descriptions.
const SECTIONS: { s: Section; en: string }[] = [
  { s: "bonds", en: "Bond comparisons" },
  { s: "guides", en: "Guides" },
  { s: "knowledge", en: "Knowledge center" },
  { s: "tools", en: "Calculators and yield curves" },
  { s: "method", en: "Methodology: how bonds are ranked" },
  { s: "team", en: "Editorial team" },
];

export function buildLlmsTxt(base: string = SITE_URL): string {
  const u = (p: string) => base + p;
  const out: string[] = [
    "# 10BONDS",
    "",
    "> 10BONDS compares thousands of euro bonds (government and corporate) and shows the 10 that best match a chosen duration and target yield. Bond data is updated every day and dated on every page. Sites in Italian, French and German, with an English knowledge center.",
    "",
    "## English",
    "",
    `- [Home](${u("/")}): find the best-matching euro bonds by duration and target yield`,
    `- [Knowledge center](${u(enPath())}): guides on bond yields, duration and ratings`,
    `- [${CALCULATOR_EN.title.split(" · ")[0]}](${u(enPath(CALCULATOR_EN.slug))}): ${CALCULATOR_EN.description}`,
    `- [Government bond yield curves](${u(curvePath("en"))})`,
    `- [Bond market insights](${u(insightsPath("en"))})`,
    `- [German Bund yield curve, 1 to 30 years](${u(bundCurvePath("en"))}): yield per year, interpolated years labelled`,
    `- [Bonds by maturity and risk](${u(bondMapPath("en"))}): count, highest and median yield per maturity and risk 1-10`,
    ...EN_GUIDES.map((g) => `- [${g.title}](${u(enPath(g.slug))}): ${g.metaDescription}`),
  ];
  for (const l of LOCALES) {
    out.push("", `## ${LOCALE[l].name}`, "", `- [${HOME[l].title}](${u(`/${l}`)}): ${HOME[l].description}`);
    for (const { s, en } of SECTIONS) out.push(`- [${en}](${u(pathOf(l, s))})`);
    out.push(`- [Government bond yield curves](${u(curvePath(l))})`, `- [Bond market insights](${u(insightsPath(l))})`, `- [Bonds by maturity and risk](${u(bondMapPath(l))})`);
  }
  out.push(
    "",
    "## Optional",
    "",
    `- [Plans and pricing](${u("/pricing")})`,
    `- [Disclaimer](${u("/disclaimer")}): information only, not investment advice`,
    `- [Sitemap](${u("/sitemap.xml")}): every public page in every language`,
    "",
  );
  return out.join("\n");
}
