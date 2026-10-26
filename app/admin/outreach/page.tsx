import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import OutreachAdmin from "@/components/OutreachAdmin";
import { currentUser } from "@/lib/currentUser";

export const metadata: Metadata = { title: "Pro outreach · Admin · 10BONDS", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminOutreach() {
  const user = await currentUser();
  if (!user) redirect("/login?next=%2Fadmin%2Foutreach");
  if (user?.adminState && user.adminState !== "ok") redirect("/admin");
  if (!user?.isAdmin) notFound();
  return <OutreachAdmin />;
}
