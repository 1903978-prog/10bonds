import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import WeeklyEmailAdmin from "@/components/WeeklyEmailAdmin";
import { currentUser } from "@/lib/currentUser";
import { LANG_NAMES, WELCOME_LANGS, welcomeLang } from "@/lib/welcomeEmail";
import { weeklyEmail } from "@/lib/weeklyEmail";
import { weeklyPicks, weeklyStatus } from "@/lib/weeklySend";

export const metadata: Metadata = { title: "Weekly e-mail · 10BONDS", robots: { index: false } };
export const dynamic = "force-dynamic";

// The weekly top 10 e-mail to newsletter subscribers: preview, test to myself, sending on/off.
export default async function WeeklyEmailPage({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/login?next=%2Fadmin%2Fweekly-email");
  if (user?.adminState && user.adminState !== "ok") redirect("/admin");
  if (!user?.isAdmin) notFound();
  const lang = welcomeLang((await searchParams).lang);
  const [picks, status] = await Promise.all([weeklyPicks(true).catch(() => null), weeklyStatus()]);
  const m = picks ? weeklyEmail(lang, picks, "#unsubscribe") : null;
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <p className="text-sm"><Link href="/admin" className="text-accent">← Admin</Link></p>
      <h1 className="mt-3 text-2xl font-semibold">Weekly e-mail</h1>
      <p className="mt-2 text-sm text-mute">Every Monday at about 8:30 (Italy), to accounts that ticked the newsletter box and confirmed their e-mail, in the language they signed up in. One per person per week.</p>
      <WeeklyEmailAdmin initial={status} lang={lang} />
      <div className="mt-5 flex gap-2 text-sm">
        {WELCOME_LANGS.map((l) => (
          <Link key={l} href={`/admin/weekly-email?lang=${l}`} className={`rounded-full px-4 py-1.5 ${l === lang ? "bg-ink text-white" : "bg-black/5"}`}>{LANG_NAMES[l]}</Link>
        ))}
      </div>
      {m ? (
        <>
          <p className="mt-5 text-sm"><span className="text-mute">Subject:</span> <strong data-testid="weekly-subject">{m.subject}</strong></p>
          <iframe title="Weekly e-mail preview" srcDoc={m.html} className="mt-3 h-[1050px] w-full rounded-lg border border-black/10" sandbox="allow-popups allow-popups-to-escape-sandbox" />
        </>
      ) : (
        <p className="mt-5 text-sm">No bond list available right now.</p>
      )}
    </main>
  );
}
