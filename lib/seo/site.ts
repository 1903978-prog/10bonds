import type { Metadata } from "next";
import { loadBonds } from "../bonds";
import { accountsConfigured } from "../accounts";
import { allComparisons, hasEnough, type ComparisonData, type ComparisonDef } from "./comparisons";
import { LOCALE, LOCALES, pathOf, type Locale, type Section } from "./locales";
import { listGuides, listPeople, type Guide, type Person } from "./store";

// What the public SEO pages read. Failures give empty lists: a missing database never breaks a public page.

export async function publishedGuides(locale: Locale | null = null): Promise<Guide[]> {
  if (!accountsConfigured()) return [];
  return listGuides(true, locale).catch(() => []);
}

export async function publicPeople(): Promise<Person[]> {
  if (!accountsConfigured()) return [];
  return listPeople(true).catch(() => []);
}

/** Comparison pages with their data, from the one shared bond copy. */
export async function comparisonPages(): Promise<{ pages: ComparisonData[]; asOf: string | null; source: "live" | "sample" | null }> {
  const data = await loadBonds().catch(() => null);
  if (!data) return { pages: [], asOf: null, source: null };
  return { pages: allComparisons(data.bonds), asOf: data.asOf, source: data.source };
}

/** Sample data is never indexable: it is not real. */
export const indexable = (c: ComparisonData, source: "live" | "sample" | null) => source === "live" && hasEnough(c);
/** Shown at all (indexable, or sample data in development and previews). */
export const shown = (c: ComparisonData, source: "live" | "sample" | null) => source !== null && hasEnough(c);

const lang = (l: Locale) => LOCALE[l].hreflang;

/** hreflang links for a page that exists in every language at `pathFor(locale)`. */
export function alternates(self: Locale, pathFor: (l: Locale) => string | null, xDefault?: string): Metadata["alternates"] {
  const languages: Record<string, string> = {};
  for (const l of LOCALES) {
    const p = pathFor(l);
    if (p) languages[lang(l)] = p;
  }
  if (xDefault) languages["x-default"] = xDefault;
  return { canonical: pathFor(self)!, languages };
}

export const sectionAlternates = (self: Locale, section: Section) => alternates(self, (l) => pathOf(l, section));
export const comparisonAlternates = (self: Locale, def: ComparisonDef) => alternates(self, (l) => pathOf(l, "bonds", def.text[l].slug));

export function guideAlternates(g: Guide, siblings: Guide[]): Metadata["alternates"] {
  const canonical = g.canonicalUrl ?? pathOf(g.locale, "guides", g.slug);
  const languages: Record<string, string> = {};
  if (g.translationGroup && !g.noindex) {
    for (const s of siblings) if (s.translationGroup === g.translationGroup && !s.noindex) languages[lang(s.locale)] = pathOf(s.locale, "guides", s.slug);
  }
  return Object.keys(languages).length ? { canonical, languages } : { canonical };
}

const DATE_LOCALE: Record<Locale, string> = { it: "it-IT", fr: "fr-FR", de: "de-DE" };
export const fmtDate = (l: Locale, iso: string) => new Date(iso).toLocaleDateString(DATE_LOCALE[l], { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Rome" });
export const fmtNum = (l: Locale, n: number, d = 2) => n.toLocaleString(DATE_LOCALE[l], { minimumFractionDigits: d, maximumFractionDigits: d });
