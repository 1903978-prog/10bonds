import PriceDropsPage from "@/components/PriceDropsPage";
import { dropsMetadata } from "@/lib/dropsMeta";

export const dynamic = "force-dynamic";
export const metadata = dropsMetadata("de");

export default function Page() {
  return <PriceDropsPage lang="de" />;
}
