import { METHODOLOGIES } from "@/lib/methodologyList";

export type StoredCount = Record<string, string>;

/** Read-only: the public site always runs Methodology 4, the unified portfolio spec; 1 to 3 are for comparison on the finder (yellow switch, admin only). */
export default function MethodologyAdmin({ stored }: { stored: Record<number, StoredCount> }) {
  return (
    <div className="mt-6 space-y-3" data-testid="methodology-list">
      {METHODOLOGIES.map((m) => (
        <div key={m.n} className={`rounded-xl border px-4 py-3 text-sm ${m.production ? "border-amber-400 bg-amber-50" : "border-line"}`}>
          <span className="font-medium">{m.name}{m.production ? " · in use on the public site" : " · admin-only"}</span>
          <span className="block text-mute">{m.text}</span>
          {stored[m.n] && <span className="mt-1 block text-xs text-mute">Stored lists (EUR 100k): {Object.entries(stored[m.n]).map(([k, v]) => `${k} ${v}`).join(" · ")}</span>}
        </div>
      ))}
    </div>
  );
}
