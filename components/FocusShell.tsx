import Link from "next/link";
import type { ReactNode } from "react";
import FocusTabs from "@/components/FocusTabs";
import RatingHeader from "@/components/RatingOval";

export const card = "overflow-hidden rounded-2xl bg-white";
export const head = "px-3 pb-1 pt-2.5 text-[11px] font-semibold uppercase tracking-wide text-mute";

export type FocusNavItem = { key: string; href: string; label: string; current: boolean; locked: boolean; free?: boolean };

/** One layout for country and company pages: tabs, picker, rating highlight, snapshot line, then the cards (or the paid-plan lock). */
export default function FocusShell({ kind, testId, nav, paid, header, snapshot, open, lockedTitle, lockedText, children }: {
  kind: "companies" | "countries";
  testId: string;
  nav: FocusNavItem[];
  paid: boolean;
  header: { tile: string; name: string; sub: string; score: number; risk: number };
  snapshot: { title: ReactNode; text: string };
  open: boolean;
  lockedTitle: string;
  lockedText: string;
  children: ReactNode;
}) {
  return (
    <article className="mx-auto max-w-6xl" data-testid={testId}>
      <div className="mt-1 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{kind === "countries" ? "Countries" : "Companies"} in focus</h1>
        <FocusTabs active={kind} />
        <p className="text-[12px] text-mute">Free plan: one full example. <Link href="/pricing" className="text-accent hover:underline">Paid plans</Link> have access to all scorings.</p>
      </div>
      <nav className="mt-2 flex flex-wrap gap-1.5 text-[12px]" aria-label={kind === "countries" ? "Countries" : "Companies"}>
        {nav.map((x) => (
          <Link key={x.key} href={x.href} data-testid={kind === "countries" ? "country-tab" : "focus-tab"}
            className={`rounded-full px-2.5 py-0.5 ${x.current ? "bg-ink text-white" : "bg-white text-ink shadow-[0_1px_6px_rgba(0,0,0,0.06)] hover:bg-line/40"}`}>
            {x.label}{!paid && x.locked ? " 🔒" : x.free && !paid ? " · free" : ""}
          </Link>
        ))}
      </nav>
      <div className="mt-2"><RatingHeader {...header} /></div>
      <section className={`${card} mt-2 px-4 py-2.5`}>
        <p className="text-[15px] font-semibold leading-tight">{snapshot.title}</p>
        <p className="mt-0.5 text-[12px] leading-snug text-mute">{snapshot.text}</p>
      </section>
      {open ? children : (
        <section className={`${card} mt-3 px-4 py-6 text-center`} data-testid="focus-locked">
          <p className="text-[15px] font-medium">{lockedTitle}</p>
          <p className="mt-1 text-[12px] text-mute">{lockedText}</p>
          <Link href="/pricing" className="mt-3 inline-block rounded-full bg-accent px-5 py-2 text-[13px] font-medium text-white">See plans</Link>
        </section>
      )}
    </article>
  );
}
