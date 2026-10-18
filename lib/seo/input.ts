import { NextResponse } from "next/server";
import { currentUser } from "../currentUser";
import { isLocale, type Locale } from "./locales";
import { safeHref } from "./sanitize";

// Shared by the admin SEO routes: the admin check and strict input cleaning (anything unexpected becomes null).

export async function seoAdmin() {
  const u = await currentUser();
  return u?.isAdmin ? u : null;
}
export const notFound = () => NextResponse.json({ error: "Not found" }, { status: 404 });
export const bad = (error: string) => NextResponse.json({ error }, { status: 400 });

export const str = (v: unknown, max = 200): string | null => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
export const int = (v: unknown, min: number, max: number): number | null => {
  const n = Number(v);
  return v === null || v === "" || v === undefined || !Number.isInteger(n) || n < min || n > max ? null : n;
};
export const oneOf = <T extends string>(v: unknown, opts: readonly T[]): T | null => (opts.includes(v as T) ? (v as T) : null);
export const strList = (v: unknown, max = 20, len = 80): string[] =>
  (Array.isArray(v) ? v : typeof v === "string" ? v.split(",") : []).map((x) => str(x, len)).filter((x): x is string => !!x).slice(0, max);

export const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export function httpUrl(v: unknown): string | null {
  const s = str(v, 500);
  if (!s) return null;
  try {
    const u = new URL(s);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}
export const isoDay = (v: unknown): string | null => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) ? v : null);
/** A canonical URL: a site path or a full http(s) address. */
export const canonical = (v: unknown): string | null => {
  const s = str(v, 300);
  return s && safeHref(s) && !s.startsWith("#") && !s.startsWith("mailto:") ? s : null;
};
/** The market (language site) a request is about; Italian when missing. */
export const marketOf = (v: unknown): Locale => (isLocale(v) ? v : "it");
