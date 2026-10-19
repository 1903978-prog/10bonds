"use client";

import { useRef, useState } from "react";
import type { Block, Section } from "@/lib/methodDoc";

/** One methodology document: Apple-style section list on the left, one section at a time on the right. */
export function MethodBlocks({ blocks }: { blocks: Block[] }) {
  let step = 0;
  return (
    <>
      {blocks.map((b, i) => {
        switch (b.t) {
          case "p":
            return <p key={i} className="mt-2 text-[13px] leading-relaxed">{b.text}</p>;
          case "formula":
            return <p key={i} className="mt-2 break-words rounded-lg bg-canvas px-3 py-1.5 font-mono text-[12px]">{b.text}</p>;
          case "ol":
          case "ul": {
            const L = b.t === "ol" ? "ol" : "ul";
            return (
              <L key={i} className={`mt-2 space-y-1 pl-5 text-[13px] leading-relaxed ${b.t === "ol" ? "list-decimal" : "list-disc"}`}>
                {b.items.map((x, j) => <li key={j}>{x}</li>)}
              </L>
            );
          }
          case "table":
            return (
              <div key={i} className="mt-3 overflow-x-auto rounded-xl border border-line/70">
                <table className="w-full text-left text-[12px] leading-snug">
                  <thead className="bg-canvas text-[10.5px] uppercase tracking-wide text-mute">
                    <tr>{b.head.map((h, j) => <th key={j} className="px-3 py-1.5 font-semibold">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-line/60">
                    {b.rows.map((r, j) => (
                      <tr key={j}>{r.map((c, k) => <td key={k} className={`px-3 py-1.5 align-top ${k === 0 ? "font-medium" : "text-ink/80"}`}>{c}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          case "flow":
            return (
              <div key={i} className="mt-2 flex items-center gap-3 rounded-xl bg-canvas px-3 py-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-[12px] font-semibold">{b.title[0]}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium">{b.title.slice(3)}</p>
                  <p className="text-[12px] text-mute">{b.text}</p>
                </div>
                {b.score && <span className="shrink-0 rounded-full bg-ink px-2.5 py-0.5 text-[11px] font-semibold text-white">{b.score}</span>}
              </div>
            );
          case "pillar":
            return <PillarRow key={i} name={b.name} weight={b.weight} parts={b.parts} />;
          case "step":
            step++;
            return (
              <div key={i} className="mt-2 flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-semibold text-white">{step}</span>
                <p className="text-[13px] leading-relaxed"><span className="font-medium">Stage {step} — {b.title}. </span>{b.text}</p>
              </div>
            );
          case "stress":
            return <StressRow key={i} name={b.name} base={b.base} stressed={b.stressed} />;
        }
      })}
    </>
  );
}

/** A pillar of the corporate base score: name, weight, and a long pill filled in proportion to its weight. */
export function PillarRow({ name, weight, parts, max = 35 }: { name: string; weight: number; parts: string; max?: number }) {
  return (
    <div className="mt-2 rounded-xl bg-canvas px-3 py-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <p className="w-full truncate text-[13px] font-medium sm:w-56 sm:shrink-0">{name}</p>
        <div className="h-3 flex-1 rounded-full bg-white">
          <div className="h-3 rounded-full bg-accent/80" style={{ width: `${(weight / max) * 100}%` }} />
        </div>
        <span className="w-10 shrink-0 text-right text-[13px] font-semibold tabular-nums">{weight}%</span>
      </div>
      <p className="mt-1 text-[11px] leading-snug text-mute">{parts}</p>
    </div>
  );
}

/** Base score and stressed score on one 0..100 pill, joined by the fall. */
export function StressRow({ name, base, stressed }: { name: string; base: number; stressed: number }) {
  return (
    <div className="mt-2 flex items-center gap-3">
      <p className="w-28 shrink-0 text-[12px] font-medium">{name}</p>
      <div className="relative h-3 flex-1 rounded-full bg-gradient-to-r from-[#fde4e4] via-[#fff1dc] to-[#dcf3e3]">
        <div className="absolute inset-y-0 left-[6px] right-[6px]">
          <div className="absolute top-1/2 h-0.5 -translate-y-1/2 bg-ink/40" style={{ left: `${stressed}%`, width: `${base - stressed}%` }} />
          <span className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink ring-2 ring-white" style={{ left: `${base}%` }} title={`Base ${base}`} />
          <span className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#dc2626] ring-2 ring-white" style={{ left: `${stressed}%` }} title={`Stress ${stressed}`} />
        </div>
      </div>
      <span className="w-20 shrink-0 text-right text-[12px] tabular-nums text-mute">{base} → <span className="font-semibold text-[#dc2626]">{stressed}</span></span>
    </div>
  );
}

export default function MethodDoc({ sections }: { sections: Section[] }) {
  const [active, setActive] = useState(0);
  const [tab, setTab] = useState(0);
  const panel = useRef<HTMLElement>(null);
  const s = sections[active];
  // A section made of many tables (the corporate risk universe) shows one table at a time behind segmented tabs.
  const tabbed = s.subs.length >= 5 && s.subs.every((x) => x.blocks.some((b) => b.t === "table"));
  const pick = (i: number) => {
    setActive(i);
    setTab(0);
    panel.current?.scrollTo({ top: 0 });
  };
  return (
    <div className="mt-4 grid gap-4 lg:grid-cols-[230px_1fr]">
      <nav aria-label="Sections" className="flex gap-1 overflow-x-auto rounded-2xl bg-white p-1.5 shadow-[0_2px_20px_rgba(0,0,0,0.04)] lg:block lg:space-y-0.5 lg:self-start">
        {sections.map((x, i) => (
          <button
            key={x.title}
            type="button"
            onClick={() => pick(i)}
            aria-current={i === active ? "true" : undefined}
            className={`block shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-left text-[13px] lg:w-full lg:whitespace-normal lg:leading-snug ${i === active ? "bg-canvas font-medium text-ink" : "text-mute hover:text-ink"}`}
          >
            {x.title}
          </button>
        ))}
      </nav>
      <section ref={panel} className="rounded-2xl bg-white p-5 shadow-[0_2px_20px_rgba(0,0,0,0.04)] lg:h-[calc(100vh-235px)] lg:min-h-[420px] lg:overflow-y-auto" aria-live="polite">
        <h2 className="text-lg font-semibold tracking-tight">{s.title}</h2>
        <MethodBlocks blocks={s.intro} />
        {tabbed ? (
          <>
            <div role="tablist" className="mt-3 flex flex-wrap gap-1 rounded-xl bg-canvas p-1">
              {s.subs.map((x, i) => (
                <button key={x.title} type="button" role="tab" aria-selected={i === tab} onClick={() => setTab(i)} className={`rounded-lg px-2.5 py-1 text-[12px] ${i === tab ? "bg-white font-medium shadow-sm" : "text-mute hover:text-ink"}`}>
                  {x.title}
                </button>
              ))}
            </div>
            <MethodBlocks blocks={s.subs[tab].blocks} />
          </>
        ) : (
          s.subs.map((x) => (
            <div key={x.title}>
              <h3 className="mt-5 text-[14px] font-semibold">{x.title}</h3>
              <MethodBlocks blocks={x.blocks} />
            </div>
          ))
        )}
      </section>
    </div>
  );
}
