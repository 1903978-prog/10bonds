"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { BundPt } from "./bundSpread";

// Admin only: the Bund curve (and its date), loaded once per page and shared by every bond table's "Spread" column.

export type BundData = { asOf: string | null; points: BundPt[] };
const EMPTY: BundData = { asOf: null, points: [] };
let data: BundData = EMPTY;
let pending: Promise<void> | null = null;
const listeners = new Set<() => void>();

function load() {
  pending ??= fetch("/api/admin/bund-curve", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : null))
    .then((j) => { if (j?.points) { data = j; listeners.forEach((l) => l()); } })
    .catch(() => {});
}

const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

export function useBund(): BundData {
  useEffect(() => { load(); }, []);
  return useSyncExternalStore(subscribe, () => data, () => EMPTY);
}
