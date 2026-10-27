import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import VisitorsAdmin from "@/components/VisitorsAdmin";
import { currentUser } from "@/lib/currentUser";

export const metadata: Metadata = { title: "Visitors · Admin · 10BONDS", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminVisitors() {
  const user = await currentUser();
  if (!user) redirect("/login?next=%2Fadmin%2Fvisitors");
  if (user?.adminState && user.adminState !== "ok") redirect("/admin");
  if (!user?.isAdmin) notFound();
  return <VisitorsAdmin />;
}
