import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import IntroPreview from "@/components/IntroPreview";
import { currentUser } from "@/lib/currentUser";

// The earlier animated landing page, saved for another page (the owner, 23/10/2026). Admin only, never indexed.
export const metadata: Metadata = { title: "Landing page 1 · 10BONDS", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function LandingPage1() {
  const user = await currentUser();
  if (!user) redirect("/login?next=%2Fadmin%2Flandingpage1");
  if (user?.adminState && user.adminState !== "ok") redirect("/admin");
  if (!user?.isAdmin) notFound();
  return <IntroPreview />;
}
