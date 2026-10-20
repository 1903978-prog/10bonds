import Link from "next/link";
import type { Metadata } from "next";
import { DISCLAIMER, DISCLAIMER_LANGS, disclaimerLang } from "@/lib/disclaimer";

export const metadata: Metadata = { title: "Disclaimer · 10BONDS", alternates: { canonical: "/disclaimer" } };

const LANG_NAME = { en: "English", it: "Italiano", fr: "Français", de: "Deutsch" } as const;

export default async function Disclaimer({ searchParams }: { searchParams: Promise<{ lang?: string | string[] }> }) {
  const lang = disclaimerLang((await searchParams).lang);
  const d = DISCLAIMER[lang];
  return (
    <article lang={lang} className="mx-auto max-w-6xl rounded-[28px] bg-white p-7 text-[15px] leading-relaxed shadow-[0_2px_20px_rgba(0,0,0,0.04)] sm:p-10">
      <nav aria-label="Language" className="flex gap-3 text-xs text-mute">
        {DISCLAIMER_LANGS.map((l) => (
          <Link key={l} href={l === "en" ? "/disclaimer" : `/disclaimer?lang=${l}`} hrefLang={l} className={l === lang ? "text-ink" : "hover:text-ink"} aria-current={l === lang ? "page" : undefined}>
            {LANG_NAME[l]}
          </Link>
        ))}
      </nav>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">{d.title}</h1>
      <p className="mt-5">{d.intro}</p>
      {d.sections.map((s) => (
        <section key={s.title}>
          <h2 className="mt-6 font-semibold" id={s.id}>{s.title}</h2>
          {s.paragraphs.map((p, i) => (
            <p key={i} className="mt-2">{p}</p>
          ))}
        </section>
      ))}
      <p className="mt-8 text-sm">{d.full} <Link href="/terms" className="text-accent">{d.terms}</Link>.</p>
    </article>
  );
}
