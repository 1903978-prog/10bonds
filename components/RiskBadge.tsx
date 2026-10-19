/** 10BONDS risk score 1..10 as white text in a coloured box: 1-3 green, 4-6 orange, 7-10 red. */
export function riskColor(risk: number): string {
  const r = Math.round(risk);
  return r <= 3 ? "#16a34a" : r <= 6 ? "#ea580c" : "#dc2626";
}

export function RiskBadge({ risk, title, size = "sm" }: { risk: number | null | undefined; title?: string; size?: "sm" | "lg" }) {
  if (risk === null || risk === undefined) return <span className="text-mute">—</span>;
  const text = Number.isInteger(risk) ? String(risk) : risk.toFixed(1);
  return (
    <span
      title={title}
      className={`inline-block rounded-md text-center font-semibold tabular-nums text-white ${size === "lg" ? "min-w-[52px] px-2.5 py-0.5 text-xl leading-tight" : "min-w-[28px] px-1.5 py-0.5 text-xs"}`}
      style={{ background: riskColor(risk) }}
    >
      {text}
    </span>
  );
}
