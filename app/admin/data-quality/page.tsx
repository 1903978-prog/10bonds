import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/lib/currentUser";
import { priceAudit } from "@/lib/bonds";
import { REASON_TEXT, type PriceReason } from "@/lib/priceIntegrity";

export const metadata: Metadata = { title: "Price checks · 10BONDS", robots: { index: false } };
export const dynamic = "force-dynamic";

// Admin only: bonds whose stored price failed the sanity checks. They are left out of every ranking.
export default async function AdminDataQuality({ searchParams }: { searchParams: Promise<{ isin?: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/login?next=%2Fadmin%2Fdata-quality");
  if (user?.adminState && user.adminState !== "ok") redirect("/admin");
  if (!user?.isAdmin) notFound();
  const { isin } = await searchParams;
  const a = await priceAudit().catch(() => null);
  if (!a) return <main className="mx-auto max-w-3xl px-4 py-10"><p className="text-sm">Bond data is not connected.</p></main>;
  const asked = isin ? a.flagged.find((f) => f.isin === isin.toUpperCase()) : null;
  const shown = a.flagged.slice(0, 200);
  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <p className="text-sm"><Link href="/admin" className="text-accent">← Admin</Link></p>
      <h1 className="mt-3 text-2xl font-semibold">Price checks</h1>
      <p className="mt-2 text-sm text-mute">Bonds with a stored price that fails a check are left out of every ranking. Customers never see prices or sources.</p>
      <div className="mt-4 rounded-lg bg-yellow-100 px-3 py-2 text-sm" data-testid="price-audit-summary">
        <p>{a.total.toLocaleString("en")} bonds in the copy, {a.withPrice.toLocaleString("en")} with a price, <b>{a.flagged.length.toLocaleString("en")} flagged</b>.</p>
        <p className="mt-1">Per currency: {Object.entries(a.perCurrency).map(([c, v]) => `${c} ${v.flagged} of ${v.withPrice} priced (${v.total} total)`).join(" · ")}</p>
        <p className="mt-1">Per problem: {Object.entries(a.reasons).map(([r, n]) => `${REASON_TEXT[r as PriceReason]}: ${n}`).join(" · ") || "none"}</p>
        <p className="mt-1">Price source: {Object.entries(a.bySource).map(([s, n]) => `${s}: ${n}`).join(" · ") || "no price column in the copy yet"}</p>
      </div>
      {isin && <p className="mt-3 text-sm">{asked ? `${asked.isin} is flagged: ${asked.reasons.map((r) => REASON_TEXT[r]).join("; ")}.` : `${isin.toUpperCase()} is not flagged by these checks.`}</p>}
      <table className="mt-4 w-full text-left text-xs">
        <thead><tr className="text-mute"><th>ISIN</th><th>Name</th><th>Cur</th><th>Price</th><th>Yield</th><th>Source</th><th>Quote date</th><th>Problem</th></tr></thead>
        <tbody>
          {shown.map((f) => (
            <tr key={f.isin} className="border-t bg-yellow-50">
              <td>{f.isin}</td><td>{f.name}</td><td>{f.currency}</td><td>{f.price ?? "–"}</td><td>{f.ytm ?? "–"}</td><td>{f.source ?? "–"}</td><td>{f.asOf?.slice(0, 10) ?? "–"}</td>
              <td>{f.reasons.map((r) => REASON_TEXT[r]).join("; ")}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {a.flagged.length > shown.length && <p className="mt-2 text-xs text-mute">Showing the first {shown.length} of {a.flagged.length}.</p>}
    </main>
  );
}
