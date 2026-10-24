/** 10BONDS risk score 1..10 as white text in a coloured box: 1-3 green, 4-6 orange, 7-10 red. */
export function riskColor(risk: number): string {
  const r = Math.round(risk);
  return r <= 3 ? "#16a34a" : r <= 6 ? "#ea580c" : "#dc2626";
}

/**
 * The risk score box. `sp` is the bond's S&P grade, set by the server for the admin only (customers never see agency
 * grades): when present (null = no S&P grade, drawn as "–") a yellow fixed-width slot follows the box, e.g. "5 · BBB".
 */
export function RiskBadge({ risk, title, size = "sm", sp }: { risk: number | null | undefined; title?: string; size?: "sm" | "lg"; sp?: string | null }) {
  const box = risk === null || risk === undefined ? <span className="text-mute">—</span> : (
    <span
      title={title}
      className={`inline-block rounded-md text-center font-semibold tabular-nums text-white ${size === "lg" ? "min-w-[52px] px-2.5 py-0.5 text-xl leading-tight" : "min-w-[28px] px-1.5 py-0.5 text-xs"}`}
      style={{ background: riskColor(risk) }}
    >
      {Number.isInteger(risk) ? String(risk) : risk.toFixed(1)}
    </span>
  );
  if (sp === undefined) return box;
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap align-middle">
      {box}
      <SpSlot sp={sp} />
    </span>
  );
}

/** Admin only: the S&P grade in a fixed-width yellow slot, "–" when the bond has none. */
export function SpSlot({ sp }: { sp: string | null }) {
  return (
    <span title="S&P (admin only)" data-testid="admin-sp" className="inline-block w-[36px] rounded bg-yellow-100 px-0.5 py-0.5 text-center text-[11px] font-medium leading-none text-[#7a5b00]">
      {sp?.trim() || "–"}
    </span>
  );
}
