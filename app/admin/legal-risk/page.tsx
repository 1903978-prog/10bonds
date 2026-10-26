import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import LegalRiskAdmin from "@/components/LegalRiskAdmin";
import { currentUser } from "@/lib/currentUser";
import { dashboardData } from "@/lib/legalRisk/dashboard";

export const metadata: Metadata = { title: "Legal risk · 10BONDS", robots: { index: false } };
export const dynamic = "force-dynamic";

// Internal compliance control center. Admin only; never linked for customers; not legal advice.
export default async function AdminLegalRisk() {
  const user = await currentUser();
  if (!user) redirect("/login?next=%2Fadmin%2Flegal-risk");
  if (user?.adminState && user.adminState !== "ok") redirect("/admin");
  if (!user?.isAdmin) notFound();
  const data = await dashboardData();
  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <p className="text-sm"><Link href="/admin" className="text-accent">← Admin</Link></p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">Legal risk control center</h1>
      <p className="mt-2 text-sm text-mute">
        Internal prioritisation tool, not legal advice. Scores are subjective expert judgements, not probabilities of a claim. Passing a technical check means no known-bad pattern was found; it does not mean the platform is legally compliant.
      </p>
      <LegalRiskAdmin initial={data} />
    </main>
  );
}
