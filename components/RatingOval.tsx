import { riskColor } from "@/components/RiskBadge";

/** Highlight block at the top of a country or company page: tile, name, the 10bonds.com rating in an oval, and the 1-10 scale. */
export default function RatingHeader({ tile, name, sub, score, risk }: { tile: string; name: string; sub: string; score: number; risk: number }) {
  return (
    <section className="rounded-2xl bg-white px-4 py-3" data-testid="rating-header">
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-ink text-[13px] font-bold tracking-widest text-white">{tile}</span>
        <div className="min-w-0">
          <h2 className="truncate text-[17px] font-semibold leading-tight">{name}</h2>
          <p className="truncate text-[12px] text-mute">{sub}</p>
        </div>
      </div>
      <div className="mt-2.5 flex items-center justify-between">
        <span className="text-[13px] text-mute">10bonds.com rating</span>
        <span data-testid="rating-oval" aria-label={`10bonds.com rating ${score} out of 100`} className="flex h-9 min-w-[72px] items-center justify-center rounded-[999px] px-4 text-[22px] font-bold leading-none tabular-nums text-white" style={{ background: riskColor(risk) }}>{score}</span>
      </div>
      <div className="mt-2 flex gap-1" aria-hidden>
        {Array.from({ length: 10 }, (_, i) => {
          const c = riskColor(i + 1);
          return <span key={i} className="h-1.5 flex-1 rounded-full" style={{ background: c, opacity: i + 1 === risk ? 1 : 0.2 }} />;
        })}
      </div>
      <div className="mt-0.5 flex justify-between text-[10px] text-mute"><span>1 (lowest risk)</span><span>10</span></div>
    </section>
  );
}
