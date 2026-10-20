import type { MetadataRoute } from "next";
import { loadAllShown } from "@/lib/bonds";
import { SITE_URL } from "@/lib/seo/crawl";
import { bondPageUrls } from "@/lib/seo/bondPages";

export const dynamic = "force-dynamic";

/** /bonds/sitemap.xml: one page per bond the site shows, in English, Italian, French and German (kept apart from the main sitemap). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { bonds, source, asOf } = await loadAllShown().catch(() => ({ bonds: [], source: "sample" as const, asOf: null }));
  if (source !== "live") return [];
  return bondPageUrls(SITE_URL, bonds.map((b) => b.isin)).map((e) => ({ ...e, lastModified: asOf ?? undefined, changeFrequency: "daily" as const, priority: 0.6 }));
}
