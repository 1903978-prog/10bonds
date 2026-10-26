// Shared building blocks for the research-dashboard look (light grey page, white bordered cards, underline tabs, outlined pills).
import type { ReactNode } from "react";

/** White bordered card with a regular-weight title and an optional right-hand slot. */
export function Card({ title, aside, children, className = "" }: { title?: ReactNode; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-lg border border-line bg-white p-5 ${className}`}>
      {(title || aside) && (
        <div className="mb-3 flex items-center justify-between gap-3">
          {title && <h2 className="text-xl font-normal tracking-tight text-ink">{title}</h2>}
          {aside}
        </div>
      )}
      {children}
    </section>
  );
}

/** Underline tabs: the active one is blue with a blue line. */
export function Tabs<T extends string>({ items, value, onChange, label }: { items: [T, string][]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="flex gap-6 border-b border-line text-sm">
      {items.map(([k, text]) => (
        <button key={k} type="button" role="tab" aria-selected={value === k} onClick={() => onChange(k)}
          className={`-mb-px border-b-2 px-1 py-2.5 ${value === k ? "border-accent text-accent" : "border-transparent text-mute hover:text-ink"}`}>{text}</button>
      ))}
    </div>
  );
}

/** Row of pill buttons, e.g. timeframes; the selected pill is outlined in blue. */
export function PillGroup<T extends string>({ items, value, onChange, label }: { items: [T, string][]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {items.map(([k, text]) => (
        <button key={k} type="button" role="radio" aria-checked={value === k} onClick={() => onChange(k)}
          className={`rounded-full px-3.5 py-1 text-sm ${value === k ? "bg-soft text-accent ring-1 ring-accent" : "bg-canvas text-ink hover:bg-line/60"}`}>{text}</button>
      ))}
    </div>
  );
}

/** Small grey label above a bold value. */
export function DataRow({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div>
      <div className="text-xs text-mute">{label}</div>
      <div className="text-[15px] font-semibold tabular-nums">{value}</div>
    </div>
  );
}
