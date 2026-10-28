import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import BesAdmin from "@/components/BesAdmin";
import { currentUser } from "@/lib/currentUser";

export const metadata: Metadata = { title: "Bond Efficiency · 10BONDS", robots: { index: false } };
export const dynamic = "force-dynamic";

// Admin only: the Bond Efficiency Score (0-100), its inputs and every bond's calculation. Calculated on a background job, never in the website.
export default async function AdminBondEfficiency() {
  const user = await currentUser();
  if (!user) redirect("/login?next=%2Fadmin%2Fbond-efficiency");
  if (user?.adminState && user.adminState !== "ok") redirect("/admin");
  if (!user?.isAdmin) notFound();
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <p className="text-sm"><Link href="/admin" className="text-accent">← Admin</Link></p>
      <h1 className="mt-3 text-2xl font-semibold">Bond Efficiency</h1>
      <p className="mt-2 text-sm text-mute">Bond Efficiency Score (BES, 0–100): how much credit-adjusted extra yield a bond offers compared with similar bonds. A relative ranking, not advice and not a probability of profit. It does not change which bonds the finder picks.</p>
      <BesAdmin />
    </main>
  );
}
