import type { Metadata } from "next";
import { BrokerPage } from "@/components/brokers/Pages";
import { brokerPageMetadata } from "@/lib/brokers/meta";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ broker: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return brokerPageMetadata("it", (await params).broker);
}

export default async function Page({ params }: Props) {
  return <BrokerPage country="it" id={(await params).broker} />;
}
