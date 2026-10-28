import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import MethodologyAdmin, { type StoredCount } from "@/components/MethodologyAdmin";
import { currentUser } from "@/lib/currentUser";
import { loadBondsFor } from "@/lib/bonds";
import { TERMS } from "@/lib/limits";
import { bandTableOf } from "@/lib/methodologyChoice";
import { bandsKey } from "@/lib/riskBandsServe";
import { loadStoredBands } from "@/lib/riskBandsStore";

export const metadata: Metadata = { title: "Methodology · 10BONDS", robots: { index: false } };
export const dynamic = "force-dynamic";

// The public site always runs Methodology 4 (the unified portfolio spec). Methodologies 1 to 3 are admin-only: compare them on the finder (yellow switch).
export default async function AdminMethodology() {
  const user = await currentUser();
  if (!user) redirect("/login?next=%2Fadmin%2Fmethodology");
  if (user?.adminState && user.adminState !== "ok") redirect("/admin");
  if (!user?.isAdmin) notFound();
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
        The public site runs one engine, Methodology 4, the portfolio spec in docs/PORTFOLIO_SPEC.md (one versioned config for the optimiser, the validator, the nightly job and the admin rebuild). Methodologies 1 to 3 are kept for comparison only: use the yellow switch on the finder (admin only).
      </p>
      <MethodologyAdmin stored={stored} />
    </main>
  );
}
