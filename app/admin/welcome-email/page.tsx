import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { loadFreeLimits } from "@/lib/searchLimits";
import { currentUser } from "@/lib/currentUser";
import { LANG_NAMES, WELCOME_LANGS, welcomeEmail, welcomeLang } from "@/lib/welcomeEmail";

export const metadata: Metadata = { title: "Welcome e-mail · 10BONDS", robots: { index: false } };
export const dynamic = "force-dynamic";

// Preview of the e-mail sent once a new account confirms its address, exactly as it is sent.
export default async function WelcomeEmailPreview({ searchParams }: { searchParams: Promise<{ lang?: string; code?: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/login?next=%2Fadmin%2Fwelcome-email");
  if (user?.adminState && user.adminState !== "ok") redirect("/admin");
  if (!user?.isAdmin) notFound();
  const sp = await searchParams;
  const lang = welcomeLang(sp.lang);
  const withCode = sp.code === "1";
  const m = welcomeEmail(lang, user.username ?? "Mario", withCode ? 30 : null, undefined, await loadFreeLimits());
  const href = (l: string, c: boolean) => `/admin/welcome-email?lang=${l}${c ? "&code=1" : ""}`;
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <p className="text-sm"><Link href="/admin" className="text-accent">← Admin</Link></p>
      <h1 className="mt-3 text-2xl font-semibold">Welcome e-mail</h1>
      <p className="mt-2 text-sm text-mute">Sent once, when a new account confirms its e-mail address, in the language of the site they used.</p>
      <div className="mt-5 flex gap-2 text-sm" data-testid="welcome-langs">
        {WELCOME_LANGS.map((l) => (
          <Link key={l} href={href(l, withCode)} className={`rounded-full px-4 py-1.5 ${l === lang ? "bg-ink text-white" : "bg-black/5"}`}>
            {LANG_NAMES[l]}
          </Link>
        ))}
      </div>
      <div className="mt-3 flex gap-2 text-sm">
        <Link href={href(lang, false)} className={`rounded-full px-4 py-1.5 ${!withCode ? "bg-ink text-white" : "bg-black/5"}`}>Without promo code</Link>
        <Link href={href(lang, true)} className={`rounded-full px-4 py-1.5 ${withCode ? "bg-ink text-white" : "bg-black/5"}`}>With promo code (30 days)</Link>
      </div>
      <p className="mt-5 text-sm"><span className="text-mute">Subject:</span> <strong data-testid="welcome-subject">{m.subject}</strong></p>
      <iframe title="Welcome e-mail preview" srcDoc={m.html} className="mt-3 h-[1150px] w-full rounded-2xl border border-black/10" sandbox="allow-popups allow-popups-to-escape-sandbox" />
    </main>
  );
}
