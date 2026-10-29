import Link from "next/link";

/**
 * Free plans and visitors: a made-up chart, blurred, with a button to the Plans page. Nothing here is real data
 * (shapes and figures are fixed decoys), so the blur cannot be undone in the browser. Same box as the real chart.
 */
export type LockedKind = "chart" | "multi" | "heat";

const W = 400;
const H = 260;
const L = 44;
const B = 30;

function Shape({ kind }: { kind: LockedKind }) {
  if (kind === "heat") {
    const cells = [];
    for (let r = 0; r < 7; r++) for (let c = 0; c < 9; c++) cells.push(<rect key={`${r}-${c}`} x={L + c * 38} y={14 + r * 31} width={36} height={29} rx={4} fill="#0071e3" opacity={0.12 + ((r * 3 + c * 5) % 9) / 11} />);
    return <>{cells}</>;
  }
  const curve = (k: number, o: number) => `M${L} ${H - B - 10 - o} C${L + 90} ${H - B - 20 - o} ${L + 190} ${H - B - 70 * k - o} ${W - 16} ${28 + o * 2}`;
  return (
    <>
      {(kind === "multi" ? [0, 14, 28, 42, 56] : [0]).map((o, i) => (
        <path key={i} d={curve(1 + i * 0.1, o)} fill="none" stroke={["#0071e3", "#34c759", "#ff9f0a", "#af52de", "#ff375f"][i]} strokeWidth={2.5} />
      ))}
      {[70, 120, 170, 220, 270, 330].map((x, i) => <circle key={x} cx={x} cy={H - B - 18 - i * 28} r={4} fill="#0071e3" />)}
    </>
  );
}

/** Padlock drawn inline, so the locked state reads without colour or text. */
export const Padlock = () => (
  <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
);

export default function LockedChart({ kind, label, href, reason }: { kind: LockedKind; label: string; href: string; reason?: string }) {
  return (
    <div className="relative h-full min-h-[300px] overflow-hidden rounded-lg bg-black/[0.02]" data-testid="locked-chart">
      <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full select-none blur-[7px]" aria-hidden="true" preserveAspectRatio="none">
        {[0, 1, 2, 3].map((i) => <line key={i} x1={L} x2={W - 10} y1={20 + i * 55} y2={20 + i * 55} stroke="#d2d2d7" />)}
        <Shape kind={kind} />
        {["0.4", "0.9", "1.6", "2.4"].map((t, i) => <text key={t} x={6} y={24 + i * 55} fontSize={11} fill="#6e6e73">{t}%</text>)}
        {["3.1", "3.6", "4.1", "4.6", "5.1"].map((t, i) => <text key={t} x={L + i * 80} y={H - 8} fontSize={11} fill="#6e6e73">{t}%</text>)}
        <rect x={W - 120} y={4} width={104} height={14} rx={4} fill="#6e6e73" opacity={0.35} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4">
        {reason && <p className="flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-[13px] font-medium text-ink" data-testid="locked-chart-reason"><Padlock />{reason}</p>}
        <Link href={href} data-testid="locked-chart-cta" className="rounded-full bg-accent px-5 py-2.5 text-center text-[14px] font-semibold text-white shadow-lg transition hover:opacity-90">
          {label}
        </Link>
      </div>
    </div>
  );
}
