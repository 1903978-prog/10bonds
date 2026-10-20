import PriceDropsPage from "@/components/PriceDropsPage";
import { dropsMetadata } from "@/lib/dropsMeta";

export const dynamic = "force-dynamic";
export const metadata = dropsMetadata("en");

export default function Page() {
  return <PriceDropsPage lang="en" />;
}
