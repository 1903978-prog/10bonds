import type { Metadata } from "next";
import { DROPS_TEXT, type DropsLang } from "./dropsText";

/** Title of the price-drops page. Admin only, so never indexed. */
export function dropsMetadata(lang: DropsLang): Metadata {
  return { title: { absolute: DROPS_TEXT[lang].title }, robots: { index: false, follow: false } };
}
