import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import RiskBandsAdmin from "@/components/RiskBandsAdmin";
import { currentUser } from "@/lib/currentUser";
import { loadBandConfig } from "@/lib/riskBandsStore";

export const metadata: Metadata = { title: "Risk bands · 10BONDS", robots: { index: false } };
export const dynamic = "force-dynamic";

// The 30 average-risk bands of the "Return & risk" slider.
export default async function AdminRiskBands() {
  const user = await currentUser();
  if (!user) redirect("/login?next=%2Fadmin%2Frisk-bands");
  if (user?.adminState && user.adminState !== "ok") redirect("/admin");
  if (!user?.isAdmin) notFound();
  const cfg = await loadBandConfig();
  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <p className="text-sm"><Link href="/admin" className="text-accent">← Admin</Link></p>
      <h1 className="mt-3 text-2xl font-semibold">Risk bands</h1>
      <p className="mt-2 text-sm text-mute">
        Position n of the Return &amp; risk slider shows the 10 bonds with the highest average return whose average 10BONDS risk score lies inside band n (both ends included). A saved change applies to the next precompute run (after each data copy or release); until then the finder keeps showing the last stored portfolios.
      </p>
      <RiskBandsAdmin initial={cfg} />
    </main>
  );
}
