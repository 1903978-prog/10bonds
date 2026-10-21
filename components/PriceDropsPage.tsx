import PriceDrops from "@/components/PriceDrops";
import { loadDrops, type DropsData } from "@/lib/priceHistory";
import type { DropsLang } from "@/lib/dropsText";

const EMPTY: DropsData = { EUR: { top: [], byRisk: {} }, USD: { top: [], byRisk: {} }, since: null, asOf: null };

/** The price-drops page body, the same in every language. */
export default async function PriceDropsPage({ lang }: { lang: DropsLang }) {
  const data = await loadDrops().catch(() => EMPTY);
  return <PriceDrops data={data} lang={lang} />;
}
