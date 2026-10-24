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
  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <p className="text-sm"><Link href="/admin" className="text-accent">← Admin</Link></p>
      <h1 className="mt-3 text-2xl font-semibold">ETF comparison</h1>
      <p className="mt-2 text-sm text-mute">
        Shown in the first box above the top 10: the average return of euro corporate bond UCITS ETFs and their average risk,
        next to the live 10bonds list. Customers see the date and, in the box tip, the source. Use a named, dated source.
      </p>
      <AdminEtf initial={await getEtf()} />
    </main>
  );
}
