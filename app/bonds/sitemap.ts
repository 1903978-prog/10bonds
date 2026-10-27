import type { MetadataRoute } from "next";
import { loadAllShown } from "@/lib/bonds";
import { SITE_URL } from "@/lib/seo/crawl";
import { bondPageUrls } from "@/lib/seo/bondPages";

export const dynamic = "force-dynamic";

// The list changes once a day; crawlers fetch it often and it is ~1.5 MB, so the built list is kept for an hour.
const TTL_MS = 60 * 60 * 1000;
let cached: { at: number; entries: MetadataRoute.Sitemap } | null = null;

/** /bonds/sitemap.xml: one page per bond the site shows, in English, Italian, French and German (kept apart from the main sitemap). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.entries;
  const entries = await build();
  if (entries.length) cached = { at: Date.now(), entries };
  return entries.length || !cached ? entries : cached.entries;
}

async function build(): Promise<MetadataRoute.Sitemap> {
  const { bonds, source, asOf } = await loadAllShown().catch(() => ({ bonds: [], source: "sample" as const, asOf: null }));
  if (source !== "live") return [];
  return bondPageUrls(SITE_URL, bonds.map((b) => b.isin)).map((e) => ({ ...e, lastModified: asOf ?? undefined, changeFrequency: "daily" as const, priority: 0.6 }));
}
