import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import MethodologyAdmin, { type StoredCount } from "@/components/MethodologyAdmin";
import { currentUser } from "@/lib/currentUser";
import { loadBondsFor } from "@/lib/bonds";
import { TERMS } from "@/lib/limits";
import { activeMethodology, bandTableOf } from "@/lib/methodologyChoice";
import { bandsKey } from "@/lib/riskBandsServe";
import { loadStoredBands } from "@/lib/riskBandsStore";

export const metadata: Metadata = { title: "Methodology · 10BONDS", robots: { index: false } };
export const dynamic = "force-dynamic";

// Which of the four methodologies the public site uses. The admin can still compare any of them on the finder (yellow switch).
export default async function AdminMethodology() {
  const user = await currentUser();
  if (!user) redirect("/login?next=%2Fadmin%2Fmethodology");
  if (user?.adminState && user.adminState !== "ok") redirect("/admin");
  if (!user?.isAdmin) notFound();
  const active = await activeMethodology();
  // How many of the 30 positions have a stored list, for the banded methodologies (EUR, all sizes).
  const stored: Record<number, StoredCount> = {};
  const f = { currency: "EUR", size: "100k" } as const;
  const src = await loadBondsFor(f).catch(() => null);
  if (src) {
    for (const n of [3, 4] as const) {
      const cfg = await bandTableOf(n);
      const row: StoredCount = {};
      for (const t of TERMS) {
        const got = await loadStoredBands(bandsKey(src, f, t.duration, cfg));
        row[t.key] = got ? `${got.data.bands.filter((b) => b.status === "ok").length}/30` : "not stored yet";
      }
      stored[n] = row;
    }
  }
  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <p className="text-sm"><Link href="/admin" className="text-accent">← Admin</Link></p>
      <h1 className="mt-3 text-2xl font-semibold">Methodology</h1>
      <p className="mt-2 text-sm text-mute">
        Pick the methodology the public site uses for the Return &amp; risk slider and the portfolio lists. All four are kept and served from stored lists (prepared by the 3-hourly job), so switching is instant. To compare, use the yellow switch on the finder (admin only). Methodology 3 is what ran before this page existed.
      </p>
      <MethodologyAdmin initial={active} stored={stored} />
    </main>
  );
}
