"use client";

import type { ReactNode } from "react";

// Small shared pieces for the SEO admin screens, in the same style as the main admin page.

export const card = "rounded-[24px] bg-white p-5 sm:p-6";
export const input = "mt-1 w-full rounded-xl border border-line bg-white px-3 py-2 text-sm";
export const btn = "rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-[#0077ed] disabled:opacity-60";
export const btnLight = "rounded-full bg-canvas px-4 py-2 text-sm font-medium hover:bg-line disabled:opacity-60";

export const day = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";
export const when = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
export const num = (n: number | null | undefined, d = 0) => (n === null || n === undefined ? "—" : n.toLocaleString("en-GB", { maximumFractionDigits: d, minimumFractionDigits: d }));

/** JSON call to an admin route; throws the route's own error message. */
export async function api<T = unknown>(url: string, body?: unknown, method?: string): Promise<T> {
  const r = await fetch(url, body === undefined && !method ? { cache: "no-store" } : { method: method ?? "POST", headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error ?? `Request failed (${r.status})`);
  return j as T;
}

const TONES = {
  green: "bg-green-50 text-green-800",
  amber: "bg-amber-50 text-amber-800",
  red: "bg-red-50 text-red-800",
  gray: "bg-canvas text-mute",
  blue: "bg-blue-50 text-blue-800",
  purple: "bg-purple-50 text-purple-800",
};
export function Badge({ tone = "gray", children }: { tone?: keyof typeof TONES; children: ReactNode }) {
  return <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ${TONES[tone]}`}>{children}</span>;
}

export const STATUS_LABEL: Record<string, [string, keyof typeof TONES]> = {
  verified: ["Verified (automatic)", "green"],
  manual: ["Manual", "blue"],
  override: ["Manual override", "purple"],
  needs_review: ["Needs review", "amber"],
  not_assessed: ["Not assessed", "gray"],
};

export function Field({ label, children, hint, wide }: { label: string; children: ReactNode; hint?: string; wide?: boolean }) {
  return (
    <label className={`block text-sm ${wide ? "sm:col-span-2" : ""}`}>
      <span className="font-medium">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-mute">{hint}</span>}
    </label>
  );
}

export function ErrorNote({ error }: { error: string | null }) {
  return error ? <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p> : null;
}

export function Table({ head, children, min = "34rem" }: { head: ReactNode[]; children: ReactNode; min?: string }) {
  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full text-left text-sm" style={{ minWidth: min }}>
        <thead className="text-xs text-mute">
          <tr>{head.map((h, i) => <th key={i} className="py-2 pr-3 font-medium">{h}</th>)}</tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

/** Numbered steps with full links, for setup the admin has to do outside the site. */
export function Steps({ steps }: { steps: { text: string; url?: string }[] }) {
  return (
    <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
      {steps.map((s) => (
        <li key={s.text}>
          {s.text}
          {s.url && <> <a href={s.url} target="_blank" rel="noopener noreferrer" className="break-all text-accent">{s.url}</a></>}
        </li>
      ))}
    </ol>
  );
}
