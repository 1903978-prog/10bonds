import Link from "next/link";
import { METHOD_LANGS, METHOD_UI, type MethodLang } from "@/lib/methodology";

const LANG_NAME = { en: "English", it: "Italiano", fr: "Français", de: "Deutsch" } as const;

export type Kind = "sovereign" | "corporate";
export const kindOf = (v: string | string[] | undefined): Kind => ((Array.isArray(v) ? v[0] : v) === "corporate" ? "corporate" : "sovereign");

/** /methodology URL for a language, kind and page (summary or full text). */
export function methodHref(lang: MethodLang, kind: Kind, full = false) {
  const q = [lang !== "en" && `lang=${lang}`, kind === "corporate" && "type=corporate"].filter(Boolean).join("&");
  return `/methodology${full ? "/full" : ""}${q ? `?${q}` : ""}`;
}

/** Language links, the Countries / Companies switch and the link to the full text (or back to the summary). */
export function MethodNav({ lang, kind, full = false }: { lang: MethodLang; kind: Kind; full?: boolean }) {
  const ui = METHOD_UI[lang];
  const seg = (k: Kind, label: string) => (
    <Link href={methodHref(lang, k, full)} aria-current={k === kind ? "page" : undefined} className={`rounded-md px-3 py-0.5 ${k === kind ? "bg-white font-medium text-ink shadow-sm" : "text-mute hover:text-ink"}`}>
      {label}
    </Link>
  );
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-mute">
      <nav aria-label="Language" className="flex gap-3">
        {METHOD_LANGS.map((l) => (
          <Link key={l} href={methodHref(l, kind, full)} hrefLang={l} className={l === lang ? "text-ink" : "hover:text-ink"} aria-current={l === lang ? "page" : undefined}>
            {LANG_NAME[l]}
          </Link>
        ))}
      </nav>
      <div className="flex rounded-lg bg-line/50 p-0.5">
        {seg("sovereign", ui.countries)}
        {seg("corporate", ui.companies)}
      </div>
      <Link href={methodHref(lang, kind, !full)} className="text-accent hover:underline">{full ? ui.summary : ui.full}</Link>
    </div>
  );
}
