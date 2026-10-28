import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import PortfolioEfficiencyAdmin from "@/components/PortfolioEfficiencyAdmin";
import { currentUser } from "@/lib/currentUser";

export const metadata: Metadata = { title: "Portfolio Efficiency Optimization · 10BONDS", robots: { index: false } };
export const dynamic = "force-dynamic";

// Admin only: Methodology 5, the 90 portfolios with the highest equal-weight credit-adjusted net spread. Calculated on a background job, never in the website.
export default async function AdminPortfolioEfficiency() {
  const user = await currentUser();
  if (!user) redirect("/login?next=%2Fadmin%2Fportfolio-efficiency");
  if (user?.adminState && user.adminState !== "ok") redirect("/admin");
  if (!user?.isAdmin) notFound();
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <p className="text-sm"><Link href="/admin" className="text-accent">← Admin</Link></p>
      <h1 className="mt-3 text-2xl font-semibold">Portfolio Efficiency Optimization</h1>
      <p className="mt-2 text-sm text-mute">Methodology 5: for each of the 90 positions, the ten bonds with the highest equal-weight credit-adjusted net spread that obey every rule (risk matrix, duration, issuer, sector). The public site uses it only when it is chosen at Admin → Methodology.</p>
      <PortfolioEfficiencyAdmin />
    </main>
  );
}
