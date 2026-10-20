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
