import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import AdminSkills from "@/components/AdminSkills";
import { currentUser } from "@/lib/currentUser";
import { BONDS_SKILL } from "@/lib/bondsSkill";
import { loadSkills } from "@/lib/gptRatingsDb";
import { CORPORATE_MD, SOVEREIGN_MD } from "@/lib/methodologyText";

export const metadata: Metadata = { title: "Rating skills · 10BONDS", robots: { index: false } };
export const dynamic = "force-dynamic";

// The three skill texts sent to the model (admin only). Empty boxes start from the text we already have.
export default async function AdminSkillsPage() {
  const user = await currentUser();
  if (!user) redirect("/login?next=%2Fadmin%2Fskills");
  if (user?.adminState && user.adminState !== "ok") redirect("/admin");
  if (!user?.isAdmin) notFound();
  const saved = await loadSkills();
  const defaults = { irbr: BONDS_SKILL, lr_gov: SOVEREIGN_MD.trim(), lr_corp: CORPORATE_MD.trim() };
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <p className="text-sm"><Link href="/admin" className="text-accent">← Admin</Link></p>
      <h1 className="mt-3 text-2xl font-semibold">Rating skills</h1>
      <p className="mt-2 text-sm text-mute">Three texts, saved in the database, visible only to you. The IR/BR button next to each bond sends the first one to the model with every request. The other two are stored here for the next step.</p>
      <AdminSkills saved={saved} defaults={defaults} />
    </main>
  );
}
