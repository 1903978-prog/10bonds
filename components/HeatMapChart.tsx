"use client";

import { dotTitle, type ShortlistDot } from "@/lib/shortlistStore";
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
 * so the best horizon for a return stands out. A click on a cell with a figure picks it (outlined in blue): the finder
 * then shows that cell's 10 bonds next to the map. Fills the box it is put in; nothing in it changes size with the data.
 */
export default function HeatMapChart({ map: got, method, onMethod, retLabel, yearsLabel, picked, onPick, blacklist, onBlacklist, shortlists }: { map: HeatMap | "unavailable" | null; method: HeatMethod; onMethod: (m: HeatMethod) => void; retLabel: string; yearsLabel: string; picked?: { ytm: number; duration: number } | null; onPick?: (cell: { ytm: number; duration: number } | null) => void; blacklist: boolean; onBlacklist: (on: boolean) => void; shortlists?: ShortlistDot[] }) {
  const map = got === "unavailable" ? null : got;
  const rows = map ? map.ytms.map((y, r) => ({ y, cells: map.cells[r] })).reverse() : [];
  const cols = map?.horizons.length ?? 18;
  return (
    <div className="flex h-full w-full flex-col text-[10px] tabular-nums leading-none" data-testid="heat-map">
      {/* Admin (yellow): which methodology the map shows; Methodology 1 is the live one. */}
      <div className="mb-1.5 flex shrink-0 gap-2">
        <div role="radiogroup" aria-label="Methodology" data-testid="heat-method" className="grid h-6 w-72 grid-cols-2 rounded-full border border-amber-300 bg-amber-50 p-0.5 text-[11px] font-medium text-amber-900">
          {HEAT_METHODS.map((m) => (
            <button key={m.key} type="button" role="radio" aria-checked={method === m.key} onClick={() => onMethod(m.key)} className={`rounded-full px-2 ${method === m.key ? "bg-white shadow-sm" : ""}`}>
              {m.label}
            </button>
          ))}
        </div>
        {/* Without the bonds and issuers on the admin's blacklist: the map and the cell lists are worked out again. */}
        <div role="radiogroup" aria-label="Blacklist" data-testid="heat-blacklist" title="On = leave out the issuers and bonds on your blacklist (returns change)" className="grid h-6 w-44 grid-cols-2 rounded-full border border-amber-300 bg-amber-50 p-0.5 text-[11px] font-medium text-amber-900">
          {([[false, "Blacklist off"], [true, "Blacklist on"]] as const).map(([v, label]) => (
            <button key={label} type="button" role="radio" aria-checked={blacklist === v} onClick={() => onBlacklist(v)} className={`whitespace-nowrap rounded-full px-1 ${blacklist === v ? "bg-white shadow-sm" : ""}`}>
              {label}
            </button>
          ))}
        </div>
      </div>
      {!map ? (
        <div className="flex flex-1 items-center justify-center text-[12px] text-mute">{got === "unavailable" ? "Not available yet for this methodology." : "Preparing heat map…"}</div>
      ) : (
        <div className="flex min-h-0 flex-1">
          {/* Y axis title, written upwards next to the return values like the other charts. */}
          <div className="flex w-4 shrink-0 items-center justify-center text-mute">
            <span className="whitespace-nowrap [writing-mode:vertical-rl] rotate-180">{retLabel} ↑</span>
          </div>
          <div className="relative grid min-h-0 flex-1 gap-px" style={{ gridTemplateColumns: `2.6rem repeat(${cols}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${rows.length}, minmax(0, 1fr)) 1.1rem` }}>
            {rows.map(({ y, cells }) => {
              const vals = cells.filter((c): c is number => c !== null);
              const min = vals.length ? Math.min(...vals) : null;
              return [
                <div key={`y${y}`} className="flex items-center justify-end pr-1.5 text-mute">{y.toFixed(1)}%</div>,
                ...cells.map((c, i) => {
                  const band = c === null ? null : bandOf(c);
                  const best = c !== null && c === min;
                  const d = map.horizons[i];
                  const on = c !== null && picked?.ytm === y && picked?.duration === d;
                  return (
                    <div
                      key={`${y}-${i}`}
                      title={`${horizonLabel(d)} ${yearsLabel} · ${y.toFixed(1)}% → ${c === null ? "–" : `${c.toFixed(2)}%`}`}
                      className={`flex items-center justify-center overflow-hidden rounded-[3px] ${on ? "ring-[3px] ring-inset ring-[#0071e3]" : best ? "ring-2 ring-inset ring-[#1d1d1f]" : ""} ${c !== null && onPick ? "cursor-pointer hover:brightness-110" : ""}`}
                      style={band ? { background: band.bg, color: band.fg } : { background: "#f2f2f4", color: "#a1a1a6" }}
                      onClick={c !== null && onPick ? () => onPick(on ? null : { ytm: y, duration: d }) : undefined}
                      aria-pressed={c !== null && onPick ? on : undefined}
                      data-testid="heat-cell"
                    >
                      {c === null ? "–" : c.toFixed(2)}
                    </div>
                  );
                }),
              ];
            })}
            {/* Admin shortlists (yellow dot): target return up, horizon across at the rounded average duration, over the cells' own grid. */}
            {shortlists && shortlists.length > 0 && (
              <div className="pointer-events-none absolute" style={{ left: "2.6rem", right: 0, top: 0, bottom: "1.1rem" }}>
                {shortlists.map((d) => {
                  const hz = map.horizons;
                  const yrs = Math.round(d.avgDuration!);
                  const ci = hz.reduce((best, h, i) => (Math.abs(h - yrs) < Math.abs(hz[best] - yrs) ? i : best), 0);
                  const lo = map.ytms[0], hi = map.ytms[map.ytms.length - 1], step = map.ytms.length > 1 ? (hi - lo) / (map.ytms.length - 1) : 0.2;
                  const clamped = Math.min(Math.max(d.avgYtm!, lo), hi);
                  const rowPos = (hi - clamped) / step + 0.5;
                  const off = d.avgYtm! < lo - 1e-9 || d.avgYtm! > hi + 1e-9 ? " · return is off the map, shown at its edge" : "";
                  return (
                    <div key={d.id} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${((ci + 0.5) / hz.length) * 100}%`, top: `${(rowPos / map.ytms.length) * 100}%` }} data-testid="shortlist-dot">
                      <span title={dotTitle(d, ` · placed at ${yrs} yrs${off}`)} className="pointer-events-auto flex items-center gap-1 whitespace-nowrap">
                        <span className="h-3.5 w-3.5 rounded-full border-2 border-[#7a5b00] bg-[#facc15] shadow" />
                        <span className="rounded bg-[#facc15] px-1 text-[10px] font-bold text-[#5c4400] shadow">{d.name}</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
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
        <span className="flex shrink-0 items-center gap-1">
          <span className="h-3 w-3 rounded-[3px] ring-2 ring-inset ring-[#1d1d1f]" />
          lowest risk for that return (best years)
        </span>
      </div>
    </div>
  );
}
