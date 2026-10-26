import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import PromoAdmin from "@/components/PromoAdmin";
import FeatureAdmin from "@/components/FeatureAdmin";
import { currentUser } from "@/lib/currentUser";

export const metadata: Metadata = { title: "Plan features · Admin · 10BONDS", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminFeatures() {
  const user = await currentUser();
  if (!user) redirect("/login?next=%2Fadmin%2Ffeatures");
  if (user?.adminState && user.adminState !== "ok") redirect("/admin");
  if (!user?.isAdmin) notFound();
  return (
    <>
      <PromoAdmin />
      <FeatureAdmin />
    </>
  );
}
