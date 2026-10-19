"use client";

import { useState } from "react";

/** The embed code in a read-only box, with a Copy button. */
export default function CopySnippet({ code, label }: { code: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <div>
      <textarea readOnly value={code} rows={4} aria-label={label} onFocus={(e) => e.currentTarget.select()} className="w-full rounded-xl border border-line bg-canvas p-3 font-mono text-xs" data-testid="widget-snippet" />
      <button
        type="button"
        onClick={async () => {
          try { await navigator.clipboard.writeText(code); setDone(true); setTimeout(() => setDone(false), 2000); } catch { setDone(false); }
        }}
        className="mt-2 rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-[#0077ed]"
      >
        {done ? "Copied" : "Copy code"}
      </button>
    </div>
  );
}
