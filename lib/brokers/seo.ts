import type { Metadata } from "next";
import { brokerPath, CONTENT, methodologyPath, sectionPath } from "./content";
import { PROFILES, SEED_TARIFFS } from "./data";
import { COUNTRIES, type Country } from "./types";
import { landingFor } from "@/lib/seo/landingLivio";

// Page titles, canonical URLs, hreflang links and sitemap entries for the broker section.

export const SITE_URL = (process.env.SITE_URL ?? "https://10bonds.fly.dev").replace(/\/$/, "");
export const abs = (path: string) => `${SITE_URL}${path}`;

const hreflang = (paths: Partial<Record<Country, string>>): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const c of COUNTRIES) if (paths[c]) out[CONTENT[c].lang] = abs(paths[c]!);
  return out;
};

/** Section pages are equivalents in each language, so they point at each other. */
export function sectionMetadata(c: Country, published: boolean): Metadata {
  const t = CONTENT[c];
  const path = sectionPath(c);
  const land = landingFor(path); // Livio's own title and description, where he wrote the page text
  return {
    title: land ? { absolute: land.seoTitle } : `${t.metaTitle} · 10BONDS`,
    description: land?.metaDescription ?? t.metaDescription,
    alternates: { canonical: abs(path), languages: { ...hreflang({ it: sectionPath("it"), fr: sectionPath("fr"), de: sectionPath("de") }), "x-default": abs(sectionPath("it")) } },
    openGraph: { title: t.metaTitle, description: t.metaDescription, url: abs(path), locale: t.lang.replace("-", "_"), type: "article", siteName: "10BONDS" },
    robots: published ? { index: true, follow: true } : { index: false, follow: false },
  };
}

export function methodologyMetadata(c: Country, published: boolean): Metadata {
  const t = CONTENT[c];
  const title = `${t.ui.methodology} · ${t.sectionTitle}`;
  return {
    title: `${title} · 10BONDS`,
    description: t.ui.methodologyIntro[0].slice(0, 155),
    alternates: { canonical: abs(methodologyPath(c)), languages: hreflang({ it: methodologyPath("it"), fr: methodologyPath("fr"), de: methodologyPath("de") }) },
    robots: published ? { index: true, follow: true } : { index: false, follow: false },
  };
}

/** A broker profile links only to the languages where that broker is actually listed. */
export function brokerMetadata(c: Country, id: string, name: string, listedIn: Country[], published: boolean): Metadata {
  const t = CONTENT[c];
  const title = `${name}: ${t.ui.commissions.toLowerCase()} · ${t.domesticGov}`;
  const paths: Partial<Record<Country, string>> = {};
  for (const x of listedIn) paths[x] = brokerPath(x, id);
  return {
    title: `${title} · 10BONDS`,
    description: `${name} – ${t.ui.commissions}, ${t.ui.custodyFee.toLowerCase()}, ${t.ui.fxFee.toLowerCase()}. ${t.ui.verified}.`,
    alternates: { canonical: abs(brokerPath(c, id)), languages: hreflang(paths) },
    robots: published ? { index: true, follow: true } : { index: false, follow: false },
  };
}

/** Sitemap entries for published countries (seed list; the live list follows the database). */
export function brokerSitemapEntries(published: Record<Country, boolean>, listed?: Record<Country, string[]>) {
  const out: { url: string; lastModified?: string; alternates?: { languages: Record<string, string> } }[] = [];
  const sections = hreflang({ it: sectionPath("it"), fr: sectionPath("fr"), de: sectionPath("de") });
  for (const c of COUNTRIES) {
    if (!published[c]) continue;
    out.push({ url: abs(sectionPath(c)), alternates: { languages: sections } });
    out.push({ url: abs(methodologyPath(c)) });
    const ids = listed?.[c] ?? SEED_TARIFFS.filter((t) => t.country === c && t.data.eligible).map((t) => t.brokerId);
    for (const id of ids) if (PROFILES.some((p) => p.id === id)) out.push({ url: abs(brokerPath(c, id)) });
  }
  return out;
}
