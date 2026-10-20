import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import RiskPremiumAdmin from "@/components/RiskPremiumAdmin";
import { currentUser } from "@/lib/currentUser";

export const metadata: Metadata = { title: "Risk Premium Model · 10BONDS", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function RiskPremiumPage() {
  const user = await currentUser();
  if (!user) redirect("/login?next=%2Fadmin%2Frisk-premium");
  if (user?.adminState && user.adminState !== "ok") redirect("/admin");
  if (!user?.isAdmin) notFound();
  return <RiskPremiumAdmin />;
}
