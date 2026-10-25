"use client";
import { useState } from "react";

/** "€39.81bn" -> 39.81, "−3%" -> -3. Null if there is no number. */
export function parseAmount(s: string): number | null {
  const m = s.replace("−", "-").replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : null;
}

/** Pick a metric, see its two periods as bars. Values come straight from the report rows. */
export default function FinancialChart({ header, rows }: { header: string[]; rows: string[][] }) {
  const usable = rows.filter((r) => parseAmount(r[1]) !== null && parseAmount(r[2]) !== null);
  const [i, setI] = useState(0);
  if (!usable.length) return <p className="text-[13px] text-mute">Chart: Not verified</p>;
  const r = usable[Math.min(i, usable.length - 1)];
  const vals = [parseAmount(r[1])!, parseAmount(r[2])!];
  const max = Math.max(...vals.map(Math.abs), 1);
  return (
    <div data-testid="fin-chart">
      <div role="group" aria-label="Chart metric" className="flex flex-wrap gap-1.5 print:hidden">
        {usable.map((u, k) => (
          <button key={u[0]} type="button" aria-pressed={k === i} onClick={() => setI(k)}
            className={`min-h-[36px] rounded-full px-3 text-[12px] ${k === i ? "bg-ink text-white" : "border border-line bg-white text-mute hover:bg-canvas"}`}>
            {u[0]}
          </button>
        ))}
      </div>
      <p className="mt-2 text-[12px] text-mute">{r[0]}, observed company reports</p>
      <svg viewBox="0 0 320 110" className="mt-1 h-[110px] w-full" role="img" aria-label={`${r[0]}: ${header[1]} ${r[1]}, ${header[2]} ${r[2]}`}>
        {[1, 2].map((k) => {
          const w = (Math.abs(vals[k - 1]) / max) * 190;
          const y = k === 1 ? 14 : 62;
          return (
            <g key={k}>
              <text x="0" y={y + 16} fontSize="11" fill="#6e6e73">{header[k]}</text>
              <rect x="64" y={y} width={Math.max(w, 2)} height="26" rx="6" fill={k === 1 ? "#c7cdd9" : "#4a5a78"} />
              <text x={64 + Math.max(w, 2) + 6} y={y + 17} fontSize="12" fontWeight="600" fill="#1d1d1f">{r[k]}</text>
            </g>
          );
        })}
      </svg>
      <p className="text-[12px] text-mute">Change {r[3]}</p>
    </div>
  );
}
