"use client";

import type { EventKind } from "./trackRules";

// Usage stats run only after the visitor says yes. Nothing is sent, and no id is created, before that.
const CONSENT_KEY = "tb_consent";
const VISITOR_KEY = "tb_vid";
type Consent = "yes" | "no" | null;

function store(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function getConsent(): Consent {
  const v = store()?.getItem(CONSENT_KEY);
  return v === "yes" || v === "no" ? v : null;
}

export function setConsent(c: "yes" | "no") {
  const s = store();
  s?.setItem(CONSENT_KEY, c);
  if (c === "no") {
    s?.removeItem(VISITOR_KEY);
    queue.length = 0;
  }
  window.dispatchEvent(new Event("tb-consent"));
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

export function track(kind: EventKind, detail: Record<string, unknown> | null) {
  if (typeof window === "undefined" || getConsent() !== "yes") return;
  queue.push({ kind, path: window.location.pathname, detail });
  timer ??= setTimeout(flushNow, 5000);
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
