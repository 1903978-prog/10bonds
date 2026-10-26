/** Usage events the site records (only with the visitor's consent). Shared by browser and server. */
// "signup" = registration completed. The sign-up funnel (the owner, 24/10/2026): landing_view, cta_click (the landing button),
// finder_started (first control moved), portfolio_generated, preview_view (a visitor sees the 3-bond preview),
// signup_started (first field of the sign-up form), signup, email_verified, plan_selected (a paid plan's button).
export const EVENT_KINDS = ["page_view", "search", "click", "signup", "login", "landing_view", "cta_click", "finder_started", "portfolio_generated", "preview_view", "signup_started", "email_verified", "plan_selected", "consent_box", "pricing_viewed", "limit_reached", "upgrade_click", "checkout_started", "paid", "pro_page_view", "pro_demo_view", "pro_request_sent"] as const;

/** The funnel steps in order, for the admin page. */
// consent_box = the first-use agreement ticked in the portfolio builder; pricing_viewed / plan_selected / checkout_started /
// paid follow the plans page (paid = the thank-you page after Stripe); limit_reached / upgrade_click = free-limit prompts;
// pro_* = the wealth-manager page, its demo and a verification request.
export const FUNNEL = ["landing_view", "cta_click", "finder_started", "portfolio_generated", "consent_box", "preview_view", "signup_started", "signup", "email_verified", "pricing_viewed", "plan_selected", "checkout_started", "paid"] as const satisfies readonly EventKind[];
/** Labels for the admin funnel page. */
export const FUNNEL_LABEL: Record<string, string> = {
  landing_view: "Landing page", cta_click: "Start button", finder_started: "Tool used", portfolio_generated: "Result shown", consent_box: "Agreement box ticked",
  preview_view: "Preview seen", signup_started: "Sign-up started", signup: "Account created", email_verified: "E-mail confirmed", pricing_viewed: "Plans viewed",
  plan_selected: "Plan chosen", checkout_started: "Checkout opened", paid: "Paid (thank-you page)",
  limit_reached: "Free limit reached", upgrade_click: "Upgrade clicked", pro_page_view: "Pro page viewed", pro_demo_view: "Pro demo viewed", pro_request_sent: "Pro verification sent",
};
export const FUNNEL_EXTRA = ["limit_reached", "upgrade_click", "pro_page_view", "pro_demo_view", "pro_request_sent"] as const satisfies readonly EventKind[];
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
