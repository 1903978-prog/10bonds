"use client";

import { HEAT_METHODS, type HeatMap, type HeatMethod } from "@/lib/heatMapGrid";

/** Colour bands of expected loss on your money (%): dark green up to 0.1%, lighter greens, yellow, orange, dark red. */
const BANDS: { to: number; bg: string; fg: string }[] = [
  { to: 0.1, bg: "#1b6e33", fg: "#fff" },
  { to: 0.2, bg: "#2e8b45", fg: "#fff" },
  { to: 0.35, bg: "#55a95f", fg: "#fff" },
  { to: 0.5, bg: "#8cc782", fg: "#1d1d1f" },
  { to: 0.75, bg: "#c6e3a9", fg: "#1d1d1f" },
  { to: 1, bg: "#f3e27c", fg: "#1d1d1f" },
  { to: 1.5, bg: "#f6b54e", fg: "#1d1d1f" },
  { to: 2, bg: "#ec7f33", fg: "#fff" },
  { to: 3, bg: "#d2412b", fg: "#fff" },
  { to: Infinity, bg: "#8b1a12", fg: "#fff" },
];

export const bandOf = (loss: number) => BANDS.find((b) => loss <= b.to + 1e-9) ?? BANDS[BANDS.length - 1];

const horizonLabel = (d: number) => (d >= 30 ? "30+" : String(d));

/**
 * Admin only: the expected loss on your money of the best list for each target return (rows, 3.0% at the bottom) and
 * horizon (columns). "–" in grey where that horizon cannot reach that return. The lowest loss of each row is outlined,
 * so the best horizon for a return stands out. Fills the box it is put in; nothing in it changes size with the data.
 */
export default function HeatMapChart({ map: got, method, onMethod, retLabel, yearsLabel }: { map: HeatMap | "unavailable" | null; method: HeatMethod; onMethod: (m: HeatMethod) => void; retLabel: string; yearsLabel: string }) {
  const map = got === "unavailable" ? null : got;
  const rows = map ? map.ytms.map((y, r) => ({ y, cells: map.cells[r] })).reverse() : [];
  const cols = map?.horizons.length ?? 18;
  return (
    <div className="flex h-full w-full flex-col text-[10px] tabular-nums leading-none" data-testid="heat-map">
      {/* Admin (yellow): which methodology the map shows; Methodology 1 is the live one. */}
      <div role="radiogroup" aria-label="Methodology" data-testid="heat-method" className="mb-1.5 grid h-6 w-72 shrink-0 grid-cols-2 rounded-full border border-amber-300 bg-amber-50 p-0.5 text-[11px] font-medium text-amber-900">
        {HEAT_METHODS.map((m) => (
          <button key={m.key} type="button" role="radio" aria-checked={method === m.key} onClick={() => onMethod(m.key)} className={`rounded-full px-2 ${method === m.key ? "bg-white shadow-sm" : ""}`}>
            {m.label}
          </button>
        ))}
      </div>
      {!map ? (
        <div className="flex flex-1 items-center justify-center text-[12px] text-mute">{got === "unavailable" ? "Not available yet for this methodology." : "Preparing heat map…"}</div>
      ) : (
        <div className="flex min-h-0 flex-1">
          {/* Y axis title, written upwards next to the return values like the other charts. */}
          <div className="flex w-4 shrink-0 items-center justify-center text-mute">
            <span className="whitespace-nowrap [writing-mode:vertical-rl] rotate-180">{retLabel} ↑</span>
          </div>
          <div className="grid min-h-0 flex-1 gap-px" style={{ gridTemplateColumns: `2.6rem repeat(${cols}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${rows.length}, minmax(0, 1fr)) 1.1rem` }}>
            {rows.map(({ y, cells }) => {
              const vals = cells.filter((c): c is number => c !== null);
              const min = vals.length ? Math.min(...vals) : null;
              return [
                <div key={`y${y}`} className="flex items-center justify-end pr-1.5 text-mute">{y.toFixed(1)}%</div>,
                ...cells.map((c, i) => {
                  const band = c === null ? null : bandOf(c);
                  const best = c !== null && c === min;
                  return (
                    <div
                      key={`${y}-${i}`}
                      title={`${horizonLabel(map.horizons[i])} ${yearsLabel} · ${y.toFixed(1)}% → ${c === null ? "–" : `${c.toFixed(2)}%`}`}
                      className={`flex items-center justify-center overflow-hidden rounded-[3px] ${best ? "ring-2 ring-inset ring-[#1d1d1f]" : ""}`}
                      style={band ? { background: band.bg, color: band.fg } : { background: "#f2f2f4", color: "#a1a1a6" }}
                      data-testid="heat-cell"
                    >
                      {c === null ? "–" : c.toFixed(2)}
                    </div>
                  );
                }),
              ];
            })}
            <div className="flex items-center justify-end pr-1.5 text-mute">{yearsLabel}</div>
            {map.horizons.map((d) => (
              <div key={`h${d}`} className="flex items-center justify-center text-mute">{horizonLabel(d)}</div>
            ))}
          </div>
        </div>
      )}
      {/* Fixed-height legend under the grid: the colour bands, and what the numbers are. */}
      <div className="mt-1.5 flex h-4 items-center gap-2 text-mute">
        <span className="shrink-0">Expected loss %</span>
        <div className="flex min-w-0 flex-1 overflow-hidden rounded-[3px]">
          {BANDS.map((b, i) => (
            <div key={b.to} className="flex h-3.5 flex-1 items-center justify-center text-[9px]" style={{ background: b.bg, color: b.fg }}>
              {i === BANDS.length - 1 ? `>${BANDS[i - 1].to}` : `≤${b.to}`}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
