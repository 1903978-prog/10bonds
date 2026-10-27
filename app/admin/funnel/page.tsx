import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import FunnelAdmin from "@/components/FunnelAdmin";
import { currentUser } from "@/lib/currentUser";

export const metadata: Metadata = { title: "Funnel · Admin · 10BONDS", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminFunnel() {
  const user = await currentUser();
  if (!user) redirect("/login?next=%2Fadmin%2Ffunnel");
  if (user?.adminState && user.adminState !== "ok") redirect("/admin");
  if (!user?.isAdmin) notFound();
  return <FunnelAdmin />;
}
