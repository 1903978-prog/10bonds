import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SeoAdmin from "@/components/seo/admin/SeoAdmin";
import { currentUser } from "@/lib/currentUser";

export const metadata: Metadata = { title: "SEO Management · 10BONDS", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function SeoPage() {
  const user = await currentUser();
  if (!user?.isAdmin) notFound();
  return <SeoAdmin />;
}
