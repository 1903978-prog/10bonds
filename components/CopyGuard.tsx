"use client";

import { useEffect } from "react";
import { loadMe } from "@/lib/me";

/** Fields where typing, pasting and copying must keep working. */
export function isEditable(el: EventTarget | null): boolean {
  if (!(el instanceof Element)) return false;
  return Boolean(el.closest("input, textarea, select, [contenteditable=''], [contenteditable='true'], [data-allow-copy]"));
}

/**
 * Blocks selecting, copying and the right-click menu on page text, for every plan. A deterrent only: the text stays
 * in the HTML (search engines read it as before). Form fields keep working, and the admin account is exempt.
 */
export default function CopyGuard() {
  useEffect(() => {
    let off = false;
    const block = (e: Event) => {
      if (!off && !isEditable(e.target)) e.preventDefault();
    };
    const events = ["copy", "cut", "contextmenu", "selectstart", "dragstart"] as const;
    events.forEach((n) => document.addEventListener(n, block));
    document.documentElement.classList.add("no-copy");
    loadMe().then((me) => {
      if (me?.isAdmin) {
        off = true;
        document.documentElement.classList.remove("no-copy");
      }
    });
    return () => {
      events.forEach((n) => document.removeEventListener(n, block));
      document.documentElement.classList.remove("no-copy");
    };
  }, []);
  return null;
}
