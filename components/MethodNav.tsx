import Link from "next/link";
import { METHOD_LANGS, METHOD_UI, type MethodLang } from "@/lib/methodology";

const LANG_NAME = { en: "English", it: "Italiano", fr: "Français", de: "Deutsch" } as const;

export type Kind = "sovereign" | "corporate";
export const kindOf = (v: string | string[] | undefined): Kind => ((Array.isArray(v) ? v[0] : v) === "corporate" ? "corporate" : "sovereign");

/** The full text of each methodology, as a PDF built by scripts/methodology-pdf.mjs. */
export const METHOD_PDF: Record<Kind, string> = {
  sovereign: "/methodology/10bonds-country-rating-methodology.pdf",
  corporate: "/methodology/10bonds-company-rating-methodology.pdf",
};

/** /methodology URL for a language and kind. */
export function methodHref(lang: MethodLang, kind: Kind) {
  const q = [lang !== "en" && `lang=${lang}`, kind === "corporate" && "type=corporate"].filter(Boolean).join("&");
  return `/methodology${q ? `?${q}` : ""}`;
}

/** Language links, the Countries / Companies switch and the full-text PDF download. */
export function MethodNav({ lang, kind }: { lang: MethodLang; kind: Kind }) {
  const ui = METHOD_UI[lang];
  const seg = (k: Kind, label: string) => (
    <Link href={methodHref(lang, k)} aria-current={k === kind ? "page" : undefined} className={`rounded-md px-3 py-0.5 ${k === kind ? "bg-white font-medium text-ink shadow-sm" : "text-mute hover:text-ink"}`}>
      {label}
    </Link>
  );
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-mute">
      <nav aria-label="Language" className="flex gap-3">
        {METHOD_LANGS.map((l) => (
          <Link key={l} href={methodHref(l, kind)} hrefLang={l} className={l === lang ? "text-ink" : "hover:text-ink"} aria-current={l === lang ? "page" : undefined}>
            {LANG_NAME[l]}
          </Link>
        ))}
      </nav>
      <div className="flex rounded-lg bg-line/50 p-0.5">
        {seg("sovereign", ui.countries)}
        {seg("corporate", ui.companies)}
      </div>
      <a href={METHOD_PDF[kind]} download className="text-accent hover:underline" data-testid="methodology-pdf">
        {ui.full}
        {lang !== "en" && <span className="text-mute"> · {ui.fullNote}</span>}
      </a>
    </div>
  );
}
