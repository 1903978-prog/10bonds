import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AdminPanel from "@/components/AdminPanel";
import { currentUser } from "@/lib/currentUser";

export const metadata: Metadata = { title: "Admin · 10BONDS", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Admin() {
  const user = await currentUser();
  if (!user?.isAdmin) notFound();
  return <AdminPanel />;
}
