"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { GptRating } from "./gptRatings";

// Admin only (the owner, 24/10/2026): GPT's ratings saved in the database (app.gpt_ratings), loaded once per page and
// shared by every bond table on the site (the "GPT rate" column).

export type StoredGpt = GptRating & { at?: string; model?: string | null };
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

/** Reloads the saved ratings from the database (after the provisional values were loaded). */
export function reloadGptRatings() {
  pending = null;
  load();
}

// ---- Calculate button (admin only): asks the model API for one bond's IR and BR ----

export type CalcState = { busy?: boolean; error?: string; missingKey?: boolean };
const NO_CALC: Record<string, CalcState> = {};
let calc: Record<string, CalcState> = NO_CALC;
const calcListeners = new Set<() => void>();
const setCalc = (isin: string, v: CalcState | null) => {
  const next = { ...calc };
  if (v) next[isin] = v; else delete next[isin];
  calc = next;
  calcListeners.forEach((l) => l());
};

/** Calculates one bond; resolves with an error text, or null when saved. One call at a time per ISIN. */
export async function calcGptRating(isin: string): Promise<string | null> {
  if (calc[isin]?.busy) return null;
  setCalc(isin, { busy: true });
  try {
    const r = await fetch("/api/admin/gpt-calc", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isin }) });
    // long answers are streamed (blank keep-alive characters first, then one JSON object with its own status)
    const j = await r.text().then((t) => JSON.parse(t.trim()) as { status?: number; ratings?: Record<string, StoredGpt>; error?: string; answer?: unknown; note?: string; missingKey?: boolean }).catch(() => null);
    if (!r.ok || (j?.status ?? 200) >= 400 || !j?.ratings) {
      const error = j?.error ?? "Calculation failed";
      if (typeof j?.answer === "string") openPopup({ isin, answer: j.answer, error });
      setCalc(isin, { error, missingKey: !!j?.missingKey });
      return error;
    }
    map = j.ratings;
    emit();
    setCalc(isin, null);
    if (bulkDepth === 0) openPopup({ isin, answer: String(j.answer ?? ""), note: j.note });
    return null;
  } catch {
    const error = "No answer from the server";
    setCalc(isin, { error });
    return error;
  }
}

const subscribeCalc = (l: () => void) => { calcListeners.add(l); return () => { calcListeners.delete(l); }; };
export function useGptCalc(): Record<string, CalcState> {
  return useSyncExternalStore(subscribeCalc, () => calc, () => NO_CALC);
}

// The answer window: one per page, opened when a single bond's calculation returns (not during "Calculate all 10").
export type CalcPopup = { isin: string; answer: string; error?: string; note?: string };
let popup: CalcPopup | null = null;
let bulkDepth = 0;
const popupListeners = new Set<() => void>();
function openPopup(p: CalcPopup | null) { popup = p; popupListeners.forEach((l) => l()); }
export const closeCalcPopup = () => openPopup(null);
/** Runs `fn` (a bulk run) without opening one window per bond. */
export async function withoutPopups<T>(fn: () => Promise<T>): Promise<T> {
  bulkDepth++;
  try { return await fn(); } finally { bulkDepth--; }
}
const subscribePopup = (l: () => void) => { popupListeners.add(l); return () => { popupListeners.delete(l); }; };
export function useCalcPopup(): CalcPopup | null {
  return useSyncExternalStore(subscribePopup, () => popup, () => null);
}
