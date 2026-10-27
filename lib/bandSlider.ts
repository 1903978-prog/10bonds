// Owner decision pending (27/10/2026), the one-line switch:
// true  (B) = the slider only lands on risk-band positions that have a list; a drag onto an empty one moves on to the nearest listed one.
// false (A) = all 30 positions can be picked; an empty one shows "No portfolio for this risk level".
export const SKIP_EMPTY_BANDS = true;

/** The position to land on for a wanted `pos` (coming from `from`): itself if it has a list, else the nearest listed one in the direction of travel, else the other way. */
export function landOn(pos: number, from: number, unavailable: (p: number) => boolean, count: number): number {
  if (!SKIP_EMPTY_BANDS || !unavailable(pos)) return pos;
  const dir = pos >= from ? 1 : -1;
  for (const d of [dir, -dir]) for (let p = pos + d; p >= 1 && p <= count; p += d) if (!unavailable(p)) return p;
  return pos;
}
