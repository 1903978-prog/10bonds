/** "€39.81bn" -> 39.81, "−3%" -> -3. Null if there is no number. */
export function parseAmount(s: string): number | null {
  const m = s.replace("−", "-").replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : null;
}

/** Lower is better for debt; higher for everything else. Null when the change is flat or unreadable. */
function favourable(label: string, change: string): boolean | null {
  const n = parseAmount(change);
  if (n === null || n === 0) return null;
  return /debt/i.test(label) ? n < 0 : n > 0;
}

/** One metric: the latest value large, the change, and the two periods as bars. Values come straight from the report rows. */
export function Metric({ header, row }: { header: string[]; row: string[] }) {
  const a = parseAmount(row[1]);
  const b = parseAmount(row[2]);
  const fav = favourable(row[0], row[3] ?? "");
  const max = Math.max(Math.abs(a ?? 0), Math.abs(b ?? 0), 1);
  const tone = fav === null ? "text-mute" : fav ? "text-[#067647]" : "text-[#b54708]";
  return (
    <div className="rounded-lg border border-line bg-white p-6 sm:p-7" data-testid="fin-metric">
      <p className="text-[15px] font-medium text-mute">{row[0]}</p>
      <p className="mt-2 text-[40px] font-semibold leading-none tracking-tight tabular-nums sm:text-[44px]">{row[2]}</p>
      <p className="mt-2 text-[15px] text-mute">
        {header[2]}
        {row[3] && <> · <span className={`font-medium ${tone}`}>{row[3]}</span> vs {header[1]}</>}
      </p>
      {a !== null && b !== null && (
        <div className="mt-5 space-y-2" role="img" aria-label={`${row[0]}: ${header[1]} ${row[1]}, ${header[2]} ${row[2]}`}>
          {[[header[1], row[1], a, "bg-[#c7cdd9]"], [header[2], row[2], b, "bg-[#1f2d4d]"]].map(([h, v, n, c]) => (
            <div key={h as string} className="flex items-center gap-3 text-[14px]">
              <span className="w-[58px] shrink-0 text-mute">{h as string}</span>
              <span className="h-3 flex-1 rounded-full bg-canvas"><span className={`block h-3 rounded-full ${c as string}`} style={{ width: `${Math.max((Math.abs(n as number) / max) * 100, 2)}%` }} /></span>
              <span className="w-[76px] shrink-0 text-right tabular-nums">{v as string}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
