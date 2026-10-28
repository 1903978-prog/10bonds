import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import PortfolioEfficiencyAdmin from "@/components/PortfolioEfficiencyAdmin";
import { currentUser } from "@/lib/currentUser";

export const metadata: Metadata = { title: "Portfolio Efficiency Optimization · 10BONDS", robots: { index: false } };
export const dynamic = "force-dynamic";

// Admin only: the production engine (Methodology 4, the portfolio spec): all 90 positions with their status and reason. Calculated on a background job, never in the website.
export default async function AdminPortfolioEfficiency() {
  const user = await currentUser();
  if (!user) redirect("/login?next=%2Fadmin%2Fportfolio-efficiency");
  if (user?.adminState && user.adminState !== "ok") redirect("/admin");
  if (!user?.isAdmin) notFound();
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <p className="text-sm"><Link href="/admin" className="text-accent">← Admin</Link></p>
      <h1 className="mt-3 text-2xl font-semibold">Portfolio engine (Methodology 4)</h1>
      <p className="mt-2 text-sm text-mute">The portfolio spec (docs/PORTFOLIO_SPEC.md): for each of the 90 positions, the ten bonds with the highest equal-weight credit-adjusted net spread that obey every rule (risk matrix, class spread at most 2, duration, issuer, sector, no stale price, no subordinated debt). Positions that share their classes are spread over expected-loss terciles; identical lists are flagged “= n” (repeat). A position with no valid list stays INFEASIBLE with its reason and is never filled. The public slider shows the valid, non-repeated positions only, renumbered per term.</p>
      <p className="mt-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">Interim inputs: risk classes are the agency-equivalent classes of the site (the 10bonds score <code>lr_score</code> from the LM op model is not delivered yet), and the government benchmark curves are the interim tables (EUR: the supplied table, until the official Bundesbank import lands; USD: Treasuries from the copy). Portfolio BES shows “Unavailable – insufficient calibration data” until about 20 days of history exist; net spread is optimised and shown from day one.</p>
      <PortfolioEfficiencyAdmin />
    </main>
  );
}
