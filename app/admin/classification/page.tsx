import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/lib/currentUser";
import { classificationAudit } from "@/lib/classifyAudit";

export const metadata: Metadata = { title: "Country and industry · 10BONDS", robots: { index: false } };
export const dynamic = "force-dynamic";

const pct = (n: number, t: number) => (t ? `${((n / t) * 100).toFixed(1)}%` : "–");
const SRC: Record<string, string> = { feed: "data model", "feed-legacy": "data model (old column)", "isin-prefix": "ISIN prefix (government only)", table: "10bonds issuer table" };

// Admin only: how many shown bonds have a country and an industry, where each came from, and the issuers still missing one.
export default async function AdminClassification() {
  const user = await currentUser();
  if (!user) redirect("/login?next=%2Fadmin%2Fclassification");
  if (user?.adminState && user.adminState !== "ok") redirect("/admin");
  if (!user?.isAdmin) notFound();
  const a = await classificationAudit().catch(() => null);
  if (!a) return <main className="mx-auto max-w-3xl px-4 py-10"><p className="text-sm">Bond data is not connected.</p></main>;
  const c = a.coverage;
  const src = (m: Record<string, number>) => Object.entries(m).map(([k, n]) => `${SRC[k] ?? k}: ${n}`).join(" · ") || "none";
  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <p className="text-sm"><Link href="/admin" className="text-accent">← Admin</Link></p>
      <h1 className="mt-3 text-2xl font-semibold">Country and industry</h1>
      <p className="mt-2 text-sm text-mute">Every value has a source; nothing is guessed. A bond with none is shown as &quot;Not classified&quot; in the diversification bars. Supranationals (EIB, EU, ESM, EFSF, EBRD, IBRD, IDB, ADB, AfDB and similar, detected by issuer name in lib/classify.ts) are shown as &quot;Supranational&quot;, their own country group.</p>
      <div className="mt-4 rounded-lg bg-yellow-100 px-3 py-2 text-sm" data-testid="classification-summary">
        <p>{c.total.toLocaleString("en")} bonds shown: <b>country {pct(c.country, c.total)}</b> · <b>industry {pct(c.sector, c.total)}</b> · both {pct(c.both, c.total)}</p>
        <p className="mt-1">Country from: {src(c.countryBySource)}</p>
        <p className="mt-1">Industry from: {src(c.sectorBySource)}</p>
        <p className="mt-1">Per currency: {Object.entries(a.byCurrency).map(([k, v]) => `${k} country ${pct(v.country, v.total)}, industry ${pct(v.sector, v.total)} (${v.total})`).join(" · ")}</p>
        <p className="mt-1">Issuers: {a.issuers.toLocaleString("en")}, complete: {a.issuersClassified.toLocaleString("en")}, missing something: {a.missing.length.toLocaleString("en")}</p>
      </div>
      <p className="mt-3 text-sm"><Link href="/api/admin/classification" prefetch={false} className="text-accent">Download the missing issuers (CSV)</Link></p>
      <table className="mt-4 w-full text-left text-xs">
        <thead><tr className="text-mute"><th>Issuer</th><th>Bonds</th><th>Example ISIN</th><th>Cur</th><th>Missing</th><th>Country</th><th>Industry</th></tr></thead>
        <tbody>
          {a.missing.slice(0, 300).map((m) => (
            <tr key={m.issuer + m.isin} className="border-t">
              <td>{m.issuer}</td><td>{m.bonds}</td><td>{m.isin}</td><td>{m.currency}</td><td>{m.needs}</td><td>{m.country ?? "–"}</td><td>{m.sector ?? "–"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {a.missing.length > 300 && <p className="mt-2 text-xs text-mute">Showing the first 300 of {a.missing.length} (the CSV has all).</p>}
    </main>
  );
}
