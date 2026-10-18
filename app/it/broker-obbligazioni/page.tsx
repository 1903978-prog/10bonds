import type { Metadata } from "next";
import { ComparisonPage, isPublished } from "@/components/brokers/Pages";
import { sectionMetadata } from "@/lib/brokers/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return sectionMetadata("it", await isPublished("it"));
}

export default function Page() {
  return <ComparisonPage country="it" />;
}
