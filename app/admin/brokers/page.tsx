import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BrokerAdmin from "@/components/brokers/BrokerAdmin";
import { currentUser } from "@/lib/currentUser";

export const metadata: Metadata = { title: "Broker management · 10BONDS", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function BrokersAdmin() {
  const user = await currentUser();
  if (!user?.isAdmin) notFound();
  return <BrokerAdmin />;
}
