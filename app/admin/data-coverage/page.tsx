import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { bondDataStats } from "@/lib/bonds";
import { currentUser } from "@/lib/currentUser";

export const metadata: Metadata = { title: "Data coverage · 10BONDS", robots: { index: false } };
export const dynamic = "force-dynamic";

const n = (v: number) => v.toLocaleString("en-GB");
const pct = (v: number, t: number) => (t ? `${Math.round((v / t) * 1000) / 10}%` : "–");
const day = (v: string | null) => (v ? v.slice(0, 10) : "–");

// Admin only: what the shared bond copy holds, counted live (the per-field report by currency is the "Bond data coverage" workflow).
export default async function AdminDataCoverage() {
  const user = await currentUser();
  if (!user) redirect("/login?next=%2Fadmin%2Fdata-coverage");
  if (user?.adminState && user.adminState !== "ok") redirect("/admin");
  if (!user?.isAdmin) notFound();
  const s = await bondDataStats().catch(() => null);
  const rows: [string, string, string][] = s
    ? [
        ["Bonds in the copy", n(s.total), ""],
        ["With a yield", n(s.withYtm), pct(s.withYtm, s.total)],
        ["With a rating (any agency)", n(s.withRating), pct(s.withRating, s.total)],
        ["Yield dated in the last 24 hours", n(s.ytmLast24h), pct(s.ytmLast24h, s.total)],
        [`Newest ${s.freshness.basis === "price_as_of" ? "price" : "yield"} date`, day(s.freshness.newest), ""],
        [`Oldest ${s.freshness.basis === "price_as_of" ? "price" : "yield"} date`, day(s.freshness.oldest), ""],
        ["Older than 7 days", n(s.freshness.olderThan7d), pct(s.freshness.olderThan7d, s.total)],
        ["Without a date", n(s.freshness.noDate), pct(s.freshness.noDate, s.total)],
        ["Shown on the site", n(s.shownOnSite), pct(s.shownOnSite, s.total)],
      ]
    : [];
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <p className="text-sm"><Link href="/admin" className="text-accent">← Admin</Link></p>
      <h1 className="mt-3 text-2xl font-semibold">Data coverage</h1>
      <p className="mt-2 text-sm text-mute">What the shared bond copy holds, counted now. Admin only. The detailed report by currency and field is the &quot;Bond data coverage&quot; run under Actions on GitHub; imports are on <Link href="/admin/bond-data" className="text-accent">Bond data</Link>.</p>
      {!s && <p className="mt-6 rounded-lg border border-line bg-white p-4 text-sm text-mute" data-testid="coverage-empty">The bond copy is not connected here (sample data), so there is nothing to count.</p>}
      {s && (
        <div className="mt-6 overflow-x-auto rounded-lg border border-line bg-white">
          <table className="w-full text-left text-sm" data-testid="coverage-table">
            <tbody>
              {rows.map(([k, v, p]) => (
                <tr key={k} className="border-t border-line/60 first:border-0"><td className="px-3 py-2 text-mute">{k}</td><td className="px-3 py-2 font-medium">{v}</td><td className="px-3 py-2 text-mute">{p}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
