import type { BondFilter } from "./bondFilter";
import { TERMS } from "./limits";
import { SLIDER_POSITIONS } from "./sliderPortfolios";

// The finder's choices kept across sign-up (the owner, 24/10/2026): saved in this browser when a visitor opens
// sign-up or sign-in from a result, read back once the account is open. Only slider choices, nothing personal.
const RESUME_KEY = "tb_resume";
export const RESUME_MS = 60 * 60 * 1000;
export type Resume = { duration: number; mix: number; currency: BondFilter["currency"]; size: BondFilter["size"]; mode: "portfolio" | "single"; sheet: boolean };

export function writeResume(r: Resume) {
  try { window.localStorage.setItem(RESUME_KEY, JSON.stringify({ ...r, at: Date.now() })); } catch {}
}

export function clearResume() {
  try { window.localStorage.removeItem(RESUME_KEY); } catch {}
}

export function readResume(): Resume | null {
  try {
    return parseResume(window.localStorage.getItem(RESUME_KEY), Date.now());
  } catch {
    return null;
  }
}

/** The saved choices, or null when missing, older than an hour or not valid values. */
export function parseResume(raw: string | null, now: number): Resume | null {
  let v;
  try {
    v = JSON.parse(raw ?? "null");
  } catch {
    return null;
  }
  if (!v || typeof v !== "object" || typeof v.at !== "number" || now - v.at > RESUME_MS || now < v.at) return null;
  if (!TERMS.some((x) => x.duration === v.duration)) return null;
  if (!Number.isInteger(v.mix) || v.mix < 1 || v.mix > SLIDER_POSITIONS) return null;
  if (v.currency !== "EUR" && v.currency !== "USD") return null;
  if (v.size !== "1k" && v.size !== "100k") return null;
  return { duration: v.duration, mix: v.mix, currency: v.currency, size: v.size, mode: v.mode === "single" ? "single" : "portfolio", sheet: v.sheet === true };
}
