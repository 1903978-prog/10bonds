import type { Metadata } from "next";
import { brokerMetadata } from "./seo";
import { loadPublicData } from "./store";
import { COUNTRIES, type Country } from "./types";
import { countryView } from "./view";

/** Metadata for a broker profile, with hreflang only towards the countries where it is listed and published. */
export async function brokerPageMetadata(c: Country, id: string): Promise<Metadata> {
  const data = await loadPublicData();
  const today = new Date().toISOString().slice(0, 10);
  const profile = data.profiles.find((p) => p.id === id);
  if (!profile) return { robots: { index: false } };
  const listedIn = COUNTRIES.filter((x) => (x === c || data.countries[x].published) && countryView(data, x, today).rows.some((r) => r.profile.id === id));
  return brokerMetadata(c, id, profile.name, listedIn, data.countries[c].published);
}
