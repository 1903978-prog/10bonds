"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { GptRating } from "./gptRatings";

// Admin only (the owner, 24/10/2026): GPT's ratings saved in the database (app.gpt_ratings), loaded once per page and
// shared by every bond table on the site (the "GPT rate" column).

export type StoredGpt = GptRating & { at?: string };
const EMPTY: Record<string, StoredGpt> = {};
let map: Record<string, StoredGpt> = EMPTY;
let pending: Promise<void> | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function load() {
  pending ??= fetch("/api/admin/gpt-ratings", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : null))
    .then((j) => { if (j?.ratings) { map = j.ratings; emit(); } })
    .catch(() => {});
}

/** Saves GPT's parsed answer; true when the database took it. */
export async function saveGptRatings(ratings: Record<string, GptRating>): Promise<boolean> {
  const r = await fetch("/api/admin/gpt-ratings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ratings }) }).catch(() => null);
  const j = r?.ok ? await r.json().catch(() => null) : null;
  if (!j?.ratings) return false;
  map = j.ratings;
  emit();
  return true;
}

const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

/** ISIN -> GPT rating; loads from the database the first time an admin table asks (`on` false: nothing is fetched). */
export function useGptRatings(on = true): Record<string, StoredGpt> {
  useEffect(() => { if (on) load(); }, [on]);
  return useSyncExternalStore(subscribe, () => (on ? map : EMPTY), () => EMPTY);
}
