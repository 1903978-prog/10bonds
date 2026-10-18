import type { Metadata } from "next";
import { MethodologyPage, isPublished } from "@/components/brokers/Pages";
import { methodologyMetadata } from "@/lib/brokers/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return methodologyMetadata("fr", await isPublished("fr"));
}

export default function Page() {
  return <MethodologyPage country="fr" />;
}
