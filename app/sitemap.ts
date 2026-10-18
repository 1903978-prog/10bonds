import type { MetadataRoute } from "next";
import { abs, brokerSitemapEntries } from "@/lib/brokers/seo";
import { loadPublicData } from "@/lib/brokers/store";
import { COUNTRIES, type Country } from "@/lib/brokers/types";
import { countryView } from "@/lib/brokers/view";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const data = await loadPublicData();
  const today = new Date().toISOString().slice(0, 10);
  const published = Object.fromEntries(COUNTRIES.map((c) => [c, data.countries[c].published])) as Record<Country, boolean>;
  const listed = Object.fromEntries(COUNTRIES.map((c) => [c, countryView(data, c, today).rows.map((r) => r.profile.id)])) as Record<Country, string[]>;
  return [
    { url: abs("/"), changeFrequency: "daily", priority: 1 },
    { url: abs("/pricing") },
    ...brokerSitemapEntries(published, listed).map((e) => ({ ...e, changeFrequency: "weekly" as const })),
  ];
}
