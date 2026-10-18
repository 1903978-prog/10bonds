import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProAdmin from "@/components/ProAdmin";
import { currentUser } from "@/lib/currentUser";

export const metadata: Metadata = { title: "Professional access · Admin · 10BONDS", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminPro() {
  const user = await currentUser();
  if (!user?.isAdmin) notFound();
  return <ProAdmin />;
}
