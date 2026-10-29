import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import SliderSnapshotAdmin from "@/components/SliderSnapshotAdmin";
import { currentUser } from "@/lib/currentUser";

export const metadata: Metadata = { title: "Efficient Database · 10BONDS", robots: { index: false } };
export const dynamic = "force-dynamic";

// The 90 precomputed slider positions and their checks.
export default async function AdminSliderSnapshot() {
  const user = await currentUser();
  if (!user) redirect("/login?next=%2Fadmin%2Fefficient-database");
  if (user?.adminState && user.adminState !== "ok") redirect("/admin");
  if (!user?.isAdmin) notFound();
  return (
    <main className="mx-auto max-w-none px-4 py-10">
      <p className="text-sm"><Link href="/admin" className="text-accent">← Admin</Link></p>
      <h1 className="mt-3 text-2xl font-semibold">Efficient Database</h1>
      <p className="mt-2 text-sm text-mute">The 90 slider positions (30 per term) calculated in advance for each new price batch. The website reads only the published snapshot; a snapshot is published only when all 90 positions pass every check.</p>
      <SliderSnapshotAdmin />
    </main>
  );
}
