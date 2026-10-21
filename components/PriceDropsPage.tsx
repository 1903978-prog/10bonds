import PriceDrops from "@/components/PriceDrops";
import { currentUser } from "@/lib/currentUser";
import { forViewer, loadDrops, type DropsData } from "@/lib/priceHistory";
import type { DropsLang } from "@/lib/dropsText";

const EMPTY: DropsData = { EUR: { top: [], byRisk: {} }, USD: { top: [], byRisk: {} }, since: null, asOf: null };

/** The price-drops page body, the same in every language. */
export default async function PriceDropsPage({ lang }: { lang: DropsLang }) {
  const [data, user] = await Promise.all([loadDrops().catch(() => EMPTY), currentUser()]);
  const admin = user?.isAdmin === true;
  return <PriceDrops data={forViewer(data, admin)} lang={lang} admin={admin} />;
}
