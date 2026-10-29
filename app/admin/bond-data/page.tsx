import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import BondImportPanel from "@/components/BondImportPanel";
import { currentUser } from "@/lib/currentUser";

export const metadata: Metadata = { title: "Bond data · 10BONDS", robots: { index: false } };
export const dynamic = "force-dynamic";

// Admin only: upload a bonds spreadsheet, check the preview, confirm.
export default async function AdminBondData() {
  const user = await currentUser();
  if (!user) redirect("/login?next=%2Fadmin%2Fbond-data");
  if (user?.adminState && user.adminState !== "ok") redirect("/admin");
  if (!user?.isAdmin) notFound();
  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <p className="text-sm"><Link href="/admin" className="text-accent">← Admin</Link></p>
      <h1 className="mt-3 text-2xl font-semibold">Bond data</h1>
      <p className="mt-2 text-sm text-mute">Upload a spreadsheet (xls, xlsx, csv) with an ISIN column. Admin only: nothing from it is shown to customers.</p>
      <p className="mt-3 rounded-lg bg-yellow-100 px-3 py-2 text-sm" data-testid="price-date-note">Price date (interim): the nightly copy has no price date yet, so the site uses the <b>yield date</b> (ytm_as_of) as the price date everywhere. This switches to the real price date as soon as the data model sends <code>price_date</code>.</p>
      <BondImportPanel />
    </main>
  );
}
