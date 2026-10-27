import type { Metadata } from "next";
import { loadBonds } from "../bonds";
import { accountsConfigured } from "../accounts";
import { allComparisons, hasEnough, type ComparisonData, type ComparisonDef } from "./comparisons";
import { LOCALE, LOCALES, pathOf, type Locale, type Section } from "./locales";
import { listGuides, listPeople, type Guide, type Person } from "./store";

// What the public SEO pages read. Failures give empty lists: a missing database never breaks a public page.

// Public pages are read far more often than they change, and every request used to hit the database and recompute
// the comparisons. A short memo keeps a crowd of visitors or crawlers from queueing behind the one small server.
const GUIDES_TTL_MS = 60_000;
const guideMemo = new Map<string, { at: number; guides: Guide[] }>();

export async function publishedGuides(locale: Locale | null = null): Promise<Guide[]> {
  if (!accountsConfigured()) return [];
  const key = locale ?? "all";
  const hit = guideMemo.get(key);
  if (hit && Date.now() - hit.at < GUIDES_TTL_MS) return hit.guides;
  const guides = await listGuides(true, locale).catch(() => null);
  if (!guides) return hit?.guides ?? [];
  guideMemo.set(key, { at: Date.now(), guides });
  return guides;
}

export async function publicPeople(): Promise<Person[]> {
  if (!accountsConfigured()) return [];
  return listPeople(true).catch(() => []);
}

/** Comparison pages with their data, from the one shared bond copy. */
type ComparisonResult = { pages: ComparisonData[]; asOf: string | null; source: "live" | "sample" | null };
const COMPARISONS_TTL_MS = 10 * 60_000;
let comparisonMemo: { at: number; key: string; result: ComparisonResult } | null = null;

export async function comparisonPages(): Promise<ComparisonResult> {
  const data = await loadBonds().catch(() => null);
  if (!data) return { pages: [], asOf: null, source: null };
  const key = `${data.source}|${data.asOf}|${data.bonds.length}`;
  if (comparisonMemo && comparisonMemo.key === key && Date.now() - comparisonMemo.at < COMPARISONS_TTL_MS) return comparisonMemo.result;
  const result = { pages: allComparisons(data.bonds), asOf: data.asOf, source: data.source };
  comparisonMemo = { at: Date.now(), key, result };
  return result;
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

const DATE_LOCALE: Record<Locale | "en", string> = { it: "it-IT", fr: "fr-FR", de: "de-DE", en: "en-GB" };
export const fmtDate = (l: Locale | "en", iso: string) => new Date(iso).toLocaleDateString(DATE_LOCALE[l], { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Rome" });
export const fmtNum = (l: Locale | "en", n: number, d = 2) => n.toLocaleString(DATE_LOCALE[l], { minimumFractionDigits: d, maximumFractionDigits: d });
