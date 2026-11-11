// Small in-memory limit for sign-in and sign-up attempts (one machine).
const hits = new Map<string, number[]>();

export function allow(key: string, max = 10, windowMs = 15 * 60_000, now = Date.now()): boolean {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) hits.clear();
  return true;
}

export function clientIp(req: Request): string {
  return req.headers.get("fly-client-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

/** True when `key` already has `max` or more recorded hits in the window. Records nothing. */
export function blocked(key: string, max: number, windowMs = 15 * 60_000, now = Date.now()): boolean {
  return (hits.get(key) ?? []).filter((t) => now - t < windowMs).length >= max;
}

/** Records one hit (a failed sign-in) without checking the limit. */
export function record(key: string, now = Date.now()): void {
  const list = hits.get(key) ?? [];
  list.push(now);
  hits.set(key, list);
}

/** Forgets the hits for a key (a correct sign-in, or a password reset by e-mail link, unlocks the account). */
export function clearHits(key: string): void {
  hits.delete(key);
}
