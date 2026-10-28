"use client";

import { useCallback, useState, type ReactNode } from "react";
import type { FinderLang } from "@/lib/finderText";
import Landing from "./Landing";
import { requestFinderList } from "@/lib/finderStart";

/** When a visitor arrives from outside the site the landing page takes the finder's place; its buttons (or Escape) bring the finder in. */
export default function IntroGate({ show, lang = "en", heading = true, children }: { show: boolean; lang?: FinderLang; heading?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(show);
  const close = useCallback(() => {
    requestFinderList();
    setOpen(false);
    window.scrollTo(0, 0);
  }, []);
  return open ? <Landing lang={lang} heading={heading} onClose={close} /> : <>{children}</>;
}
