import { NextResponse } from "next/server";
import { CONTENT, sectionPath } from "@/lib/brokers/content";
import { loadPublicData } from "@/lib/brokers/store";
import { COUNTRIES } from "@/lib/brokers/types";
import { countryView } from "@/lib/brokers/view";

export const dynamic = "force-dynamic";

/** Published broker comparisons, with the top three names of each, for the "Where can I trade?" box. */
export async function GET() {
  const data = await loadPublicData();
  const today = new Date().toISOString().slice(0, 10);
  const markets = COUNTRIES.filter((c) => data.countries[c].published).map((c) => ({
    country: c,
    title: CONTENT[c].sectionTitle,
    href: sectionPath(c),
    brokers: countryView(data, c, today).rows.slice(0, 3).map((r) => r.profile.name),
  }));
  return NextResponse.json({ markets }, { headers: { "Cache-Control": "public, max-age=300" } });
}
