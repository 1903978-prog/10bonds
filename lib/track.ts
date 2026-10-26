"use client";

import type { EventKind } from "./trackRules";

// Cookie consent by category. Usage stats (Statistics) run only after the visitor allows them:
// nothing is sent, and no visitor id is created, before that.
const CONSENT_KEY = "tb_cookie_consent";
const OLD_KEY = "tb_consent";
const VISITOR_KEY = "tb_vid";

export type Categories = { preferences: boolean; statistics: boolean; marketing: boolean };
type Consent = "yes" | "no" | null;

function store(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** The choice made in the cookie banner, or null when none has been made yet. */
export function getCategories(): Categories | null {
  const s = store();
  if (!s) return null;
  try {
    const v = JSON.parse(s.getItem(CONSENT_KEY) ?? "null");
    if (v && typeof v === "object") return { preferences: v.preferences === true, statistics: v.statistics === true, marketing: v.marketing === true };
  } catch {}
  const old = s.getItem(OLD_KEY); // the earlier Allow / No thanks banner
  if (old === "yes" || old === "no") return { preferences: false, statistics: old === "yes", marketing: false };
  return null;
}

/** Statistics consent: "yes", "no", or null when the visitor has not chosen yet. */
export function getConsent(): Consent {
  const c = getCategories();
  return c ? (c.statistics ? "yes" : "no") : null;
}

export function setCategories(c: Categories) {
  const s = store();
  s?.setItem(CONSENT_KEY, JSON.stringify({ ...c, necessary: true, at: new Date().toISOString() }));
  s?.removeItem(OLD_KEY);
  if (!c.statistics) {
    s?.removeItem(VISITOR_KEY);
    queue.length = 0;
  } else if (queue.length) timer ??= setTimeout(flushNow, 1000);
  window.dispatchEvent(new Event("tb-consent"));
}

export function reopenCookieBanner() {
  window.dispatchEvent(new Event("tb-cookie-open"));
}

function visitorId(): string | null {
  const s = store();
  if (!s) return null;
  let id = s.getItem(VISITOR_KEY);
  if (!id) {
    id = crypto.randomUUID();
    s.setItem(VISITOR_KEY, id);
  }
  return id;
}

const queue: { kind: EventKind; path: string; detail: Record<string, unknown> | null }[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

/** phone / tablet / desktop, from the window width (no personal data). */
export function deviceClass(): "phone" | "tablet" | "desktop" {
  const w = window.innerWidth;
  return w < 640 ? "phone" : w < 1024 ? "tablet" : "desktop";
}

// Before the visitor answers the cookie banner, events wait in this page's memory only: nothing is sent or stored.
// They go out if Statistics are allowed, and are dropped if not.
export function track(kind: EventKind, detail: Record<string, unknown> | null) {
  if (typeof window === "undefined") return;
  const consent = getConsent();
  if (consent === "no" || (consent === null && (kind === "click" || queue.length >= 30))) return;
  queue.push({ kind, path: window.location.pathname, detail: { ...detail, device: deviceClass() } });
  if (consent === "yes") timer ??= setTimeout(flushNow, 5000);
}

/** A funnel step, sent at most once per page load. */
const sent = new Set<string>();
export function trackOnce(kind: EventKind, detail: Record<string, unknown> | null = null) {
  if (sent.has(kind)) return;
  sent.add(kind);
  track(kind, detail);
}

export function flushNow() {
  if (timer) clearTimeout(timer);
  timer = null;
  if (queue.length === 0 || getConsent() !== "yes") return;
  const id = visitorId();
  if (!id) return;
  const body = JSON.stringify({ visitorId: id, events: queue.splice(0, 30) });
  const blob = new Blob([body], { type: "application/json" });
  if (!navigator.sendBeacon?.("/api/events", blob)) {
    fetch("/api/events", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => {});
  }
}
