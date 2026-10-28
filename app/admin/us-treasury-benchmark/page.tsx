import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import UsTreasuryAdmin from "@/components/UsTreasuryAdmin";
import { currentUser } from "@/lib/currentUser";

export const metadata: Metadata = { title: "US Treasury benchmark · 10BONDS", robots: { index: false } };
export const dynamic = "force-dynamic";

// Admin only: the US Treasury benchmark (Federal Reserve fitted curve), 1 to 30 years, refreshed every Monday 09:00 Berlin time.
export default async function AdminUsTreasuryBenchmark() {
  const user = await currentUser();
  if (!user) redirect("/login?next=%2Fadmin%2Fus-treasury-benchmark");
  if (user?.adminState && user.adminState !== "ok") redirect("/admin");
  if (!user?.isAdmin) notFound();
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <p className="text-sm"><Link href="/admin" className="text-accent">← Admin</Link></p>
      <h1 className="mt-3 text-2xl font-semibold">US Treasury — Yield Curve</h1>
      <UsTreasuryAdmin />
    </main>
  );
}
