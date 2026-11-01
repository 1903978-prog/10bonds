import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import CreditResearchAdmin from "@/components/CreditResearchAdmin";
import { currentUser } from "@/lib/currentUser";

export const metadata: Metadata = { title: "Credit Research · 10BONDS", robots: { index: false } };
export const dynamic = "force-dynamic";

// Admin only: queue, worker status and controls of the credit research engine (Ollama worker on the owner's computer).
export default async function AdminCreditResearch() {
  const user = await currentUser();
  if (!user) redirect("/login?next=%2Fadmin%2Fcredit-research");
  if (user?.adminState && user.adminState !== "ok") redirect("/admin");
  if (!user?.isAdmin) notFound();
  return (
    <main className="mx-auto max-w-5xl px-3 py-6">
      <CreditResearchAdmin />
    </main>
  );
}
