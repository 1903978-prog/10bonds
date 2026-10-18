"use client";

export type Me = {
  email: string;
  username: string | null;
  plan: "free" | "plus" | "premium";
  storedPlan: "free" | "plus" | "premium";
  premiumUntil: string | null;
  emailVerified: boolean;
  isAdmin: boolean;
  confirmationOn: boolean;
} | null;

let pending: Promise<Me> | null = null;
/** One /api/auth/me call per page load, shared by every component that needs it. */
export function loadMe(): Promise<Me> {
  pending ??= fetch("/api/auth/me", { cache: "no-store" }).then((r) => r.json()).catch(() => null);
  return pending;
}

export function trialDaysLeft(me: Me, now = Date.now()): number | null {
  if (!me?.premiumUntil || me.storedPlan === "premium") return null;
  const ms = new Date(me.premiumUntil).getTime() - now;
  return ms > 0 ? Math.ceil(ms / 86400_000) : null;
}

export const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
