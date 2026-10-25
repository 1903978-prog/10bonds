import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import AssessmentsAdmin, { CorrectionStatus } from "@/components/AssessmentsAdmin";
import { currentUser } from "@/lib/currentUser";
import { listCorrections, listEvidence, verdictsOn } from "@/lib/assessments";

export const metadata: Metadata = { title: "Assessments · 10BONDS", robots: { index: false } };
export const dynamic = "force-dynamic";

/** Admin: the BUY/WATCH/AVOID switch, the evidence kept for each published assessment, and issuers' correction requests. */
export default async function AdminAssessments() {
  const user = await currentUser();
  if (!user) redirect("/login?next=%2Fadmin%2Fassessments");
  if (user?.adminState && user.adminState !== "ok") redirect("/admin");
  if (!user?.isAdmin) notFound();
  const [on, evidence, corrections] = await Promise.all([verdictsOn(), listEvidence().catch(() => []), listCorrections().catch(() => [])]);
  const fmt = (iso: string) => iso.slice(0, 16).replace("T", " ");
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <p className="text-sm"><Link href="/admin" className="text-accent">← Admin</Link></p>
      <h1 className="mt-3 text-2xl font-semibold">Assessments: evidence and corrections</h1>
      <section className="mt-6">
        <AssessmentsAdmin verdicts={on} />
        <p className="mt-1 text-xs text-mute">Admin always sees them. Checklist: docs/legal/compliance-review-checklist.md</p>
      </section>
      <section className="mt-8">
        <h2 className="font-semibold">Correction requests ({corrections.length})</h2>
        {corrections.length === 0 ? <p className="mt-2 text-sm text-mute">None yet.</p> : (
          <ul className="mt-2 space-y-3 text-sm">
            {corrections.map((c) => (
              <li key={c.id} className="rounded-xl border border-line bg-white p-3">
                <p><b>{c.name}</b> · <a href={`mailto:${c.email}`} className="text-accent">{c.email}</a> · {c.isin ?? "no ISIN"} · {fmt(c.requestedAt)} <CorrectionStatus id={c.id} status={c.status} /></p>
                <p className="mt-1 whitespace-pre-wrap text-mute">{c.message}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="mt-8">
        <h2 className="font-semibold">Published assessments ({evidence.length})</h2>
        <p className="mt-1 text-xs text-mute">One row per bond, model version and assessment date, saved the first time the page was opened.</p>
        <ul className="mt-2 space-y-2 text-sm">
          {evidence.map((e) => (
            <li key={e.id} className="rounded-xl border border-line bg-white p-3">
              <details>
                <summary className="cursor-pointer"><b>{e.isin}</b> · {e.modelVersion} · assessed {e.asOf} · saved {fmt(e.publishedAt)}</summary>
                <p className="mt-1 text-mute">Source: {e.source}</p>
                <pre className="mt-1 max-h-72 overflow-auto rounded bg-canvas p-2 text-xs">{JSON.stringify(e.calculation, null, 1)}</pre>
              </details>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
