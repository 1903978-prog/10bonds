import type { Metadata } from "next";
import { DROPS_PATH, DROPS_TEXT, type DropsLang } from "./dropsText";

/** Title, description and language links of the price-drops page. */
export function dropsMetadata(lang: DropsLang): Metadata {
  const t = DROPS_TEXT[lang];
  return {
    title: { absolute: t.title },
    description: t.description,
    alternates: {
      canonical: DROPS_PATH[lang],
      languages: { "en-GB": DROPS_PATH.en, "it-IT": DROPS_PATH.it, "fr-FR": DROPS_PATH.fr, "de-DE": DROPS_PATH.de, "x-default": DROPS_PATH.en },
    },
  };
}
