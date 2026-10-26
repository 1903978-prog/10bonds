"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import RiskReturnChart, { type FrontierPoint } from "@/components/RiskReturnChart";
import { SlideCard, actionTitle } from "@/components/LandingCarousel";
import type { LandingText } from "@/lib/landingText";

/**
 * The landing's "Yield vs. Expected Loss" slide (the owner's design, 26/10/2026). The points are the finder's own slider
 * positions for the default search, read from /api/landing/frontier; nothing is invented or smoothed here. While the engine
 * is still working (HTTP 202) the chart area stays empty and the request is retried, so nothing jumps.
 */
export default function YieldLossSlide({ t }: { t: LandingText }) {
  const y = t.carousel.yl;
  const [points, setPoints] = useState<FrontierPoint[] | null>(null);
  const [big, setBig] = useState(false);

  useEffect(() => {
    let stop = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const load = (tries: number) =>
      fetch("/api/landing/frontier").then(async (r) => {
        if (stop) return;
        if (r.status === 202 && tries < 12) { timer = setTimeout(() => load(tries + 1), 2500); return; }
        if (!r.ok) return;
        const b = await r.json();
        if (!stop && Array.isArray(b.points) && b.points.length) setPoints(b.points);
      }).catch(() => {});
    load(0);
    return () => { stop = true; clearTimeout(timer); };
  }, []);

  useEffect(() => {
    if (!big) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setBig(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [big]);

  const chart = (
    <RiskReturnChart points={points ?? []} retLabel={y.y} lossLabel={y.x} ariaLabel={y.alt} detail={y.detail} hint={y.hint} />
  );
  return (
    <SlideCard title={actionTitle(y.title)} sub={y.sub}>
      <div className="mt-1 min-h-0 flex-1 rounded-[12px] border border-[#e3ebe7] p-2" data-testid="yield-loss-chart">
        {points ? chart : <p className="grid h-full place-items-center text-[12px] text-[#52666F]">{y.load}</p>}
      </div>
      <button type="button" onClick={() => points && setBig(true)} className="mt-1.5 self-start text-[12px] font-medium text-[#127052] underline underline-offset-2" data-testid="yield-loss-enlarge">{y.enlarge}</button>
      <div className="mt-2 shrink-0 rounded-[10px] bg-[#EDF6F1] px-3 py-2 text-[12px] leading-snug text-[#132D3B] sm:text-[13px]">
        <span className="block text-[10px] font-bold uppercase tracking-[0.08em] text-[#127052]">{y.k}</span>
        {y.insight}
      </div>
      <p className="mt-1.5 shrink-0 text-[10.5px] leading-snug text-[#52666F]">{y.foot}</p>
      {big && points && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3" role="dialog" aria-modal="true" onClick={() => setBig(false)} data-testid="yield-loss-modal">
          <div className="flex h-[min(80vh,640px)] w-full max-w-[920px] flex-col rounded-[18px] bg-white p-4" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 flex items-center justify-between gap-3">
              <h3 className="text-[18px] font-bold" style={{ color: "#112D3B" }}>{y.title[0]}</h3>
              <button type="button" onClick={() => setBig(false)} className="rounded-full border border-[#e3ebe7] px-3 py-1 text-[13px]">{y.close}</button>
            </div>
            <div className="min-h-0 flex-1">{chart}</div>
          </div>
        </div>,
        document.body,
      )}
    </SlideCard>
  );
}
