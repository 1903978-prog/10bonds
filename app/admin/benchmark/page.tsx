import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import AdminEtf from "@/components/AdminEtf";
import { currentUser } from "@/lib/currentUser";
import { getEtf } from "@/lib/etfBenchmark";

export const metadata: Metadata = { title: "ETF comparison · 10BONDS", robots: { index: false } };
export const dynamic = "force-dynamic";

// The ETF figure shown in the first results box ("€ bond ETFs vs 10bonds").
export default async function AdminBenchmark() {
  const user = await currentUser();
  if (!user) redirect("/login?next=%2Fadmin%2Fbenchmark");
  if (user?.adminState && user.adminState !== "ok") redirect("/admin");
  if (!user?.isAdmin) notFound();
  const etf = await getEtf();
  const days = Math.floor((Date.now() - Date.parse(`${etf.asOf}T00:00:00Z`)) / 86_400_000);
  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <p className="text-sm"><Link href="/admin" className="text-accent">← Admin</Link></p>
      <h1 className="mt-3 text-2xl font-semibold">ETF benchmark</h1>
      <p className="mt-2 text-sm text-mute">
        Shown in the first box above the top 10 as an illustrative EUR corporate bond ETF benchmark, next to the live 10bonds list. Customers see the value and date only, never the source, fund, provider or ISIN. Leave Verified off until methodology and data-use rights are confirmed. Refresh at least monthly.
      </p>
      {days > 30 && <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900" data-testid="etf-stale">The figure is {days} days old: please refresh it.</p>}
      <AdminEtf initial={etf} />
    </main>
  );
}
