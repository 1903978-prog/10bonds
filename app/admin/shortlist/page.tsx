import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import ShortlistAdmin from "@/components/ShortlistAdmin";
import { currentUser } from "@/lib/currentUser";

export const metadata: Metadata = { title: "Shortlist · 10BONDS", robots: { index: false } };
export const dynamic = "force-dynamic";

// Admin only (404 for everyone else, also when "Admin view" is switched off): named shortlists of bonds with every figure
// and the average return, duration, risk and expected loss; each one is a dot on the Multi-year chart and the Heat map.
export default async function AdminShortlist() {
  const user = await currentUser();
  if (!user) redirect("/login?next=%2Fadmin%2Fshortlist");
  if (user?.adminState && user.adminState !== "ok") redirect("/admin");
  if (!user?.isAdmin) notFound();
  return (
    <main className="mx-auto max-w-[96rem] px-2 py-6">
      <ShortlistAdmin />
    </main>
  );
}
