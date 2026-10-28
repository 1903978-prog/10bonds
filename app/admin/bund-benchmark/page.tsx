import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import BundAdmin from "@/components/BundAdmin";
import { currentUser } from "@/lib/currentUser";

export const metadata: Metadata = { title: "Bund benchmark · 10BONDS", robots: { index: false } };
export const dynamic = "force-dynamic";

// Admin only: the official German Bund benchmark (Deutsche Bundesbank), 1 to 30 years, refreshed every Monday 09:00 Berlin time.
export default async function AdminBundBenchmark() {
  const user = await currentUser();
  if (!user) redirect("/login?next=%2Fadmin%2Fbund-benchmark");
  if (user?.adminState && user.adminState !== "ok") redirect("/admin");
  if (!user?.isAdmin) notFound();
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <p className="text-sm"><Link href="/admin" className="text-accent">← Admin</Link></p>
      <h1 className="mt-3 text-2xl font-semibold">German Bund benchmark — Bundesbank</h1>
      <BundAdmin />
    </main>
  );
}
