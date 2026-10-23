import type { Metadata } from "next";
import Link from "next/link";
import CopySnippet from "@/components/CopySnippet";
import { embedSnippet, WIDGET_TEXT, widgetLang } from "@/lib/seo/widget";
import { pickedLang } from "@/lib/pageLang";

// How to put the free yields widget on another website: a live preview and the code to paste.

export const metadata: Metadata = {
  title: "Free bond yields widget for your website · 10BONDS",
  description: "Show EUR bond yields by risk and maturity on your website or blog. Free, no sign-up: copy one line of code.",
  alternates: { canonical: "/widget" },
};
export const dynamic = "force-dynamic";

export default async function WidgetPage({ searchParams }: { searchParams: Promise<{ lang?: string; theme?: string }> }) {
  const q = await searchParams;
  // No language list on the page (the owner): the widget follows the language picked in the header menu.
  const lang = widgetLang(await pickedLang(q.lang));
  const dark = q.theme === "dark";
  const pill = (on: boolean) => `rounded-full px-3 py-1.5 text-sm ${on ? "bg-ink text-white" : "bg-white"}`;
  const href = (l: string, d: boolean) => `/widget?lang=${l}${d ? "&theme=dark" : ""}`;
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-[34px] font-semibold leading-tight tracking-tight">Free bond yields widget</h1>
      <p className="mt-3 text-[17px] text-mute">
        Show EUR bond yields by 10BONDS risk and years to maturity on your website or blog. It updates every day by itself. Free, no sign-up.
      </p>
      <div className="mt-6 flex flex-wrap items-center gap-2" aria-label="Theme">
        <Link href={href(lang, false)} className={pill(!dark)} scroll={false}>Light</Link>
        <Link href={href(lang, true)} className={pill(dark)} scroll={false}>Dark</Link>
      </div>
      <section className="mt-5 rounded-[24px] bg-white p-5 shadow-[0_2px_20px_rgba(0,0,0,0.04)] sm:p-6">
        <h2 className="text-[17px] font-semibold">Preview</h2>
        <iframe src={`/embed/yields?lang=${lang}${dark ? "&theme=dark" : ""}`} title={WIDGET_TEXT[lang].title} className="mt-3 h-[330px] w-full max-w-[520px] rounded-xl border border-line" loading="lazy" />
        <h2 className="mt-6 text-[17px] font-semibold">Copy this code into your page</h2>
        <p className="mb-2 mt-1 text-sm text-mute">Paste it where the widget should appear (in WordPress: an &quot;HTML&quot; block). Please keep the link under it.</p>
        <CopySnippet code={embedSnippet(lang, dark)} label="Embed code" />
      </section>
      <p className="mt-4 text-[11px] text-mute">Median gross yields computed from the bonds 10BONDS tracks.</p>
    </div>
  );
}
