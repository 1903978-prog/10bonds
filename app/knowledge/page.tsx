import type { Metadata } from "next";
import Link from "next/link";
import { KC_EN, KC_ORDER, KC_TEXT } from "@/lib/seo/knowledgeHub";
import { LOCALE, LOCALES, pathOf } from "@/lib/seo/locales";

// The international entry to the Knowledge Center: the content is written for Italy, France and Germany, so this
// page sends visitors to the language they read. Nothing redirects.

export const metadata: Metadata = {
  title: "Knowledge Center · 10BONDS",
  description: "Bond guides, live comparisons, yield calculators and broker fees, in Italian, French and German.",
  alternates: { canonical: "/knowledge", languages: { ...Object.fromEntries(LOCALES.map((l) => [LOCALE[l].hreflang, pathOf(l, "knowledge")])), "x-default": "/knowledge" } },
};

export default function KnowledgePage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-[34px] font-semibold leading-tight tracking-tight">Knowledge Center</h1>
      <p className="mt-3 text-[17px] text-mute">Live bond comparisons, yield calculators, broker fees and plain-language guides. Pick your language.</p>
      <ul className="mt-8 grid gap-3 sm:grid-cols-3">
        {LOCALES.map((l) => (
          <li key={l}>
            <Link href={pathOf(l, "knowledge")} hrefLang={LOCALE[l].hreflang} className="block h-full rounded-[20px] bg-white p-5 shadow-[0_2px_20px_rgba(0,0,0,0.04)] hover:text-accent">
              <span className="block text-lg font-semibold">{LOCALE[l].name}</span>
              <span className="mt-1 block text-sm text-mute">{KC_TEXT[l].h1}</span>
            </Link>
          </li>
        ))}
      </ul>
      <h2 className="mt-10 text-[22px] font-semibold tracking-tight">What you'll find</h2>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {KC_ORDER.map((s) => <li key={s} className="rounded-2xl bg-white px-4 py-3 text-[15px]">{KC_EN[s]}</li>)}
      </ul>
    </div>
  );
}
