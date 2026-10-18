/** Usage events the site records (only with the visitor's consent). Shared by browser and server. */
export const EVENT_KINDS = ["page_view", "search", "click", "signup", "login"] as const;
export type EventKind = (typeof EVENT_KINDS)[number];

export type IncomingEvent = { kind: EventKind; path: string | null; detail: Record<string, string | number | boolean | null> | null };

const VISITOR_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Validate a batch from the browser. Anything unexpected is dropped, never stored. */
export function parseEventBatch(body: unknown): { visitorId: string; events: IncomingEvent[] } | null {
  if (!body || typeof body !== "object") return null;
  const b = body as { visitorId?: unknown; events?: unknown };
  if (typeof b.visitorId !== "string" || !VISITOR_ID.test(b.visitorId) || !Array.isArray(b.events)) return null;
  const events: IncomingEvent[] = [];
  for (const raw of b.events.slice(0, 30)) {
    if (!raw || typeof raw !== "object") continue;
    const e = raw as { kind?: unknown; path?: unknown; detail?: unknown };
    if (!EVENT_KINDS.includes(e.kind as EventKind)) continue;
    const path = typeof e.path === "string" && e.path.startsWith("/") ? e.path.split(/[?#]/)[0].slice(0, 200) : null;
    let detail: IncomingEvent["detail"] = null;
    if (e.detail && typeof e.detail === "object" && !Array.isArray(e.detail)) {
      detail = {};
      for (const [k, v] of Object.entries(e.detail).slice(0, 10)) {
        if (!/^[a-z_]{1,30}$/.test(k)) continue;
        if (typeof v === "number" && Number.isFinite(v)) detail[k] = v;
        else if (typeof v === "boolean" || v === null) detail[k] = v;
        else if (typeof v === "string") detail[k] = v.slice(0, 100);
      }
    }
    events.push({ kind: e.kind as EventKind, path, detail });
  }
  return { visitorId: b.visitorId, events };
}
