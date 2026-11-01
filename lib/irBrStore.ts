"use client";

import { useEffect, useState } from "react";

export type IrBr = { ir: string | null; br: string | null };
const seen = new Map<string, IrBr | null>();

/** Stored IR and BR for these ISINs (public endpoint, only what is saved in the database); null = none saved. */
export function useIrBr(isins: (string | null | undefined)[]): Record<string, IrBr | null> {
  const key = isins.filter((s): s is string => !!s).sort().join(",");
  const [, bump] = useState(0);
  useEffect(() => {
    const need = key.split(",").filter((i) => i && !seen.has(i));
    if (!need.length) return;
    let live = true;
    fetch(`/api/ir-br?isins=${need.join(",")}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!live || !j?.ratings) return;
        for (const i of need) seen.set(i, j.ratings[i] ?? null);
        bump((n) => n + 1);
      })
      .catch(() => {});
    return () => { live = false; };
  }, [key]);
  return Object.fromEntries(key.split(",").filter(Boolean).map((i) => [i, seen.get(i) ?? null]));
}
