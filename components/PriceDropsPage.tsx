import { notFound } from "next/navigation";
import PriceDrops from "@/components/PriceDrops";
import { currentUser } from "@/lib/currentUser";
import { loadDrops, type DropsData } from "@/lib/priceHistory";
import type { DropsLang } from "@/lib/dropsText";

const EMPTY_LISTS = { top: [], byRisk: {} };
const EMPTY: DropsData = {
  rows: [],
  EUR: { ytm: EMPTY_LISTS, vsMax: EMPTY_LISTS, vsMin: EMPTY_LISTS, d1w: EMPTY_LISTS, d1m: EMPTY_LISTS, gain1y: EMPTY_LISTS },
  USD: { ytm: EMPTY_LISTS, vsMax: EMPTY_LISTS, vsMin: EMPTY_LISTS, d1w: EMPTY_LISTS, d1m: EMPTY_LISTS, gain1y: EMPTY_LISTS },
  since: null,
  asOf: null,
};

/** The price-drops page body, the same in every language. Admin only (52-week values stay private): others get a 404. */
export default async function PriceDropsPage({ lang }: { lang: DropsLang }) {
  const user = await currentUser();
  if (user?.isAdmin !== true) notFound();
  const data = await loadDrops().catch(() => EMPTY);
  return <PriceDrops data={data} lang={lang} />;
}
