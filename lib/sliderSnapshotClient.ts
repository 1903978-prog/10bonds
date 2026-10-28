import { TERMS } from "./limits";
import type { SliderPosition } from "./sliderPortfolios";

// Browser side of the 90-position snapshot: one read-only request brings all three terms, kept in memory; moving the slider or switching term
// only reads from it. An open page re-asks (cheap 304 while nothing changed) when the tab comes back to the front, never in a polling loop.

type Snap = { id: number; dataAsOf: string | null; horizons: Record<"short" | "mid" | "long", SliderPosition[]> };
const store = new Map<string, { snap: Snap | null; etag: string | null; at: number }>();
const waiting = new Map<string, Promise<Snap | null>>();
const FRESH_MS = 60_000;

export const termKeyOf = (duration: number) => TERMS.find((t) => t.duration === duration)?.key ?? null;
/** The positions of a term from memory, or null when no snapshot is loaded (or none is published). */
export function snapshotPositions(currency: string, size: string, duration: number): SliderPosition[] | null {
  const k = termKeyOf(duration);
  return k ? store.get(`${currency}:${size}`)?.snap?.horizons[k] ?? null : null;
}

/** Loads (or re-validates) the snapshot for a filter. Null = none published, the caller uses the older path. */
export function loadSnapshot(currency: string, size: string, force = false): Promise<Snap | null> {
  const key = `${currency}:${size}`;
  const hit = store.get(key);
  if (hit && !force && Date.now() - hit.at < FRESH_MS) return Promise.resolve(hit.snap);
  const run = waiting.get(key);
  if (run) return run;
  const p = fetch(`/api/slider-snapshot?${new URLSearchParams({ currency, size })}`, { headers: hit?.etag ? { "If-None-Match": hit.etag } : {} })
    .then(async (r) => {
      if (r.status === 304 && hit) { hit.at = Date.now(); return hit.snap; }
      if (r.status === 404) { store.set(key, { snap: null, etag: null, at: Date.now() }); return null; }
      if (!r.ok) return hit?.snap ?? null;
      const snap = (await r.json()) as Snap;
      store.set(key, { snap, etag: r.headers.get("ETag"), at: Date.now() });
      return snap;
    })
    .catch(() => hit?.snap ?? null)
    .finally(() => waiting.delete(key));
  waiting.set(key, p);
  return p;
}
