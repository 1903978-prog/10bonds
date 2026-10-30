"use client";

import dynamic from "next/dynamic";
import type { FinderLang } from "@/lib/finderText";

// The finder is a large piece of code. Behind the landing page it is fetched only once the visitor leaves the landing page,
// so the landing page loads and becomes usable faster (the owner, 30/10/2026: page fully loaded under 1.5 s).
const Finder = dynamic(() => import("@/components/Finder"), { ssr: false, loading: () => null });

export default function FinderLazy({ lang = "en", heading = true }: { lang?: FinderLang; heading?: boolean }) {
  return <Finder lang={lang} heading={heading} />;
}
