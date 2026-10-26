"use client";

import { useEffect } from "react";
import { flushNow, trackOnce } from "@/lib/track";
import type { EventKind } from "@/lib/trackRules";

/** Records one funnel step when this part of a page is shown (consented statistics only; nothing is sent otherwise). */
export default function TrackView({ kind, detail = null, flush = false }: { kind: EventKind; detail?: Record<string, string | number | boolean | null> | null; flush?: boolean }) {
  useEffect(() => {
    trackOnce(kind, detail);
    if (flush) flushNow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);
  return null;
}
