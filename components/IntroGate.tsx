"use client";

import { useCallback, useState, type ReactNode } from "react";
import type { FinderLang } from "@/lib/finderText";
import Intro from "./Intro";
import { INTRO_COOKIE } from "@/lib/intro";

/** On a first visit the intro takes the finder's place; its button (or Escape) brings the finder in. */
export default function IntroGate({ show, lang = "en", heading = true, children }: { show: boolean; lang?: FinderLang; heading?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(show);
  const close = useCallback(() => {
    document.cookie = `${INTRO_COOKIE}=1; Path=/; Max-Age=31536000; SameSite=Lax`;
    setOpen(false);
    window.scrollTo(0, 0);
  }, []);
  return open ? <Intro lang={lang} heading={heading} onClose={close} /> : <>{children}</>;
}
