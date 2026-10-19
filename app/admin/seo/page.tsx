import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import SeoAdmin from "@/components/seo/admin/SeoAdmin";
import { currentUser } from "@/lib/currentUser";

export const metadata: Metadata = { title: "SEO Management · 10BONDS", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function SeoPage() {
  const user = await currentUser();
  if (!user) redirect("/login?next=%2Fadmin%2Fseo");
  if (user?.adminState && user.adminState !== "ok") redirect("/admin");
  if (!user?.isAdmin) notFound();
  return <SeoAdmin />;
}
