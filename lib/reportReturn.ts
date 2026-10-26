/** Sending a report reader to log in or sign up and bringing them back to the same ISIN, section and scroll position. */
const KEY = "tb_report_return";
const SECTIONS = ["overview", "thesis", "credit", "financials", "protection", "stress", "yield", "sources"];

export function isReportPath(path: string | null | undefined): boolean {
  return /^\/report\/[A-Za-z0-9]{12}\/?$/.test(path ?? "");
}

/** Remember where the reader is (section and scroll) and go to the login or sign-up page with a way back. */
export function goAuth(kind: "login" | "signup"): void {
  const y = Math.round(window.scrollY);
  let id = "overview";
  for (const s of SECTIONS) {
    const el = document.getElementById(s);
    if (el && el.getBoundingClientRect().top <= 130) id = s;
  }
  try { sessionStorage.setItem(KEY, JSON.stringify({ path: location.pathname, y, t: Date.now() })); } catch { /* storage blocked: the section anchor still brings them back */ }
  const next = `${location.pathname}#${id}`;
  location.href = `/${kind}?next=${encodeURIComponent(next)}`;
}

/** On the report page after returning: put the page back to the saved scroll position (once, within 30 minutes). */
export function restoreScroll(): void {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return;
    const v = JSON.parse(raw) as { path: string; y: number; t: number };
    if (v.path !== location.pathname || Date.now() - v.t > 30 * 60_000) return;
    sessionStorage.removeItem(KEY);
    requestAnimationFrame(() => window.scrollTo({ top: v.y, behavior: "instant" as ScrollBehavior }));
  } catch { /* nothing saved */ }
}
