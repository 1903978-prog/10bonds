import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/lib/currentUser";
import { recentBuilds } from "@/lib/portfolioBuild";

export const metadata: Metadata = { title: "Nightly build · 10BONDS", robots: { index: false } };
export const dynamic = "force-dynamic";

const fmt = (v: string | null) => (v ? new Date(v).toISOString().replace("T", " ").slice(0, 16) + " UTC" : "–");
const mins = (ms: number | null) => (ms === null ? "–" : `${Math.round(ms / 6000) / 10} min`);

// Admin only: the nightly build of every stored list (4 filters x 15 horizons x 30 positions = 1,800 keys), one horizon at a time on a runner.
export default async function AdminNightlyBuild() {
  const user = await currentUser();
  if (!user) redirect("/login?next=%2Fadmin%2Fnightly-build");
  if (user?.adminState && user.adminState !== "ok") redirect("/admin");
  if (!user?.isAdmin) notFound();
  const rows = await recentBuilds();
  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <p className="text-sm"><Link href="/admin" className="text-accent">← Admin</Link></p>
      <h1 className="mt-3 text-2xl font-semibold">Nightly build</h1>
      <p className="mt-2 text-sm text-mute">Every list a visitor can reach (EUR and USD × All and 1k–10k × years 1–15 × 30 positions) is solved ahead of time, one horizon at a time, on a GitHub runner in the quiet hours after the price import (about 00:10 UTC, repeated at 02:10 UTC to finish a stopped run). The website only reads the stored lists. A list already saved for the same prices and the same spec version is skipped. The build waits while the website is busy. Cost: 0 USD (public repository, free runner minutes).</p>
      <div className="mt-6 overflow-x-auto rounded-lg border border-line">
        <table className="w-full text-left text-sm" data-testid="nightly-build">
          <thead className="bg-soft text-xs text-mute"><tr>{["Started", "Finished", "Status", "Keys built", "Skipped", "Failed", "Runtime", "Paused", "Peak memory", "Prices", "Spec"].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={11} className="px-3 py-4 text-mute">No build has run yet.</td></tr>}
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-line">
                <td className="px-3 py-2">{fmt(r.started_at)}</td><td className="px-3 py-2">{fmt(r.finished_at)}</td><td className="px-3 py-2">{r.status}</td>
                <td className="px-3 py-2">{r.keys_built}</td><td className="px-3 py-2">{r.keys_skipped}</td><td className="px-3 py-2">{r.keys_failed}</td>
                <td className="px-3 py-2">{mins(r.runtime_ms)}</td><td className="px-3 py-2">{mins(r.paused_ms)}</td><td className="px-3 py-2">{r.peak_rss_mb === null ? "–" : `${r.peak_rss_mb} MB`}</td>
                <td className="px-3 py-2">{r.price_batch ?? "–"}</td><td className="px-3 py-2">{r.spec_version ?? "–"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
