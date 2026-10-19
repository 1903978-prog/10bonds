import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import AdminPanel from "@/components/AdminPanel";
import AdminTwoFactor from "@/components/AdminTwoFactor";
import { currentUser } from "@/lib/currentUser";

export const metadata: Metadata = { title: "Admin · 10BONDS", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Admin() {
  const user = await currentUser();
  if (!user) redirect("/login?next=%2Fadmin");
  if (user?.adminState && user.adminState !== "ok") return <AdminTwoFactor />;
  if (!user?.isAdmin) notFound();
  return <AdminPanel />;
}
